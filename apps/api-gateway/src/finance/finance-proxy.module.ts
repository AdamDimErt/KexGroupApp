import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FinanceProxyController } from './finance-proxy.controller';
import { FinanceProxyService } from './finance-proxy.service';

@Module({
  imports: [HttpModule],
  controllers: [FinanceProxyController],
  providers: [FinanceProxyService],
})
export class FinanceProxyModule {}
