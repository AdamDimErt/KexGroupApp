import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import Redis from 'ioredis';

// Mobizon mock
const mockHttpService = {
  post: jest.fn(),
};

// Redis mock
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
};

// JWT mock
const mockJwtService = {
  sign: jest.fn(() => 'mock.jwt.token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'REDIS_CLIENT', useValue: mockRedis },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: { get: jest.fn((key) => key === 'MOBIZON_API_KEY' ? 'test_key' : null) } },
        { provide: 'HTTP_SERVICE', useValue: mockHttpService }, // In reality we'd use @nestjs/axios HttpService
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateOtp', () => {
    it('should generate OTP and save to Redis with 5 min TTL', async () => {
      const phone = '7771234567';
      mockHttpService.post.mockResolvedValueOnce({ data: { code: 0 } }); // Mock successful SMS

      await service.generateOtp(phone);

      // Verify Redis was called to save OTP
      expect(mockRedis.set).toHaveBeenCalledWith(
        `otp:${phone}`,
        expect.any(String),
        'EX',
        300
      );

      // Verify Mobizon API was called
      expect(mockHttpService.post).toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    const phone = '7771234567';
    const validCode = '123456';

    it('should return JWT when OTP is correct', async () => {
      mockRedis.get.mockImplementation(async (key) => {
        if (key === `otp:${phone}`) return validCode;
        if (key === `otp_attempts:${phone}`) return '0';
        return null;
      });

      const result = await service.verifyOtp(phone, validCode);

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(mockRedis.del).toHaveBeenCalledWith(`otp:${phone}`);
      expect(mockRedis.del).toHaveBeenCalledWith(`otp_attempts:${phone}`);
    });

    it('should increment attempt counter on wrong OTP and set expire on first fail', async () => {
      mockRedis.get.mockImplementation(async (key) => {
        if (key === `otp:${phone}`) return validCode;
        if (key === `otp_attempts:${phone}`) return '0'; // Simulate first failed attempt
        return null;
      });

      await expect(service.verifyOtp(phone, '000000')).rejects.toThrow(UnauthorizedException);

      expect(mockRedis.incr).toHaveBeenCalledWith(`otp_attempts:${phone}`);
      expect(mockRedis.expire).toHaveBeenCalledWith(`otp_attempts:${phone}`, 900); // 15 mins block TTL
    });

    it('should block user for 15 minutes after 5 failed attempts', async () => {
      // Simulate 5 existing failed attempts
      mockRedis.get.mockImplementation(async (key) => {
        if (key === `otp:${phone}`) return validCode;
        if (key === `otp_attempts:${phone}`) return '5';
        return null;
      });
      mockRedis.ttl.mockResolvedValueOnce(900);

      await expect(service.verifyOtp(phone, '000000')).rejects.toThrow(
        new HttpException('Account blocked for 15 minutes due to too many failed attempts.', HttpStatus.TOO_MANY_REQUESTS)
      );

      // Should not even try to check code or delete it if blocked
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });
});
