import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OneCyncService } from './onec-sync.service';

@Module({
  imports: [HttpModule],
  providers: [OneCyncService],
  exports: [OneCyncService],
})
export class OneCModule {}
