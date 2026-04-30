jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  withScope: jest.fn((cb) =>
    cb({ setTag: jest.fn(), setContext: jest.fn(), setLevel: jest.fn() }),
  ),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { IikoSyncService } from './iiko-sync.service';
import { IikoAuthService } from './iiko-auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { OneCyncService } from '../onec/onec-sync.service';
import { AllocationService } from '../allocation/allocation.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { AlertService } from '../alert/alert.service';

describe('IikoSyncService', () => {
  let service: IikoSyncService;
  let prisma: PrismaService;
  let iikoAuth: IikoAuthService;

  beforeEach(async () => {
    // IikoSyncService reads IIKO_SERVER_URL in its class field initializer;
    // must be set before the module compiles (i.e. before the constructor runs).
    process.env.IIKO_SERVER_URL = 'http://test.iiko.local/api';

    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        IikoSyncService,
        {
          provide: IikoAuthService,
          useValue: {
            getAccessToken: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            brand: {
              upsert: jest.fn(),
              findUnique: jest.fn(),
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
            restaurant: {
              upsert: jest.fn(),
              findMany: jest.fn(),
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
            legalEntity: {
              upsert: jest.fn().mockResolvedValue({ id: 'default-le-id' }),
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
            financialSnapshot: {
              upsert: jest.fn(),
              update: jest.fn(),
            },
            expense: {
              upsert: jest.fn(),
            },
            ddsArticle: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              upsert: jest.fn(),
            },
            ddsArticleGroup: {
              upsert: jest.fn(),
              findFirst: jest.fn(),
            },
            cashDiscrepancy: {
              upsert: jest.fn(),
            },
            company: {
              upsert: jest.fn(),
            },
            syncLog: {
              create: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
            tenant: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
          },
        },
      ],
    }).compile();

    service = module.get<IikoSyncService>(IikoSyncService);
    prisma = module.get<PrismaService>(PrismaService);
    iikoAuth = module.get<IikoAuthService>(IikoAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncOrganizations', () => {
    it('should be defined', () => {
      expect(typeof service.syncOrganizations).toBe('function');
    });
  });

  describe('syncRevenue', () => {
    it('should be defined', () => {
      expect(typeof service.syncRevenue).toBe('function');
    });

    it('should skip sync when no restaurants found', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-02');

      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([]);

      await service.syncRevenue(dateFrom, dateTo);

      expect(iikoAuth.getAccessToken as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('syncExpenses', () => {
    it('should be defined', () => {
      expect(typeof service.syncExpenses).toBe('function');
    });

    it('should skip sync when no restaurants found', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-02');

      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([]);

      await service.syncExpenses(dateFrom, dateTo);

      expect(iikoAuth.getAccessToken as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('syncCashDiscrepancies', () => {
    it('should be defined', () => {
      expect(typeof service.syncCashDiscrepancies).toBe('function');
    });

    it('should skip sync when no restaurants found', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-02');

      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([]);

      await service.syncCashDiscrepancies(dateFrom, dateTo);

      // Should not attempt to get token when no restaurants
      expect(iikoAuth.getAccessToken as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('syncNomenclature', () => {
    // XML with two groups: fast-xml-parser wraps repeated elements as array
    const mockXml =
      '<groupDtoList><group><id>uuid-1</id><name>Products</name></group><group><id>uuid-2</id><name>Rent</name></group></groupDtoList>';

    beforeEach(() => {
      jest
        .spyOn(service as any, 'getTenantId')
        .mockResolvedValue('test-tenant');
    });

    it('should upsert DdsArticleGroup from parsed XML response', async () => {
      (iikoAuth.getAccessToken as jest.Mock).mockResolvedValue('test-token');
      // Bypass real makeRequest; return pre-built parsed object so xmlParser.parse produces predictable output
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue(mockXml);
      // Spy on xmlParser.parse to return a structure that normalizeArray can handle
      // groupDtoList must be an array directly (normalizeArray wraps non-arrays)
      jest.spyOn((service as any).xmlParser, 'parse').mockReturnValue({
        groupDtoList: [
          { id: 'uuid-1', name: 'Products' },
          { id: 'uuid-2', name: 'Rent' },
        ],
      });
      (prisma.ddsArticleGroup.upsert as jest.Mock).mockResolvedValue({});
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await service.syncNomenclature();

      expect(prisma.ddsArticleGroup.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.ddsArticleGroup.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId_code: { tenantId: 'test-tenant', code: 'uuid-1' } },
          update: { name: 'Products' },
          create: { tenantId: 'test-tenant', code: 'uuid-1', name: 'Products' },
        }),
      );
    });

    it('should log SUCCESS after nomenclature sync', async () => {
      (iikoAuth.getAccessToken as jest.Mock).mockResolvedValue('test-token');
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue(mockXml);
      jest.spyOn((service as any).xmlParser, 'parse').mockReturnValue({
        groupDtoList: [{ id: 'uuid-1', name: 'Products' }],
      });
      (prisma.ddsArticleGroup.upsert as jest.Mock).mockResolvedValue({});
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await service.syncNomenclature();

      expect(prisma.syncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            system: 'IIKO',
            status: 'SUCCESS',
          }),
        }),
      );
    });

    it('should log ERROR and throw when API call fails', async () => {
      const apiError = new Error('Connection refused');
      (iikoAuth.getAccessToken as jest.Mock).mockRejectedValue(apiError);
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await expect(service.syncNomenclature()).rejects.toThrow(
        'Connection refused',
      );

      expect(prisma.syncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            system: 'IIKO',
            status: 'ERROR',
          }),
        }),
      );
    });
  });

  describe('Sentry integration', () => {
    it('should NOT call Sentry.captureException on successful sync (empty restaurants)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sentry = require('@sentry/node') as {
        captureException: jest.Mock;
      };
      (Sentry.captureException as jest.Mock).mockClear();

      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([]);

      await service.syncRevenue(new Date(), new Date());

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('should NOT call Sentry.captureException on successful sync (with real data)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sentry = require('@sentry/node') as {
        captureException: jest.Mock;
      };
      (Sentry.captureException as jest.Mock).mockClear();

      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([
        { id: 'rest-1', iikoId: 'iiko-1', name: 'BNA Samal' },
      ]);
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue('');
      jest.spyOn(service as any, 'fetchBulkOlapData').mockResolvedValue(new Map());
      jest.spyOn(service as any, 'syncPaymentTypesFromOlapData').mockResolvedValue(undefined);
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});
      (iikoAuth.getAccessToken as jest.Mock).mockResolvedValue('test-token');

      await service.syncRevenue(new Date(), new Date());

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });

  describe('resolveGroupCode', () => {
    it('should map аренд* to RENT', () => {
      expect((service as any).resolveGroupCode('Аренда помещения офиса')).toBe('RENT');
    });

    it('should map зарплат* to SALARY', () => {
      expect((service as any).resolveGroupCode('Заработная плата сотрудников')).toBe('SALARY');
    });

    it('should map комисси*/банк* to BANK_FEE', () => {
      expect((service as any).resolveGroupCode('Комиссия банка Kaspi')).toBe('BANK_FEE');
    });

    it('should map коммунал* to UTILITIES', () => {
      expect((service as any).resolveGroupCode('Коммунальные платежи')).toBe('UTILITIES');
    });

    it('should map маркетинг* to MARKETING', () => {
      expect((service as any).resolveGroupCode('Маркетинг Instagram')).toBe('MARKETING');
    });

    it('should map unknown name to OTHER', () => {
      expect((service as any).resolveGroupCode('Непонятная статья XYZ')).toBe('OTHER');
    });

    it('should map налог* to TAXES', () => {
      expect((service as any).resolveGroupCode('Налог на прибыль')).toBe('TAXES');
    });

    it('should map кухн* to KITCHEN', () => {
      expect((service as any).resolveGroupCode('Кухня закупки')).toBe('KITCHEN');
    });
  });

  describe('syncDdsArticles', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'getTenantId').mockResolvedValue('test-tenant');
    });

    it('should upsert DdsArticle for each account and log SUCCESS', async () => {
      const mockAccounts = [
        { id: 'account-uuid-1', name: 'Аренда помещения' },
        { id: 'account-uuid-2', name: 'Заработная плата' },
      ];
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue(
        '<accounts><account><id>account-uuid-1</id><name>Аренда помещения</name></account></accounts>',
      );
      // POST returns items array with 2 accounts (one has parentId, one doesn't)
      jest.spyOn(service as any, 'makePostJsonRequest').mockResolvedValue({ items: mockAccounts });
      (prisma.ddsArticleGroup.findFirst as jest.Mock).mockResolvedValue({ id: 'group-1' });
      (prisma.ddsArticle.upsert as jest.Mock).mockResolvedValue({});
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});
      (iikoAuth.getAccessToken as jest.Mock).mockResolvedValue('test-token');

      await service.syncDdsArticles();

      expect(prisma.ddsArticle.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.syncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ system: 'IIKO', status: 'SUCCESS' }),
        }),
      );
    });

    it('should log ERROR and capture Sentry on HTTP error', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sentry = require('@sentry/node') as { captureException: jest.Mock; withScope: jest.Mock };
      (iikoAuth.getAccessToken as jest.Mock).mockResolvedValue('test-token');
      const apiError = new Error('Network error');
      jest.spyOn(service as any, 'makeRequest').mockRejectedValue(apiError);
      jest.spyOn(service as any, 'makePostJsonRequest').mockRejectedValue(apiError);
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await service.syncDdsArticles();

      expect(prisma.syncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ system: 'IIKO', status: 'ERROR' }),
        }),
      );
      expect(Sentry.captureException).toHaveBeenCalledWith(apiError);
    });
  });

  describe('syncDdsTransactions', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'getTenantId').mockResolvedValue('test-tenant');
    });

    it('should upsert Expense with syncId pattern dds: and log SUCCESS', async () => {
      const dateFrom = new Date('2026-04-01');
      const dateTo = new Date('2026-04-07');
      const mockRestaurants = [{ id: 'rest-1', iikoId: 'iiko-uuid-1', name: 'BNA Samal' }];
      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue(mockRestaurants);
      (iikoAuth.getAccessToken as jest.Mock).mockResolvedValue('test-token');
      const mockShiftResponse = {
        cashShifts: [
          {
            id: 'shift-1',
            date: '2026-04-01',
            payIns: [{ id: 'mov-1', accountId: 'account-uuid-1', amount: 50000, comment: 'Аренда' }],
            payOuts: [],
          },
        ],
      };
      jest.spyOn(service as any, 'makePostJsonRequest').mockResolvedValue(mockShiftResponse);
      (prisma.ddsArticle.findFirst as jest.Mock).mockResolvedValue({ id: 'article-1' });
      (prisma.expense.upsert as jest.Mock).mockResolvedValue({});
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await service.syncDdsTransactions(dateFrom, dateTo);

      expect(prisma.expense.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { syncId: 'dds:shift-1:mov-1' },
          create: expect.objectContaining({ source: 'IIKO', syncId: 'dds:shift-1:mov-1' }),
        }),
      );
      expect(prisma.syncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ system: 'IIKO', status: 'SUCCESS' }),
        }),
      );
    });

    it('should skip movements with unknown accountId and log warning', async () => {
      const dateFrom = new Date('2026-04-01');
      const dateTo = new Date('2026-04-07');
      const mockRestaurants = [{ id: 'rest-1', iikoId: 'iiko-uuid-1', name: 'BNA Samal' }];
      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue(mockRestaurants);
      (iikoAuth.getAccessToken as jest.Mock).mockResolvedValue('test-token');
      const mockShiftResponse = {
        cashShifts: [
          {
            id: 'shift-1',
            date: '2026-04-01',
            payIns: [{ id: 'mov-1', accountId: 'unknown-account-id', amount: 50000, comment: null }],
            payOuts: [],
          },
        ],
      };
      jest.spyOn(service as any, 'makePostJsonRequest').mockResolvedValue(mockShiftResponse);
      // Article not found
      (prisma.ddsArticle.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      await service.syncDdsTransactions(dateFrom, dateTo);

      expect(prisma.expense.upsert).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown-account-id'));
    });

    it('should log ERROR and capture Sentry when getAccessToken fails (outer error)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sentry = require('@sentry/node') as { captureException: jest.Mock; withScope: jest.Mock };
      const dateFrom = new Date('2026-04-01');
      const dateTo = new Date('2026-04-07');
      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([{ id: 'rest-1', iikoId: 'iiko-uuid-1', name: 'BNA Samal' }]);
      const authError = new Error('Auth service down');
      (iikoAuth.getAccessToken as jest.Mock).mockRejectedValue(authError);
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await service.syncDdsTransactions(dateFrom, dateTo);

      expect(prisma.syncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ system: 'IIKO', status: 'ERROR' }),
        }),
      );
      expect(Sentry.captureException).toHaveBeenCalledWith(authError);
    });
  });

  describe('parseDate / parseIikoDate — UTC midnight of calendar date', () => {
    // We deliberately do NOT shift to Almaty here: the target columns are
    // Postgres `date` (no time), and Prisma serializes Date as ISO string.
    // Almaty start-of-day (19:00 UTC of previous day) would slide every
    // iiko date back by one calendar day after Postgres truncation.
    const UTC_MIDNIGHT_31_MAR = '2026-03-31T00:00:00.000Z';

    it('parseDate("31.03.2026") returns UTC midnight of 31.03.2026', () => {
      const result = (service as any).parseDate('31.03.2026');
      expect(result.toISOString()).toBe(UTC_MIDNIGHT_31_MAR);
    });

    it('parseDate is the inverse of formatDate (round-trip)', () => {
      const dates = ['01.01.2026', '31.03.2026', '15.07.2026', '31.12.2025'];
      for (const d of dates) {
        const parsed = (service as any).parseDate(d);
        const formatted = (service as any).formatDate(parsed);
        expect(formatted).toBe(d);
      }
    });

    it('parseIikoDate("31.03.2026") — dot format — returns UTC midnight', () => {
      const result = (service as any).parseIikoDate('31.03.2026');
      expect(result!.toISOString()).toBe(UTC_MIDNIGHT_31_MAR);
    });

    it('parseIikoDate("2026-03-31") — dash date-only format — returns same UTC midnight', () => {
      const result = (service as any).parseIikoDate('2026-03-31');
      expect(result!.toISOString()).toBe(UTC_MIDNIGHT_31_MAR);
    });

    it('parseIikoDate dot and dash formats return the same instant for the same calendar date', () => {
      const dot = (service as any).parseIikoDate('31.03.2026') as Date;
      const dash = (service as any).parseIikoDate('2026-03-31') as Date;
      expect(dot.toISOString()).toBe(dash.toISOString());
    });

    it('parseIikoDate returns null for an unrecognised string', () => {
      expect((service as any).parseIikoDate('not-a-date-at-all')).toBeNull();
    });
  });

  describe('SchedulerService syncNomenclature', () => {
    it('should call iikoSync.syncNomenclature when syncNomenclature cron fires', async () => {
      const mockIikoSync = {
        syncNomenclature: jest.fn().mockResolvedValue(undefined),
        syncOrganizations: jest.fn(),
        syncRevenue: jest.fn(),
        syncExpenses: jest.fn(),
        syncCashDiscrepancies: jest.fn(),
        syncKitchenShipments: jest.fn(),
      };

      const mockOneCync = {
        syncExpenses: jest.fn(),
        syncKitchenPurchases: jest.fn(),
        syncKitchenIncome: jest.fn(),
      };

      const mockAllocation = {
        runAllocation: jest.fn(),
      };

      const mockAlertService = {
        checkSyncHealth: jest.fn().mockResolvedValue(undefined),
        checkRevenueThresholds: jest.fn().mockResolvedValue(undefined),
        checkLargeExpenses: jest.fn().mockResolvedValue(undefined),
      };

      const schedulerModule = await Test.createTestingModule({
        providers: [
          SchedulerService,
          { provide: IikoSyncService, useValue: mockIikoSync },
          { provide: OneCyncService, useValue: mockOneCync },
          { provide: AllocationService, useValue: mockAllocation },
          { provide: AlertService, useValue: mockAlertService },
        ],
      }).compile();

      const scheduler = schedulerModule.get<SchedulerService>(SchedulerService);
      await scheduler.syncNomenclature();

      expect(mockIikoSync.syncNomenclature).toHaveBeenCalledTimes(1);
    });
  });

  describe('dead letter pattern', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'getTenantId').mockResolvedValue('test-tenant');
    });

    it('should set needsManualReview after 3 consecutive errors', async () => {
      const recentErrors = [
        { id: '1', status: 'ERROR' },
        { id: '2', status: 'ERROR' },
        { id: '3', status: 'ERROR' },
      ];
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});
      (prisma.syncLog.findMany as jest.Mock).mockResolvedValue(recentErrors);
      (prisma.syncLog.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      // Trigger an error path — mock getAccessToken to fail
      (iikoAuth.getAccessToken as jest.Mock).mockRejectedValue(new Error('Auth failed'));
      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([{ id: 'r1', iikoId: 'i1', name: 'Test' }]);

      await service.syncRevenue(new Date(), new Date()).catch(() => {});

      expect(prisma.syncLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ system: 'IIKO' }),
          orderBy: { createdAt: 'desc' },
          take: 3,
        }),
      );
      expect(prisma.syncLog.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { needsManualReview: true },
        }),
      );
    });

    it('should NOT set needsManualReview when only 2 consecutive errors', async () => {
      const recentMixed = [
        { id: '1', status: 'ERROR' },
        { id: '2', status: 'ERROR' },
        { id: '3', status: 'SUCCESS' },
      ];
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});
      (prisma.syncLog.findMany as jest.Mock).mockResolvedValue(recentMixed);

      (iikoAuth.getAccessToken as jest.Mock).mockRejectedValue(new Error('Auth failed'));
      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([{ id: 'r1', iikoId: 'i1', name: 'Test' }]);

      await service.syncRevenue(new Date(), new Date()).catch(() => {});

      expect(prisma.syncLog.updateMany).not.toHaveBeenCalled();
    });

    it('should not break logSync if dead letter check itself fails', async () => {
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});
      (prisma.syncLog.findMany as jest.Mock).mockRejectedValue(new Error('DB unavailable'));

      (iikoAuth.getAccessToken as jest.Mock).mockRejectedValue(new Error('Auth failed'));
      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([{ id: 'r1', iikoId: 'i1', name: 'Test' }]);

      // Should not throw from logSync — the outer error from syncRevenue is still thrown
      await expect(service.syncRevenue(new Date(), new Date())).rejects.toThrow('Auth failed');
      // logSync completed without propagating the dead letter error
    });
  });

  describe('resolveBrandIikoId — generic parent-chain resolver', () => {
    const make = (
      id: string,
      type: string,
      name: string,
      parentId?: string,
    ) => ({ id, type, name, parentId });

    it('returns ORGDEVELOPMENT id when restaurant.parentId points to a brand directly', () => {
      const items = new Map<string, any>();
      const brand = make('brand-1', 'ORGDEVELOPMENT', 'BNA');
      const dept = make('dept-1', 'DEPARTMENT', 'BNA Samal', 'brand-1');
      items.set(brand.id, brand);
      const result = (service as any).resolveBrandIikoId(dept, items);
      expect(result).toBe('brand-1');
    });

    it('walks through a JURPERSON intermediate node up to the brand', () => {
      const items = new Map<string, any>();
      const brand = make('brand-jd', 'ORGDEVELOPMENT', 'Just Doner');
      const jur = make('jur-1', 'JURPERSON', 'TOO Qazaq Guys', 'brand-jd');
      const dept = make('dept-jd-ari', 'DEPARTMENT', 'Just Doner Ари', 'jur-1');
      items.set(brand.id, brand);
      items.set(jur.id, jur);
      const result = (service as any).resolveBrandIikoId(dept, items);
      expect(result).toBe('brand-jd');
    });

    it('returns null when no ORGDEVELOPMENT ancestor exists', () => {
      const items = new Map<string, any>();
      const orphanParent = make('jur-orphan', 'JURPERSON', 'Some legal entity');
      const dept = make('dept-orphan', 'DEPARTMENT', 'Orphaned', 'jur-orphan');
      items.set(orphanParent.id, orphanParent);
      const result = (service as any).resolveBrandIikoId(dept, items);
      expect(result).toBeNull();
    });

    it('returns null on missing parentId', () => {
      const items = new Map<string, any>();
      const dept = make('dept-no-parent', 'DEPARTMENT', 'Floating');
      const result = (service as any).resolveBrandIikoId(dept, items);
      expect(result).toBeNull();
    });

    it('does not loop on cyclic parent chains', () => {
      const items = new Map<string, any>();
      const a = make('a', 'JURPERSON', 'A', 'b');
      const b = make('b', 'JURPERSON', 'B', 'a');
      items.set(a.id, a);
      items.set(b.id, b);
      const dept = make('dept-cycle', 'DEPARTMENT', 'Cycle', 'a');
      const result = (service as any).resolveBrandIikoId(dept, items);
      expect(result).toBeNull();
    });
  });

  describe('resolveLegalEntityIikoId — direct JURPERSON ancestor lookup', () => {
    const make = (
      id: string,
      type: string,
      name: string,
      parentId?: string,
    ) => ({ id, type, name, parentId });

    it('returns the immediate JURPERSON id when restaurant.parentId is a JURPERSON', () => {
      const items = new Map<string, any>();
      const brand = make('brand-jd', 'ORGDEVELOPMENT', 'Just Doner');
      const jur = make('jur-1', 'JURPERSON', 'TOO Qazaq Guys', 'brand-jd');
      const dept = make('dept-jd-ari', 'DEPARTMENT', 'Just Doner Ари', 'jur-1');
      items.set(brand.id, brand);
      items.set(jur.id, jur);
      const result = (service as any).resolveLegalEntityIikoId(dept, items);
      expect(result).toBe('jur-1');
    });

    it('returns null when restaurant attaches directly to an ORGDEVELOPMENT (no JURPERSON in chain)', () => {
      const items = new Map<string, any>();
      const brand = make('brand-x', 'ORGDEVELOPMENT', 'Brand X');
      const dept = make('dept-direct', 'DEPARTMENT', 'Direct child', 'brand-x');
      items.set(brand.id, brand);
      const result = (service as any).resolveLegalEntityIikoId(dept, items);
      expect(result).toBeNull();
    });

    it('returns null when no parent chain exists at all', () => {
      const items = new Map<string, any>();
      const dept = make('orphan', 'DEPARTMENT', 'Orphan');
      const result = (service as any).resolveLegalEntityIikoId(dept, items);
      expect(result).toBeNull();
    });
  });

  describe('syncOrganizations — legal entities (JURPERSON) are upserted and linked', () => {
    it('upserts legal entities and attaches restaurants via legalEntityId', async () => {
      jest.spyOn(service as any, 'getTenantId').mockResolvedValue('test-tenant');
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue('');
      jest.spyOn((service as any).xmlParser, 'parse').mockReturnValue({
        corporateItemDtoes: {
          corporateItemDto: [
            { id: 'brand-dna', name: 'Doner na Abaya', type: 'ORGDEVELOPMENT' },
            {
              id: 'jur-zhekas',
              parentId: 'brand-dna',
              name: 'TOO Zhekas Family',
              type: 'JURPERSON',
              taxpayerIdNumber: '180840000123',
            },
            {
              id: 'rest-abaya15',
              parentId: 'jur-zhekas',
              name: 'DNA Абая 15',
              type: 'DEPARTMENT',
            },
          ],
        },
      });

      (iikoAuth.getAccessToken as jest.Mock).mockResolvedValue('test-token');
      (prisma.brand.upsert as jest.Mock).mockResolvedValue({ id: 'db-brand-dna' });
      (prisma.brand.findUnique as jest.Mock).mockResolvedValue({
        id: 'db-brand-dna',
        iikoGroupId: 'brand-dna',
      });
      (prisma.company.upsert as jest.Mock).mockResolvedValue({ id: 'co-1' });
      (prisma.legalEntity.upsert as jest.Mock).mockResolvedValue({
        id: 'db-jur-zhekas',
      });
      (prisma.restaurant.upsert as jest.Mock).mockResolvedValue({});
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await service.syncOrganizations();

      expect(prisma.legalEntity.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { iikoId: 'jur-zhekas' },
          create: expect.objectContaining({
            iikoId: 'jur-zhekas',
            brandId: 'db-brand-dna',
            name: 'TOO Zhekas Family',
            taxpayerIdNumber: '180840000123',
          }),
        }),
      );
      expect(prisma.restaurant.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { iikoId: 'rest-abaya15' },
          create: expect.objectContaining({
            iikoId: 'rest-abaya15',
            brandId: 'db-brand-dna',
            legalEntityId: 'db-jur-zhekas',
          }),
        }),
      );
    });

    it('soft-deletes legal entities no longer present in iiko response', async () => {
      jest.spyOn(service as any, 'getTenantId').mockResolvedValue('test-tenant');
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue('');
      jest.spyOn((service as any).xmlParser, 'parse').mockReturnValue({
        corporateItemDtoes: {
          corporateItemDto: [
            { id: 'brand-dna', name: 'Doner na Abaya', type: 'ORGDEVELOPMENT' },
            {
              id: 'jur-still',
              parentId: 'brand-dna',
              name: 'Still here',
              type: 'JURPERSON',
            },
          ],
        },
      });

      (iikoAuth.getAccessToken as jest.Mock).mockResolvedValue('test-token');
      (prisma.brand.upsert as jest.Mock).mockResolvedValue({ id: 'db-brand-dna' });
      (prisma.brand.findUnique as jest.Mock).mockResolvedValue({
        id: 'db-brand-dna',
        iikoGroupId: 'brand-dna',
      });
      (prisma.company.upsert as jest.Mock).mockResolvedValue({ id: 'co-1' });
      (prisma.legalEntity.upsert as jest.Mock).mockResolvedValue({
        id: 'db-jur-still',
      });
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await service.syncOrganizations();

      expect(prisma.legalEntity.updateMany).toHaveBeenCalledWith({
        where: {
          iikoId: { not: null },
          NOT: { iikoId: { in: ['jur-still'] } },
          isActive: true,
        },
        data: { isActive: false },
      });
    });
  });

  describe('syncOrganizations — full flow with JURPERSON intermediate (Just Doner regression)', () => {
    it('upserts restaurants whose parent is a JURPERSON without any hardcoded mapping', async () => {
      jest.spyOn(service as any, 'getTenantId').mockResolvedValue('test-tenant');
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue('');
      jest.spyOn((service as any).xmlParser, 'parse').mockReturnValue({
        corporateItemDtoes: {
          corporateItemDto: [
            {
              id: 'brand-jd',
              name: 'Just Doner',
              type: 'ORGDEVELOPMENT',
            },
            {
              id: 'jur-1',
              parentId: 'brand-jd',
              name: 'TOO Qazaq Guys',
              type: 'JURPERSON',
            },
            {
              id: 'rest-ari',
              parentId: 'jur-1',
              name: 'Just Doner Ари',
              type: 'DEPARTMENT',
            },
            {
              id: 'rest-almaly',
              parentId: 'jur-1',
              name: 'Just Doner Жк Алмалы',
              type: 'DEPARTMENT',
            },
          ],
        },
      });

      (iikoAuth.getAccessToken as jest.Mock).mockResolvedValue('test-token');
      (prisma.brand.upsert as jest.Mock).mockResolvedValue({ id: 'db-brand-jd' });
      (prisma.brand.findUnique as jest.Mock).mockResolvedValue({
        id: 'db-brand-jd',
        iikoGroupId: 'brand-jd',
      });
      (prisma.company.upsert as jest.Mock).mockResolvedValue({ id: 'co-1' });
      (prisma.restaurant.upsert as jest.Mock).mockResolvedValue({});
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await service.syncOrganizations();

      expect(prisma.restaurant.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.restaurant.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { iikoId: 'rest-ari' },
          create: expect.objectContaining({
            iikoId: 'rest-ari',
            brandId: 'db-brand-jd',
            name: 'Just Doner Ари',
          }),
        }),
      );
      expect(prisma.restaurant.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { iikoId: 'rest-almaly' },
        }),
      );
    });

    it('soft-deletes restaurants no longer present in the iiko response', async () => {
      jest.spyOn(service as any, 'getTenantId').mockResolvedValue('test-tenant');
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue('');
      jest.spyOn((service as any).xmlParser, 'parse').mockReturnValue({
        corporateItemDtoes: {
          corporateItemDto: [
            { id: 'brand-x', name: 'X', type: 'ORGDEVELOPMENT' },
            {
              id: 'rest-still-here',
              parentId: 'brand-x',
              name: 'Still here',
              type: 'DEPARTMENT',
            },
          ],
        },
      });

      (iikoAuth.getAccessToken as jest.Mock).mockResolvedValue('test-token');
      (prisma.brand.upsert as jest.Mock).mockResolvedValue({ id: 'db-x' });
      (prisma.brand.findUnique as jest.Mock).mockResolvedValue({
        id: 'db-x',
        iikoGroupId: 'brand-x',
      });
      (prisma.company.upsert as jest.Mock).mockResolvedValue({ id: 'co-1' });
      (prisma.restaurant.upsert as jest.Mock).mockResolvedValue({});
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await service.syncOrganizations();

      expect(prisma.restaurant.updateMany).toHaveBeenCalledWith({
        where: {
          iikoId: { notIn: ['rest-still-here'] },
          isActive: true,
        },
        data: { isActive: false },
      });
      expect(prisma.brand.updateMany).toHaveBeenCalledWith({
        where: {
          iikoGroupId: { not: null },
          NOT: { iikoGroupId: { in: ['brand-x'] } },
          isActive: true,
        },
        data: { isActive: false },
      });
    });

    it('emits Sentry warning (not error) when a restaurant cannot be resolved to a brand', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sentry = require('@sentry/node') as {
        captureMessage: jest.Mock;
        captureException: jest.Mock;
      };
      (Sentry.captureMessage as jest.Mock).mockClear();
      (Sentry.captureException as jest.Mock).mockClear();

      jest.spyOn(service as any, 'getTenantId').mockResolvedValue('test-tenant');
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue('');
      jest.spyOn((service as any).xmlParser, 'parse').mockReturnValue({
        corporateItemDtoes: {
          corporateItemDto: [
            {
              id: 'rest-orphan',
              parentId: 'unknown-parent',
              name: 'Orphan',
              type: 'DEPARTMENT',
            },
          ],
        },
      });

      (iikoAuth.getAccessToken as jest.Mock).mockResolvedValue('test-token');
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await service.syncOrganizations();

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('Orphan'),
        'warning',
      );
      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(prisma.restaurant.upsert).not.toHaveBeenCalled();
    });
  });

  describe('BUG-11-3 · determineBrandType + brand.upsert type field', () => {
    it('returns RESTAURANT for regular brand names', () => {
      expect((service as any).determineBrandType('BNA Samal')).toBe('RESTAURANT');
      expect((service as any).determineBrandType('Doner na Abaya')).toBe('RESTAURANT');
      expect((service as any).determineBrandType('KEX Coffee')).toBe('RESTAURANT');
    });

    it('returns KITCHEN for names matching цех|kitchen|fabrika (case-insensitive)', () => {
      expect((service as any).determineBrandType('Цех')).toBe('KITCHEN');
      expect((service as any).determineBrandType('цех производства')).toBe('KITCHEN');
      expect((service as any).determineBrandType('Kitchen')).toBe('KITCHEN');
      expect((service as any).determineBrandType('Main Kitchen Almaty')).toBe('KITCHEN');
      expect((service as any).determineBrandType('Fabrika')).toBe('KITCHEN');
      expect((service as any).determineBrandType('Central Fabrika')).toBe('KITCHEN');
    });

    it('includes type:RESTAURANT in brand.upsert create/update for normal brand', async () => {
      jest.spyOn(service as any, 'getTenantId').mockResolvedValue('test-tenant');
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue('');

      // Mock XML parser to return one ORGDEVELOPMENT brand
      jest.spyOn((service as any).xmlParser, 'parse').mockReturnValue({
        corporateItemDtoes: {
          corporateItemDto: [
            { id: 'brand-uuid-1', name: 'BNA Samal', type: 'ORGDEVELOPMENT' },
          ],
        },
      });

      (iikoAuth.getAccessToken as jest.Mock).mockResolvedValue('test-token');
      (prisma.brand.upsert as jest.Mock).mockResolvedValue({ id: 'brand-uuid-1' });
      (prisma.company.upsert as jest.Mock).mockResolvedValue({ id: 'company-1' });
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await service.syncOrganizations();

      expect(prisma.brand.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { iikoGroupId: 'brand-uuid-1' },
          update: expect.objectContaining({ type: 'RESTAURANT' }),
          create: expect.objectContaining({ type: 'RESTAURANT' }),
        }),
      );
    });

    it('includes type:KITCHEN in brand.upsert create/update for kitchen brand', async () => {
      jest.spyOn(service as any, 'getTenantId').mockResolvedValue('test-tenant');
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue('');

      // Mock XML parser to return one ORGDEVELOPMENT brand named Цех
      jest.spyOn((service as any).xmlParser, 'parse').mockReturnValue({
        corporateItemDtoes: {
          corporateItemDto: [
            { id: 'brand-kitchen-1', name: 'Цех', type: 'ORGDEVELOPMENT' },
          ],
        },
      });

      (iikoAuth.getAccessToken as jest.Mock).mockResolvedValue('test-token');
      (prisma.brand.upsert as jest.Mock).mockResolvedValue({ id: 'brand-kitchen-1' });
      (prisma.company.upsert as jest.Mock).mockResolvedValue({ id: 'company-1' });
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await service.syncOrganizations();

      expect(prisma.brand.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { iikoGroupId: 'brand-kitchen-1' },
          update: expect.objectContaining({ type: 'KITCHEN' }),
          create: expect.objectContaining({ type: 'KITCHEN' }),
        }),
      );
    });
  });
});
