import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  NotificationController,
  InternalNotificationController,
} from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [ConfigModule],
  controllers: [NotificationController, InternalNotificationController],
  providers: [
    NotificationService,
    {
      provide: 'PRISMA_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString =
          config.get<string>('POSTGRES_URL') ??
          'postgresql://root:root@127.0.0.1:5434/dashboard';
        const pool = new Pool({ connectionString });
        const adapter = new PrismaPg(pool as never);
        return new PrismaClient({ adapter });
      },
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
