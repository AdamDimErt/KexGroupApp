import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
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
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    AuthProxyModule,
    FinanceProxyModule,
    NotificationModule,
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
