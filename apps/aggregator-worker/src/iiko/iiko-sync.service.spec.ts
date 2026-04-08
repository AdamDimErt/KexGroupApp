jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  withScope: jest.fn((cb) => cb({ setTag: jest.fn(), setContext: jest.fn() })),
  captureException: jest.fn(),
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
            },
            restaurant: {
              upsert: jest.fn(),
              findMany: jest.fn(),
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
              create: jest.fn(),
            },
            ddsArticleGroup: {
              upsert: jest.fn(),
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
});
