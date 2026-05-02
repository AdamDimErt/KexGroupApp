import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { TelegramGateway } from 'node-telegram-gateway-api';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET env var is required');
        const expiresIn = config.get<string>('JWT_ACCESS_TTL') ?? '15m';
        return {
          secret,
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL');
        if (!url) {
          if (process.env.NODE_ENV === 'production') {
            throw new Error('REDIS_URL env var is required in production');
          }
          // dev fallback — keep matching docker-compose.yml port (6380)
          return new Redis('redis://localhost:6380');
        }
        return new Redis(url);
      },
    },
    {
      provide: 'PRISMA_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString = config.get<string>('POSTGRES_URL');
        if (!connectionString) {
          throw new Error('POSTGRES_URL env var is required');
        }
        const pool = new Pool({ connectionString });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const adapter = new PrismaPg(pool as any);
        return new PrismaClient({ adapter });
      },
    },
    {
      provide: 'TELEGRAM_GATEWAY_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const token = config.get<string>('TELEGRAM_GATEWAY_TOKEN');
        if (!token) return null; // Gateway disabled — SMS only mode
        return new TelegramGateway(token);
      },
    },
  ],
})
export class AuthModule {}
