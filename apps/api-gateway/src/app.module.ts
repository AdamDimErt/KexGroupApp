import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AuthProxyModule } from './auth/auth-proxy.module';
import { FinanceProxyModule } from './finance/finance-proxy.module';
import { NotificationModule } from './notifications/notification.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET env var is required');
        return { secret };
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL_MS ?? '60000'),
        limit: Number(process.env.THROTTLE_LIMIT ?? '30'),
      },
    ]),
    AuthProxyModule,
    FinanceProxyModule,
    NotificationModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    // Register ThrottlerGuard as APP_GUARD so @Throttle decorators on
    // /auth/send-otp, /auth/verify-otp etc. actually rate-limit. Without this
    // the @Throttle metadata is set but no guard reads it.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
