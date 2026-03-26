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
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { AuthSuccessDto, SendOtpResponseDto, UserDto, UserRole } from '@dashboard/shared-types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly MAX_ATTEMPTS = 5;
  private readonly BLOCK_DURATION_SEC = 900; // 15 min
  private readonly OTP_TTL_SEC = 300;        // 5 min
  private readonly REFRESH_TTL_SEC = 2592000; // 30 days
  private readonly DEV_BYPASS_CODE = '111111';

  private get bypassPhones(): string[] {
    const raw = this.config.get<string>('DEV_BYPASS_PHONES') ?? '';
    return raw.split(',').map(p => p.trim()).filter(Boolean);
  }

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @Inject('PRISMA_CLIENT') private readonly prisma: PrismaClient,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
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

    if (this.bypassPhones.includes(phone)) {
      await this.redis.set(`otp:${phone}`, this.DEV_BYPASS_CODE, 'EX', this.OTP_TTL_SEC);
      this.logger.warn(`[DEV BYPASS] ${phone} — код: ${this.DEV_BYPASS_CODE}`);
      return { success: true, message: 'Dev bypass: используй код 111111', retryAfterSec: 60 };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redis.set(`otp:${phone}`, code, 'EX', this.OTP_TTL_SEC);
    await this.sendSms(phone, `Ваш код подтверждения: ${code}`);

    return { success: true, message: 'Код отправлен по SMS', retryAfterSec: 60 };
  }

  // ─── Verify OTP → issue tokens ────────────────────────────────────────────

  async verifyOtp(phone: string, code: string): Promise<AuthSuccessDto> {
    const attemptsKey = `otp_attempts:${phone}`;
    const attempts = parseInt((await this.redis.get(attemptsKey)) ?? '0', 10);

    if (attempts >= this.MAX_ATTEMPTS) {
      throw new HttpException('Аккаунт заблокирован на 15 минут.', HttpStatus.TOO_MANY_REQUESTS);
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

    const user = await this.findOrCreateUser(phone);
    return this.issueTokens(user);
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
      throw new UnauthorizedException('Пользователь не найден или деактивирован');
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

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async issueTokens(user: Awaited<ReturnType<typeof this.findOrCreateUser>>): Promise<AuthSuccessDto> {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId ?? null,
    });

    // Refresh token — случайная строка, хранится в Redis
    const refreshToken = randomUUID();
    await this.redis.set(`refresh:${refreshToken}`, user.id, 'EX', this.REFRESH_TTL_SEC);

    return {
      accessToken,
      refreshToken,
      user: this.toUserDto(user),
    };
  }

  private toUserDto(user: Awaited<ReturnType<typeof this.findOrCreateUser>>): UserDto {
    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role as unknown as UserRole,
      tenantId: user.tenantId,
      tenant: user.tenant ? { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug } : null,
      restaurantIds: user.restaurants.map(r => r.id),
    };
  }

  private async findOrCreateUser(phone: string) {
    let user = await this.prisma.user.findUnique({
      where: { phone },
      include: { tenant: true, restaurants: true },
    });

    if (!user) {
      this.logger.log(`Создан новый пользователь: ${phone}`);
      user = await this.prisma.user.create({
        data: { phone, role: 'OPERATIONS_DIRECTOR' },
        include: { tenant: true, restaurants: true },
      });
    }

    if (!user.isActive) {
      throw new HttpException('Аккаунт деактивирован.', HttpStatus.FORBIDDEN);
    }

    return user;
  }

  private async sendSms(phone: string, text: string): Promise<void> {
    const apiKey = this.config.get<string>('MOBIZON_API_KEY');
    const domain = this.config.get<string>('MOBIZON_API_DOMAIN') ?? 'api.mobizon.kz';

    if (!apiKey) {
      this.logger.warn(`[DEV] SMS на ${phone}: ${text}`);
      return;
    }

    try {
      const url = new URL(`https://${domain}/service/message/sendsmsmessage`);
      url.searchParams.set('recipient', phone);
      url.searchParams.set('text', text);
      url.searchParams.set('apiKey', apiKey);

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) });
      const data = await res.json() as { code: number; message?: string };

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
