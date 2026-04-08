import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { IikoModule } from './iiko/iiko.module';
import { OneCModule } from './onec/onec.module';
import { AllocationModule } from './allocation/allocation.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AlertModule } from './alert/alert.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    IikoModule,
    OneCModule,
    AllocationModule,
    AlertModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
