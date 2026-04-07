/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { PrismaClient } from '@prisma/client';

import Redis from 'ioredis';

describe('AuthService', () => {
  let service: AuthService;
  let mockRedis: any;
  let mockPrisma: any;
  let mockJwtService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    // Mock Redis
    mockRedis = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      incr: jest.fn(),
      expire: jest.fn().mockResolvedValue(1),
      ttl: jest.fn(),
    };

    // Mock JWT Service
    mockJwtService = {
      sign: jest.fn(() => 'mock.jwt.token.signed'),
      verify: jest.fn(),
      decode: jest.fn(),
    };

    // Mock Config Service
    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string | undefined> = {
          JWT_SECRET: 'test-secret-key',
          REDIS_URL: 'redis://localhost:6380',
          POSTGRES_URL: 'postgresql://root:root@127.0.0.1:5434/dashboard',
          MOBIZON_API_KEY: '',
          MOBIZON_API_DOMAIN: 'api.mobizon.kz',
          DEV_BYPASS_PHONES: '+77074408018',
          DEV_OTP_BYPASS_CODE: '111111',
        };
        return config[key];
      }),
    };

    // Mock Prisma Client
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'user-123', biometricEnabled: true }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'REDIS_CLIENT', useValue: mockRedis },
        { provide: 'PRISMA_CLIENT', useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateOtp', () => {
    it('should generate OTP and save to Redis with 5 min TTL', async () => {
      const phone = '+77771234567';
      mockRedis.get.mockResolvedValue(null);

      // Mock fetch for SMS sending

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,

        json: () => Promise.resolve({ code: 0 } as any),
      } as any);

      const result = await service.generateOtp(phone);

      expect(result.success).toBe(true);
      expect(result.retryAfterSec).toBe(60);
      expect(mockRedis.set).toHaveBeenCalledWith(
        `otp:${phone}`,
        expect.stringMatching(/^\d{6}$/),
        'EX',
        300,
      );
    });

    it('should handle rate limiting - too many attempts', async () => {
      const phone = '+77771234567';
      mockRedis.get.mockResolvedValue('5'); // 5 attempts already

      await expect(service.generateOtp(phone)).rejects.toThrow(
        new HttpException(
          'Слишком много попыток. Попробуйте через 15 минут.',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
    });

    it('should use dev bypass code for bypass phones', async () => {
      const phone = '+77074408018'; // In DEV_BYPASS_PHONES
      mockRedis.get.mockResolvedValue(null);

      const result = await service.generateOtp(phone);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Dev bypass');
      expect(mockRedis.set).toHaveBeenCalledWith(
        `otp:${phone}`,
        '111111', // from DEV_OTP_BYPASS_CODE in mock config
        'EX',
        300,
      );
    });
  });

  describe('verifyOtp', () => {
    const phone = '+77771234567';
    const validCode = '123456';
    const mockUser = {
      id: 'user-123',
      phone,
      name: 'Test User',
      role: 'OPERATIONS_DIRECTOR',
      isActive: true,
      tenantId: null,
      tenant: null,
      restaurants: [],
    };

    it('should return AuthSuccessDto when OTP is correct', async () => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key === `otp:${phone}`) return validCode;
        if (key === `otp_attempts:${phone}`) return null;
        return null;
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.verifyOtp(phone, validCode);

      expect(result.accessToken).toBe('mock.jwt.token.signed');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe('user-123');
      expect(mockRedis.del).toHaveBeenCalledWith(`otp:${phone}`);
      expect(mockRedis.del).toHaveBeenCalledWith(`otp_attempts:${phone}`);
    });

    it('should throw UnauthorizedException when OTP is wrong', async () => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key === `otp:${phone}`) return validCode;
        if (key === `otp_attempts:${phone}`) return '0';
        return null;
      });
      mockRedis.incr.mockResolvedValue(1);

      await expect(service.verifyOtp(phone, '000000')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockRedis.incr).toHaveBeenCalledWith(`otp_attempts:${phone}`);
    });

    it('should set expire on attempts counter when first or final attempt fails', async () => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key === `otp:${phone}`) return validCode;
        if (key === `otp_attempts:${phone}`) return '0';
        return null;
      });
      mockRedis.incr.mockResolvedValue(1); // First failed attempt

      await expect(service.verifyOtp(phone, '000000')).rejects.toThrow();

      expect(mockRedis.expire).toHaveBeenCalledWith(
        `otp_attempts:${phone}`,
        900,
      );
    });

    it('should block account after 5 failed attempts', async () => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key === `otp:${phone}`) return validCode;
        if (key === `otp_attempts:${phone}`) return '5'; // 5 attempts already
        return null;
      });

      await expect(service.verifyOtp(phone, '000000')).rejects.toThrow(
        new HttpException(
          'Аккаунт заблокирован на 15 минут.',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );

      // Should not attempt to verify or delete tokens
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should throw error when OTP has expired', async () => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key === `otp:${phone}`) return null; // OTP expired
        if (key === `otp_attempts:${phone}`) return '0';
        return null;
      });
      mockRedis.incr.mockResolvedValue(1);

      await expect(service.verifyOtp(phone, validCode)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should create new user if not found', async () => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key === `otp:${phone}`) return validCode;
        if (key === `otp_attempts:${phone}`) return null;
        return null;
      });

      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      mockPrisma.user.create.mockResolvedValueOnce(mockUser as any);

      const result = await service.verifyOtp(phone, validCode);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: { phone, role: 'OPERATIONS_DIRECTOR' },
        include: { tenant: true, restaurants: true },
      });
      expect(result.user.id).toBe('user-123');
    });

    it('should throw error if user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };

      mockRedis.get.mockImplementation((key: string) => {
        if (key === `otp:${phone}`) return validCode;
        if (key === `otp_attempts:${phone}`) return null;
        return null;
      });

      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser as any);

      await expect(service.verifyOtp(phone, validCode)).rejects.toThrow(
        new HttpException('Аккаунт деактивирован.', HttpStatus.FORBIDDEN),
      );
    });

    it('should write AuditLog on successful OTP verification', async () => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key === `otp:${phone}`) return validCode;
        if (key === `otp_attempts:${phone}`) return null;
        return null;
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      await service.verifyOtp(phone, validCode, '127.0.0.1', 'TestAgent');

      // Give fire-and-forget a tick to execute
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: 'LOGIN',
          ip: '127.0.0.1',
          userAgent: 'TestAgent',
          entity: undefined,
        },
      });
    });

    it('should not break auth flow if AuditLog write fails', async () => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key === `otp:${phone}`) return validCode;
        if (key === `otp_attempts:${phone}`) return null;
        return null;
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.auditLog.create.mockRejectedValue(new Error('DB down'));

      const result = await service.verifyOtp(phone, validCode, '127.0.0.1');

      expect(result.accessToken).toBe('mock.jwt.token.signed');
    });
  });

  describe('refresh', () => {
    const refreshToken = 'refresh-token-uuid';
    const userId = 'user-123';
    const mockUser = {
      id: userId,
      phone: '+77771234567',
      name: 'Test User',
      role: 'OPERATIONS_DIRECTOR',
      isActive: true,
      tenantId: null,
      tenant: null,
      restaurants: [],
    };

    it('should return new tokens when refresh token is valid', async () => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key === `refresh:${refreshToken}`) return userId;
        return null;
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.refresh(refreshToken);

      expect(result.accessToken).toBe('mock.jwt.token.signed');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe(userId);
      // Old refresh token should be deleted
      expect(mockRedis.del).toHaveBeenCalledWith(`refresh:${refreshToken}`);
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        new UnauthorizedException('Refresh token недействителен или истёк'),
      );
    });

    it('should throw UnauthorizedException when refresh token is expired', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should delete old refresh token and issue new one on success', async () => {
      mockRedis.get.mockResolvedValue(userId);

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      await service.refresh(refreshToken);

      expect(mockRedis.del).toHaveBeenCalledWith(`refresh:${refreshToken}`);
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^refresh:/),
        userId,
        'EX',
        2592000, // 30 days
      );
    });

    it('should throw error if user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockRedis.get.mockResolvedValue(userId);

      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser as any);

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw error if user not found', async () => {
      mockRedis.get.mockResolvedValue(userId);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        new UnauthorizedException('Пользователь не найден или деактивирован'),
      );
    });
  });

  describe('logout', () => {
    const refreshToken = 'refresh-token-uuid';

    it('should delete refresh token from Redis', async () => {
      await service.logout(refreshToken);

      expect(mockRedis.del).toHaveBeenCalledWith(`refresh:${refreshToken}`);
    });

    it('should complete successfully even if token does not exist', async () => {
      mockRedis.del.mockResolvedValue(0); // Token did not exist

      await expect(service.logout(refreshToken)).resolves.toBeUndefined();
      expect(mockRedis.del).toHaveBeenCalledWith(`refresh:${refreshToken}`);
    });
  });

  describe('getMe', () => {
    const userId = 'user-123';
    const mockUser = {
      id: userId,
      phone: '+77771234567',
      name: 'Test User',
      role: 'FINANCE_DIRECTOR',
      isActive: true,
      tenantId: 'tenant-123',
      tenant: { id: 'tenant-123', name: 'KEX GROUP', slug: 'kex-group' },
      restaurants: [{ id: 'rest-1' }],
    };

    it('should return current user data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.getMe(userId);

      expect(result.id).toBe(userId);
      expect(result.phone).toBe('+77771234567');
      expect(result.name).toBe('Test User');
      expect(result.role).toBe('FINANCE_DIRECTOR');
      expect(result.tenantId).toBe('tenant-123');
      expect(result.tenant?.name).toBe('KEX GROUP');
      expect(result.restaurantIds).toEqual(['rest-1']);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe(userId)).rejects.toThrow(
        new UnauthorizedException('Пользователь не найден'),
      );
    });
  });

  describe('enableBiometric', () => {
    const userId = 'user-123';

    it('should set biometricEnabled to true and return success', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: userId, biometricEnabled: true });

      const result = await service.enableBiometric(userId, '127.0.0.1');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { biometricEnabled: true },
      });
    });

    it('should write BIOMETRIC_ENABLE to AuditLog', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: userId, biometricEnabled: true });

      await service.enableBiometric(userId, '192.168.1.1');

      // fire-and-forget — give it a tick
      await new Promise(resolve => setImmediate(resolve));

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          action: 'BIOMETRIC_ENABLE',
          ip: '192.168.1.1',
        }),
      });
    });
  });

  describe('verifyBiometric', () => {
    const refreshToken = 'bio-refresh-token';
    const userId = 'user-123';
    const mockUserBioEnabled = {
      id: userId,
      phone: '+77771234567',
      name: 'Test User',
      role: 'OPERATIONS_DIRECTOR',
      isActive: true,
      biometricEnabled: true,
      tenantId: null,
      tenant: null,
      restaurants: [],
    };

    it('should return new tokens when refresh token is valid and biometric is enabled', async () => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key === `refresh:${refreshToken}`) return userId;
        return null;
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUserBioEnabled as any);

      const result = await service.verifyBiometric(refreshToken, '127.0.0.1');

      expect(result.accessToken).toBe('mock.jwt.token.signed');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe(userId);
      // Old refresh token should be deleted (rotation)
      expect(mockRedis.del).toHaveBeenCalledWith(`refresh:${refreshToken}`);
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.verifyBiometric(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when biometricEnabled is false', async () => {
      const userBioDisabled = { ...mockUserBioEnabled, biometricEnabled: false };
      mockRedis.get.mockImplementation((key: string) => {
        if (key === `refresh:${refreshToken}`) return userId;
        return null;
      });
      mockPrisma.user.findUnique.mockResolvedValue(userBioDisabled as any);

      await expect(service.verifyBiometric(refreshToken)).rejects.toThrow(
        new UnauthorizedException('Биометрия не включена для этого пользователя'),
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const inactiveUser = { ...mockUserBioEnabled, isActive: false };
      mockRedis.get.mockImplementation((key: string) => {
        if (key === `refresh:${refreshToken}`) return userId;
        return null;
      });
      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser as any);

      await expect(service.verifyBiometric(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should write BIOMETRIC_LOGIN to AuditLog on success', async () => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key === `refresh:${refreshToken}`) return userId;
        return null;
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUserBioEnabled as any);

      await service.verifyBiometric(refreshToken, '10.0.0.1', 'MobileApp/1.0');

      await new Promise(resolve => setImmediate(resolve));

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          action: 'BIOMETRIC_LOGIN',
          ip: '10.0.0.1',
          userAgent: 'MobileApp/1.0',
        }),
      });
    });

    it('should rotate refresh token on success', async () => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key === `refresh:${refreshToken}`) return userId;
        return null;
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUserBioEnabled as any);

      await service.verifyBiometric(refreshToken);

      // Old token deleted
      expect(mockRedis.del).toHaveBeenCalledWith(`refresh:${refreshToken}`);
      // New token stored
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^refresh:/),
        userId,
        'EX',
        2592000,
      );
    });
  });
});
