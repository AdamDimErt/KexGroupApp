import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IikoSyncService } from '../iiko/iiko-sync.service';
import { OneCyncService } from '../onec/onec-sync.service';
import { AllocationService } from '../allocation/allocation.service';
import { AlertService } from '../alert/alert.service';
import {
  startOfBusinessDay,
  endOfBusinessDay,
} from '../utils/date';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly iikoSync: IikoSyncService,
    private readonly oneCync: OneCyncService,
    private readonly allocation: AllocationService,
    private readonly alertService: AlertService,
  ) {}

  // Daily 03:00 — sync organizations
  @Cron('0 3 * * *', { timeZone: 'Asia/Almaty' })
  async syncOrganizations() {
    try {
      this.logger.log('Starting organizations sync...');
      await this.iikoSync.syncOrganizations();
    } catch (error) {
      this.logger.error(
        `Organizations sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Daily 03:00 — sync nomenclature groups from iiko
  @Cron('0 3 * * *', { timeZone: 'Asia/Almaty' })
  async syncNomenclature() {
    try {
      this.logger.log('Starting nomenclature sync...');
      await this.iikoSync.syncNomenclature();
    } catch (error) {
      this.logger.error(
        `Nomenclature sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Every 15 minutes — sync revenue (OLAP)
  @Cron('*/15 * * * *')
  async syncRevenue() {
    const now = new Date();
    const dateFrom = new Date(now);
    dateFrom.setDate(dateFrom.getDate() - 1); // Last 1 day
    const dateTo = now;

    try {
      this.logger.log(
        `Syncing revenue from ${dateFrom.toISOString()} to ${dateTo.toISOString()}...`,
      );
      await this.iikoSync.syncRevenue(dateFrom, dateTo);
    } catch (error) {
      this.logger.error(
        `Revenue sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    try {
      await this.alertService.checkSyncHealth('IIKO');
      await this.alertService.checkRevenueThresholds();
    } catch (e) {
      this.logger.warn(`Alert check failed after syncRevenue: ${e}`);
    }
  }

  // Every 30 minutes — sync DDS expenses
  @Cron('*/30 * * * *')
  async syncExpenses() {
    const now = new Date();
    const dateFrom = new Date(now);
    dateFrom.setDate(dateFrom.getDate() - 1);
    const dateTo = now;

    try {
      this.logger.log(
        `Syncing DDS expenses from ${dateFrom.toISOString()} to ${dateTo.toISOString()}...`,
      );
      await this.iikoSync.syncExpenses(dateFrom, dateTo);
    } catch (error) {
      this.logger.error(
        `Expense sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    try {
      await this.alertService.checkSyncHealth('IIKO');
      await this.alertService.checkLargeExpenses(dateFrom);
    } catch (e) {
      this.logger.warn(`Alert check failed after syncExpenses: ${e}`);
    }
  }

  // Every hour — sync cash discrepancies
  @Cron('0 * * * *')
  async syncCashDiscrepancies() {
    try {
      const now = new Date();
      const dateFrom = new Date(now);
      dateFrom.setDate(dateFrom.getDate() - 1);
      const dateTo = now;

      this.logger.log(
        `Syncing cash discrepancies from ${dateFrom.toISOString()} to ${dateTo.toISOString()}...`,
      );
      await this.iikoSync.syncCashDiscrepancies(dateFrom, dateTo);
    } catch (error) {
      this.logger.error(
        `Cash discrepancy sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Every hour — sync kitchen shipments from iiko
  @Cron('20 * * * *')
  async syncKitchenShipments() {
    try {
      const now = new Date();
      const dateFrom = new Date(now);
      dateFrom.setDate(dateFrom.getDate() - 1);
      const dateTo = now;

      this.logger.log(
        `Syncing kitchen shipments from ${dateFrom.toISOString()} to ${dateTo.toISOString()}...`,
      );
      await this.iikoSync.syncKitchenShipments(dateFrom, dateTo);
    } catch (error) {
      this.logger.error(
        `Kitchen shipment sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Every hour — sync 1C expenses
  @Cron('5 * * * *')
  async syncOneCExpenses() {
    const now = new Date();
    const dateFrom = new Date(now);
    dateFrom.setDate(dateFrom.getDate() - 1);
    const dateTo = now;

    try {
      this.logger.log(
        `Syncing 1C expenses from ${dateFrom.toISOString()} to ${dateTo.toISOString()}...`,
      );
      await this.oneCync.syncExpenses(dateFrom, dateTo);
    } catch (error) {
      this.logger.error(
        `1C expense sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    try {
      await this.alertService.checkSyncHealth('ONE_C');
      await this.alertService.checkLargeExpenses(dateFrom);
    } catch (e) {
      this.logger.warn(`Alert check failed after syncOneCExpenses: ${e}`);
    }
  }

  // Every hour — sync kitchen purchases
  @Cron('10 * * * *')
  async syncKitchenPurchases() {
    try {
      const now = new Date();
      const dateFrom = new Date(now);
      dateFrom.setDate(dateFrom.getDate() - 1);
      const dateTo = now;

      this.logger.log(
        `Syncing kitchen purchases from ${dateFrom.toISOString()} to ${dateTo.toISOString()}...`,
      );
      await this.oneCync.syncKitchenPurchases(dateFrom, dateTo);
    } catch (error) {
      this.logger.error(
        `Kitchen purchase sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Every hour — sync kitchen income
  @Cron('15 * * * *')
  async syncKitchenIncome() {
    try {
      const now = new Date();
      const dateFrom = new Date(now);
      dateFrom.setDate(dateFrom.getDate() - 1);
      const dateTo = now;

      this.logger.log(
        `Syncing kitchen income from ${dateFrom.toISOString()} to ${dateTo.toISOString()}...`,
      );
      await this.oneCync.syncKitchenIncome(dateFrom, dateTo);
    } catch (error) {
      this.logger.error(
        `Kitchen income sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Every hour at :25 — sync kitchen shipments from 1C by restaurant
  @Cron('25 * * * *')
  async syncKitchenShipmentsByRestaurant() {
    try {
      const now = new Date();
      const dateFrom = new Date(now);
      dateFrom.setDate(dateFrom.getDate() - 1);
      const dateTo = now;

      this.logger.log(
        `Syncing 1C kitchen shipments by restaurant from ${dateFrom.toISOString()} to ${dateTo.toISOString()}...`,
      );
      await this.oneCync.syncKitchenShipmentsByRestaurant(dateFrom, dateTo);
    } catch (error) {
      this.logger.error(
        `1C kitchen shipments by restaurant sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Every hour — run cost allocation (after syncs).
  // dateFrom/dateTo are sliding-window inputs; allocation.service splits them
  // into Almaty calendar days so the upsert key is always deterministic and
  // each hour's run updates the same row rather than inserting a new one.
  @Cron('45 * * * *')
  async runCostAllocation() {
    try {
      const now = new Date();
      const dateFrom = new Date(now);
      dateFrom.setDate(dateFrom.getDate() - 1);
      const dateTo = now;

      this.logger.log(
        `Running cost allocation from ${dateFrom.toISOString()} to ${dateTo.toISOString()}...`,
      );
      await this.allocation.runAllocation(dateFrom, dateTo);
    } catch (error) {
      this.logger.error(
        `Cost allocation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Daily 00:05 Almaty — re-run allocation for the previous full day so that
  // the previous day's figures are finalized once all overnight syncs settle.
  @Cron('5 0 * * *', { timeZone: 'Asia/Almaty' })
  async recalculateYesterdayAllocation() {
    try {
      const yesterdayInstant = new Date(Date.now() - 24 * 3600 * 1000);
      const yesterday = startOfBusinessDay(yesterdayInstant);
      const yesterdayEnd = endOfBusinessDay(yesterdayInstant);

      this.logger.log(
        `Finalizing yesterday allocation: ${yesterday.toISOString()} – ${yesterdayEnd.toISOString()}`,
      );
      await this.allocation.runAllocation(yesterday, yesterdayEnd);
    } catch (error) {
      this.logger.error(
        `Yesterday allocation finalization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
