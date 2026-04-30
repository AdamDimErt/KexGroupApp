import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
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
    return {
      status: 'ok',
      service: 'aggregator-worker',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('sync/organizations')
  async syncOrganizations() {
    this.logger.log('Manual organizations sync triggered...');
    try {
      await this.iikoSync.syncOrganizations();
      return { status: 'ok' };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Organizations sync failed: ${message}`);
      return { status: 'error', message };
    }
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

    // 5. DDS Articles (account catalog) — must run before DDS transactions (FK dependency)
    try {
      await this.iikoSync.syncDdsArticles();
      results.ddsArticles = 'ok';
    } catch (e) {
      results.ddsArticles = `error: ${e instanceof Error ? e.message : String(e)}`;
    }

    // 6. DDS Transactions
    try {
      await this.iikoSync.syncDdsTransactions(dateFrom, now);
      results.ddsTransactions = 'ok';
    } catch (e) {
      results.ddsTransactions = `error: ${e instanceof Error ? e.message : String(e)}`;
    }

    this.logger.log(`Manual sync completed: ${JSON.stringify(results)}`);
    return {
      status: 'completed',
      syncedPeriod: { from: dateFrom, to: now },
      results,
    };
  }

  /**
   * POST /sync/dds
   * Manual DDS-only sync: articles first (FK dependency), then transactions.
   * Body: { "dateFrom": "2026-04-01", "dateTo": "2026-04-07" } (optional, default: last 7 days)
   */
  @Post('sync/dds')
  async syncDds(@Body() body: { dateFrom?: string; dateTo?: string }) {
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 7);

    const dateTo = body.dateTo ? new Date(`${body.dateTo}T23:59:59+05:00`) : now;
    const dateFrom = body.dateFrom ? new Date(`${body.dateFrom}T00:00:00+05:00`) : defaultFrom;

    this.logger.log(`DDS-only sync triggered: ${dateFrom.toISOString()} → ${dateTo.toISOString()}`);

    const results: Record<string, string> = {};

    // Step 1: Articles must be synced first (transactions reference DdsArticle via code FK)
    try {
      await this.iikoSync.syncDdsArticles();
      results.ddsArticles = 'ok';
    } catch (e) {
      results.ddsArticles = `error: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Step 2: Transactions (depends on articles existing)
    try {
      await this.iikoSync.syncDdsTransactions(dateFrom, dateTo);
      results.ddsTransactions = 'ok';
    } catch (e) {
      results.ddsTransactions = `error: ${e instanceof Error ? e.message : String(e)}`;
    }

    return {
      status: 'completed',
      syncedPeriod: { from: dateFrom, to: dateTo },
      results,
    };
  }

  /**
   * POST /sync/backfill
   * Body: { "dateFrom": "2026-03-01", "dateTo": "2026-03-31", "clearExisting": true }
   * Splits range into 30-day windows and syncs revenue for each.
   */
  @Post('sync/backfill')
  async syncBackfill(
    @Body() body: { dateFrom: string; dateTo: string; clearExisting?: boolean },
  ) {
    const { dateFrom, dateTo, clearExisting = false } = body;

    if (!dateFrom || !dateTo) {
      return { status: 'error', message: 'dateFrom and dateTo are required (YYYY-MM-DD)' };
    }

    const from = new Date(`${dateFrom}T00:00:00+05:00`);
    const to   = new Date(`${dateTo}T23:59:59+05:00`);

    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
      return { status: 'error', message: 'Invalid date range' };
    }

    this.logger.log(`Backfill triggered: ${dateFrom} → ${dateTo}, clearExisting=${clearExisting}`);

    // Optional: clear FinancialSnapshot rows for this period
    if (clearExisting) {
      const deleted = await this.iikoSync.clearSnapshots(from, to);
      this.logger.log(`Cleared ${deleted} existing snapshots for period`);
    }

    // Split into ≤30-day windows
    const WINDOW_DAYS = 30;
    const windows: Array<{ from: Date; to: Date }> = [];
    let cursor = new Date(from);
    while (cursor < to) {
      const windowEnd = new Date(cursor);
      windowEnd.setDate(windowEnd.getDate() + WINDOW_DAYS - 1);
      windows.push({ from: new Date(cursor), to: windowEnd > to ? new Date(to) : new Date(windowEnd) });
      cursor.setDate(cursor.getDate() + WINDOW_DAYS);
    }

    this.logger.log(`Backfill: ${windows.length} window(s) to process`);

    const windowResults: Array<{ window: string; revenue: string; expenses: string; ddsTransactions: string }> = [];
    for (const win of windows) {
      const label = `${win.from.toISOString().slice(0,10)} → ${win.to.toISOString().slice(0,10)}`;
      const result: { window: string; revenue: string; expenses: string; ddsTransactions: string } = { window: label, revenue: '', expenses: '', ddsTransactions: '' };
      try {
        await this.iikoSync.syncRevenue(win.from, win.to);
        result.revenue = 'ok';
      } catch (e) {
        result.revenue = `error: ${e instanceof Error ? e.message : String(e)}`;
      }
      try {
        await this.iikoSync.syncExpenses(win.from, win.to);
        result.expenses = 'ok';
      } catch (e) {
        result.expenses = `error: ${e instanceof Error ? e.message : String(e)}`;
      }
      try {
        await this.iikoSync.syncDdsTransactions(win.from, win.to);
        result.ddsTransactions = 'ok';
      } catch (e) {
        result.ddsTransactions = `error: ${e instanceof Error ? e.message : String(e)}`;
      }
      windowResults.push(result);
      this.logger.log(`Backfill window ${label}: revenue=${result.revenue} expenses=${result.expenses} ddsTransactions=${result.ddsTransactions}`);
    }

    return {
      status: 'completed',
      period: { from: dateFrom, to: dateTo },
      windows: windowResults,
    };
  }
}
