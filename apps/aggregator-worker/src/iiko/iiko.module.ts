import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IikoAuthService } from './iiko-auth.service';
import { IikoSyncService } from './iiko-sync.service';

@Module({
  imports: [HttpModule],
  providers: [IikoAuthService, IikoSyncService],
  exports: [IikoSyncService],
})
export class IikoModule {}
