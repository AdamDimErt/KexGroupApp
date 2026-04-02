import { Controller, Get, Post, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { IikoSyncService } from './iiko/iiko-sync.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly iikoSync: IikoSyncService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'aggregator-worker', timestamp: new Date().toISOString() };
  }

  @Post('sync/all')
  async syncAll() {
    this.logger.log('Manual sync triggered — starting all iiko syncs...');
    const results: Record<string, string> = {};
    const now = new Date();
    const dateFrom = new Date(now);
    dateFrom.setDate(dateFrom.getDate() - 7); // Last 7 days for initial sync

    // 1. Organizations
    try {
      await this.iikoSync.syncOrganizations();
      results.organizations = 'ok';
    } catch (e) {
      results.organizations = `error: ${e instanceof Error ? e.message : String(e)}`;
    }

    // 2. Revenue
    try {
      await this.iikoSync.syncRevenue(dateFrom, now);
      results.revenue = 'ok';
    } catch (e) {
      results.revenue = `error: ${e instanceof Error ? e.message : String(e)}`;
    }

    // 3. Expenses
    try {
      await this.iikoSync.syncExpenses(dateFrom, now);
      results.expenses = 'ok';
    } catch (e) {
      results.expenses = `error: ${e instanceof Error ? e.message : String(e)}`;
    }

    // 4. Cash discrepancies
    try {
      await this.iikoSync.syncCashDiscrepancies(dateFrom, now);
      results.cashDiscrepancies = 'ok';
    } catch (e) {
      results.cashDiscrepancies = `error: ${e instanceof Error ? e.message : String(e)}`;
    }

    this.logger.log(`Manual sync completed: ${JSON.stringify(results)}`);
    return { status: 'completed', syncedPeriod: { from: dateFrom, to: now }, results };
  }
}
