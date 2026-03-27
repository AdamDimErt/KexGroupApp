import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { IikoModule } from '../iiko/iiko.module';
import { OneCModule } from '../onec/onec.module';
import { AllocationModule } from '../allocation/allocation.module';

@Module({
  imports: [ScheduleModule.forRoot(), IikoModule, OneCModule, AllocationModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
