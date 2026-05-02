import {
  Injectable,
  Inject,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { randomInt, randomUUID } from 'crypto';
import Redis from 'ioredis';
import {
  AuthSuccessDto,
  SendOtpResponseDto,
  UserDto,
  UserRole,
} from '@dashboard/shared-types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // Security tunables — env-driven so SecOps/IR can ratchet without redeploy.
  // Defaults match the prior hardcoded values to keep behavior unchanged.
  private readonly MAX_ATTEMPTS = Number(
    process.env.OTP_MAX_ATTEMPTS ?? '5',
  );
  private readonly BLOCK_DURATION_SEC = Number(
    process.env.OTP_BLOCK_DURATION_SEC ?? '900',
  ); // 15 min
  private readonly OTP_TTL_SEC = Number(process.env.OTP_TTL_SEC ?? '300'); // 5 min
  private readonly REFRESH_TTL_SEC = Number(
    process.env.REFRESH_TTL_SEC ?? '2592000',
  ); // 30 days

  private get bypassPhones(): string[] {
    const raw = this.config.get<string>('DEV_BYPASS_PHONES') ?? '';
    return raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
  }

  private get devOtpBypassCode(): string {
    return this.config.get<string>('DEV_BYPASS_CODE') ?? '111111';
  }

  /**
   * Bypass-режим для текущего телефона:
   *  - DEV_BYPASS_ALL=true (или *) → ЛЮБОЙ номер в non-prod проходит с DEV_BYPASS_CODE
   *  - иначе — только номера из DEV_BYPASS_PHONES
   * NODE_ENV=production всегда выключает bypass — чтоб случайно не утащить в прод.
   */
  private isPhoneBypassed(phone: string): boolean {
    const isNonProd = this.config.get<string>('NODE_ENV') !== 'production';
    if (!isNonProd) return false;
    const all = (this.config.get<string>('DEV_BYPASS_ALL') ?? '').toLowerCase();
    if (all === 'true' || all === '1' || all === '*') return true;
    return this.bypassPhones.includes(phone);
  }

  private isDevBypassActive(phone: string, code: string): boolean {
    return this.isPhoneBypassed(phone) && code === this.devOtpBypassCode;
  }

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @Inject('PRISMA_CLIENT') private readonly prisma: PrismaClient,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject('TELEGRAM_GATEWAY_CLIENT') private readonly telegramGateway: any | null,
  ) {}

  // ─── Send OTP ─────────────────────────────────────────────────────────────

  async generateOtp(phone: string): Promise<SendOtpResponseDto> {
    const blockKey = `otp_attempts:${phone}`;
    const attempts = parseInt((await this.redis.get(blockKey)) ?? '0', 10);

    if (attempts >= this.MAX_ATTEMPTS) {
      throw new HttpException(
        'Слишком много попыток. Попробуйте через 15 минут.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (this.isPhoneBypassed(phone)) {
      const bypassCode = this.devOtpBypassCode;
      await this.redis.set(`otp:${phone}`, bypassCode, 'EX', this.OTP_TTL_SEC);
      this.logger.warn(`[DEV BYPASS] ${phone} — код: ${bypassCode}`);
      return {
        success: true,
        message: `Dev bypass: используй код ${bypassCode}`,
        retryAfterSec: 60,
      };
    }

    // Try Telegram Gateway first
    const tgResult = await this.sendOtpViaTelegram(phone);
    if (tgResult.sent) {
      // Telegram generates the code — no need to store our own OTP in Redis
      // Verification will use checkVerificationStatus with request_id
      return {
        success: true,
        message: 'Код отправлен через Telegram',
        retryAfterSec: 60,
      };
    }

    // Fallback to SMS — crypto.randomInt for unpredictability
    const code = randomInt(100000, 1000000).toString();
    await this.redis.set(`otp:${phone}`, code, 'EX', this.OTP_TTL_SEC);
    await this.sendSms(phone, `Ваш код подтверждения: ${code}`);

    return {
      success: true,
      message: 'Код отправлен по SMS',
      retryAfterSec: 60,
    };
  }

  // ─── Verify OTP → issue tokens ────────────────────────────────────────────

  async verifyOtp(
    phone: string,
    code: string,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthSuccessDto> {
    const attemptsKey = `otp_attempts:${phone}`;
    const attempts = parseInt((await this.redis.get(attemptsKey)) ?? '0', 10);

    if (attempts >= this.MAX_ATTEMPTS) {
      throw new HttpException(
        'Аккаунт заблокирован на 15 минут.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check if OTP was sent via Telegram Gateway
    const tgRequestId = await this.redis.get(`tg_otp_rid:${phone}`);
    if (tgRequestId && this.telegramGateway) {
      try {
        const status = await this.telegramGateway.checkVerificationStatus(
          tgRequestId,
          code,
        ) as { ok: boolean; result?: { verification_status?: { status?: string } } };
        if (
          status.ok &&
          status.result?.verification_status?.status === 'code_valid'
        ) {
          await this.redis.del(`tg_otp_rid:${phone}`);
          await this.redis.del(attemptsKey);
          const user = await this.findOrCreateUser(phone);
          void this.writeAuditLog(user.id, 'LOGIN', ip, userAgent);
          return this.issueTokens(user);
        }
      } catch (e) {
        this.logger.error('Telegram verification check failed', e);
      }
      // If Telegram verification failed, fall through to SMS OTP check
    }

    const savedCode = await this.redis.get(`otp:${phone}`);
    if (!savedCode || savedCode !== code) {
      const newAttempts = await this.redis.incr(attemptsKey);
      if (newAttempts === 1 || newAttempts >= this.MAX_ATTEMPTS) {
        await this.redis.expire(attemptsKey, this.BLOCK_DURATION_SEC);
      }
      throw new UnauthorizedException('Неверный код');
    }

    await this.redis.del(`otp:${phone}`);
    await this.redis.del(attemptsKey);

    let user = await this.findOrCreateUser(phone);

    // BUG-11-7: dev bypass must return OWNER role so all OWNER-gated UI
    // (Dashboard KPIs, DDS section) is visible during development walkthroughs.
    // Safety-net override: only applies in non-production when bypass is active.
    if (this.isDevBypassActive(phone, code)) {
      this.logger.warn(
        `[DEV BYPASS] Overriding role ${user.role} → OWNER for ${phone}`,
      );
      user = { ...user, role: 'OWNER' as typeof user.role };
    }

    void this.writeAuditLog(user.id, 'LOGIN', ip, userAgent);
    return this.issueTokens(user);
  }

  // ─── Logout ──────────────────────────────────────────────────────────────

  async logout(
    refreshToken: string,
    userId?: string,
    ip?: string,
  ): Promise<void> {
    await this.redis.del(`refresh:${refreshToken}`);
    if (userId) {
      void this.writeAuditLog(userId, 'LOGOUT', ip);
    }
  }

  // ─── Refresh token ────────────────────────────────────────────────────────

  async refresh(refreshToken: string): Promise<AuthSuccessDto> {
    const userId = await this.redis.get(`refresh:${refreshToken}`);
    if (!userId) {
      throw new UnauthorizedException('Refresh token недействителен или истёк');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true, restaurants: true },
    });

    if (!user || !user.isActive) {
      await this.redis.del(`refresh:${refreshToken}`);
      throw new UnauthorizedException(
        'Пользователь не найден или деактивирован',
      );
    }

    // Ротация: удаляем старый refresh token, выдаём новый
    await this.redis.del(`refresh:${refreshToken}`);
    return this.issueTokens(user);
  }

  // ─── Get current user ─────────────────────────────────────────────────────

  async getMe(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true, restaurants: true },
    });

    if (!user) throw new UnauthorizedException('Пользователь не найден');

    return this.toUserDto(user);
  }

  // ─── Biometric ────────────────────────────────────────────────────────────

  async enableBiometric(userId: string, ip?: string): Promise<{ success: boolean }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { biometricEnabled: true },
    });
    void this.writeAuditLog(userId, 'BIOMETRIC_ENABLE', ip);
    return { success: true };
  }

  async verifyBiometric(refreshToken: string, ip?: string, userAgent?: string): Promise<AuthSuccessDto> {
    const userId = await this.redis.get(`refresh:${refreshToken}`);
    if (!userId) {
      throw new UnauthorizedException('Refresh token недействителен');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true, restaurants: true },
    });

    if (!user || !user.isActive) {
      await this.redis.del(`refresh:${refreshToken}`);
      throw new UnauthorizedException('Пользователь не найден или деактивирован');
    }

    if (!user.biometricEnabled) {
      throw new UnauthorizedException('Биометрия не включена для этого пользователя');
    }

    // Rotate refresh token
    await this.redis.del(`refresh:${refreshToken}`);
    void this.writeAuditLog(userId, 'BIOMETRIC_LOGIN', ip, userAgent);
    return this.issueTokens(user);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async issueTokens(
    user: Awaited<ReturnType<typeof this.findOrCreateUser>>,
  ): Promise<AuthSuccessDto> {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId ?? null,
    });

    // Refresh token — случайная строка, хранится в Redis
    const refreshToken = randomUUID();
    await this.redis.set(
      `refresh:${refreshToken}`,
      user.id,
      'EX',
      this.REFRESH_TTL_SEC,
    );

    return {
      accessToken,
      refreshToken,
      user: this.toUserDto(user),
    };
  }

  private toUserDto(
    user: Awaited<ReturnType<typeof this.findOrCreateUser>>,
  ): UserDto {
    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role as unknown as UserRole,
      tenantId: user.tenantId,
      tenant: user.tenant
        ? { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug }
        : null,
      restaurantIds: user.restaurants.map((r) => r.id),
    };
  }

  private async findOrCreateUser(phone: string) {
    let user = await this.prisma.user.findUnique({
      where: { phone },
      include: { tenant: true, restaurants: true },
    });

    if (!user) {
      // В dev/staging новых пользователей сразу привязываем к DEV_DEFAULT_TENANT_ID,
      // иначе после bypass-логина дашборд будет пустой (tenantId = null).
      const isNonProd = this.config.get<string>('NODE_ENV') !== 'production';
      const defaultTenant = this.config.get<string>('DEV_DEFAULT_TENANT_ID');
      const initialTenantId = isNonProd && defaultTenant ? defaultTenant : null;

      this.logger.log(
        `Создан новый пользователь: ${phone}` +
          (initialTenantId ? ` (tenantId=${initialTenantId})` : ''),
      );
      user = await this.prisma.user.create({
        data: {
          phone,
          role: 'OPERATIONS_DIRECTOR',
          ...(initialTenantId ? { tenantId: initialTenantId } : {}),
        },
        include: { tenant: true, restaurants: true },
      });
    } else if (!user.tenantId) {
      // Существующий user без tenant — также автопривязка в dev (например, если завели руками).
      const isNonProd = this.config.get<string>('NODE_ENV') !== 'production';
      const defaultTenant = this.config.get<string>('DEV_DEFAULT_TENANT_ID');
      if (isNonProd && defaultTenant) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { tenantId: defaultTenant },
          include: { tenant: true, restaurants: true },
        });
        this.logger.log(`Auto-bound ${phone} → tenant ${defaultTenant}`);
      }
    }

    if (!user.isActive) {
      throw new HttpException('Аккаунт деактивирован.', HttpStatus.FORBIDDEN);
    }

    return user;
  }

  private async writeAuditLog(
    userId: string,
    action: string,
    ip?: string,
    userAgent?: string,
    entity?: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: { userId, action, ip, userAgent, entity },
      });
    } catch (e) {
      // Never let audit log failure break auth flow
      this.logger.error('AuditLog write failed', e);
    }
  }

  private async sendOtpViaTelegram(
    phone: string,
  ): Promise<{ sent: boolean; requestId?: string }> {
    if (!this.telegramGateway) {
      this.logger.warn('Telegram Gateway not configured — using SMS fallback');
      return { sent: false };
    }
    try {
      const ability = await this.telegramGateway.checkSendAbility(phone) as {
        ok: boolean;
      };
      if (!ability.ok) {
        this.logger.log(`Phone ${phone} not on Telegram — falling back to SMS`);
        return { sent: false };
      }
      const result = await this.telegramGateway.sendVerificationMessage(
        phone,
        { code_length: 6 },
      ) as { ok: boolean; result?: { request_id?: string } };
      if (result.ok && result.result?.request_id) {
        // Store request_id in Redis for verification later
        await this.redis.set(
          `tg_otp_rid:${phone}`,
          result.result.request_id,
          'EX',
          this.OTP_TTL_SEC,
        );
        return { sent: true, requestId: result.result.request_id };
      }
      return { sent: false };
    } catch (e) {
      this.logger.error('Telegram Gateway error — falling back to SMS', e);
      return { sent: false };
    }
  }

  private async sendSms(phone: string, text: string): Promise<void> {
    const apiKey = this.config.get<string>('MOBIZON_API_KEY');
    const domain =
      this.config.get<string>('MOBIZON_API_DOMAIN') ?? 'api.mobizon.kz';

    if (!apiKey) {
      this.logger.warn(`[DEV] SMS на ${phone}: ${text}`);
      return;
    }

    try {
      const url = new URL(`https://${domain}/service/message/sendsmsmessage`);
      url.searchParams.set('recipient', phone);
      url.searchParams.set('text', text);
      url.searchParams.set('apiKey', apiKey);

      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(10_000),
      });
      const data = (await res.json()) as { code: number; message?: string };

      if (data.code !== 0) {
        this.logger.error(`Mobizon ошибка [${data.code}]: ${data.message}`);
      } else {
        this.logger.log(`SMS отправлено на ${phone}`);
      }
    } catch (e) {
      this.logger.error('Ошибка отправки SMS через Mobizon', e);
    }
  }
}
