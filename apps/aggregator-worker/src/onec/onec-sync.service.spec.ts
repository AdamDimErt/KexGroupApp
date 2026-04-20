// BUG-11-8: mock must expose setExtra + captureMessage on scope for per-record error path
const mockScope = {
  setTag: jest.fn(),
  setContext: jest.fn(),
  setExtra: jest.fn(),
  captureMessage: jest.fn(),
};

jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  withScope: jest.fn((cb) => cb(mockScope)),
  captureException: jest.fn(),
}));

import * as Sentry from '@sentry/node';

import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { OneCyncService } from './onec-sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { of } from 'rxjs';

describe('OneCyncService', () => {
  let service: OneCyncService;
  let prisma: PrismaService;
  let httpService: HttpService;

  const mockPrisma = {
    restaurant: {
      findMany: jest.fn(),
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
    kitchenPurchase: {
      upsert: jest.fn(),
    },
    kitchenIncome: {
      upsert: jest.fn(),
    },
    syncLog: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };

  beforeEach(async () => {
    process.env.ONEC_BASE_URL = 'http://test-1c:8080';
    process.env.ONEC_USER = 'testuser';
    process.env.ONEC_PASSWORD = 'testpass';
    process.env.TENANT_ID = 'test-tenant';

    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        OneCyncService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<OneCyncService>(OneCyncService);
    prisma = module.get<PrismaService>(PrismaService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Also clear the module-level mockScope counters
    mockScope.setTag.mockClear();
    mockScope.setContext.mockClear();
    mockScope.setExtra.mockClear();
    mockScope.captureMessage.mockClear();
    delete process.env.ONEC_BASE_URL;
    delete process.env.ONEC_USER;
    delete process.env.ONEC_PASSWORD;
    delete process.env.TENANT_ID;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncKitchenShipmentsByRestaurant', () => {
    const dateFrom = new Date('2026-04-01');
    const dateTo = new Date('2026-04-07');

    it('should create Expense with restaurantId for matched counterparty', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              Ref_Key: 'doc-uuid-1',
              Date: '2026-04-05T00:00:00',
              DocumentAmount: '15000',
              Description: 'Shipment to BNA Samal',
              Counterparty: 'BNA Samal',
            },
          ],
        },
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse) as any);

      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([
        { id: 'rest-1', name: 'BNA Samal', oneCId: null },
      ]);

      const mockArticle = { id: 'art-kitchen', code: 'kitchen_shipment' };
      (prisma.ddsArticle.findFirst as jest.Mock).mockResolvedValue(mockArticle);
      (prisma.expense.upsert as jest.Mock).mockResolvedValue({});
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await service.syncKitchenShipmentsByRestaurant(dateFrom, dateTo);

      expect(prisma.expense.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { syncId: 'onec:kitchenshipment:doc-uuid-1' },
          create: expect.objectContaining({
            restaurantId: 'rest-1',
            source: 'ONE_C',
            articleId: 'art-kitchen',
          }),
        }),
      );
    });

    it('should skip record when restaurant not found by counterparty', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              Ref_Key: 'doc-uuid-2',
              Date: '2026-04-05T00:00:00',
              DocumentAmount: '10000',
              Counterparty: 'Unknown Restaurant',
            },
          ],
        },
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse) as any);

      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([
        { id: 'rest-1', name: 'BNA Samal', oneCId: null },
      ]);

      const mockArticle = { id: 'art-kitchen', code: 'kitchen_shipment' };
      (prisma.ddsArticle.findFirst as jest.Mock).mockResolvedValue(mockArticle);
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await service.syncKitchenShipmentsByRestaurant(dateFrom, dateTo);

      expect(prisma.expense.upsert).not.toHaveBeenCalled();
      expect(prisma.syncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SUCCESS',
            recordsCount: 0,
          }),
        }),
      );
    });

    it('should create DdsArticle with code kitchen_shipment if not exists', async () => {
      const mockResponse = { data: { value: [] } };
      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse) as any);
      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([]);

      // Article does not exist
      (prisma.ddsArticle.findFirst as jest.Mock).mockResolvedValue(null);

      const mockGroup = { id: 'grp-kitchen' };
      (prisma.ddsArticleGroup.upsert as jest.Mock).mockResolvedValue(mockGroup);

      const mockArticle = { id: 'art-new', code: 'kitchen_shipment' };
      (prisma.ddsArticle.create as jest.Mock).mockResolvedValue(mockArticle);
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await service.syncKitchenShipmentsByRestaurant(dateFrom, dateTo);

      expect(prisma.ddsArticleGroup.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId_code: { tenantId: 'test-tenant', code: 'kitchen' } },
        }),
      );
      expect(prisma.ddsArticle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'kitchen_shipment',
            source: 'ONE_C',
            allocationType: 'DIRECT',
          }),
        }),
      );
    });

    it('should log ERROR to SyncLog when API call fails', async () => {
      jest.spyOn(service as any, 'makeRequest').mockRejectedValue(new Error('1C unavailable'));

      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await expect(
        service.syncKitchenShipmentsByRestaurant(dateFrom, dateTo),
      ).rejects.toThrow('1C unavailable');

      expect(prisma.syncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            system: 'ONE_C',
            status: 'ERROR',
          }),
        }),
      );
    });
  });

  describe('BUG-11-8 · per-record try/catch in syncExpenses', () => {
    const dateFrom = new Date('2026-04-20');
    const dateTo = new Date('2026-04-20');

    /**
     * Helper: set up HTTP mock to return given expense records, and Prisma mocks
     * so upsert throws for records whose Ref_Key is in `badKeys`.
     */
    function setupExpenseMocks(
      records: Array<{ Ref_Key: string; Amount: string; Date: string; Description?: string }>,
      badKeys: string[] = [],
    ) {
      const mockHttpResponse = {
        data: { value: records },
      };
      jest.spyOn(httpService, 'get').mockReturnValue(of(mockHttpResponse) as any);

      // Provide an existing hq_overhead article so the findFirst path is short-circuited
      const mockArticle = { id: 'art-hq', code: 'hq_overhead', groupId: 'grp-hq' };
      (mockPrisma.ddsArticle.findFirst as jest.Mock).mockResolvedValue(mockArticle);
      (mockPrisma.syncLog.create as jest.Mock).mockResolvedValue({});

      // Expense upsert: throw for bad keys, succeed for good ones
      (mockPrisma.expense.upsert as jest.Mock).mockImplementation((args: any) => {
        const syncId: string = args?.where?.syncId ?? '';
        const refKey = syncId.replace('onec:expense:', '');
        if (badKeys.includes(refKey)) {
          return Promise.reject(new Error(`DB error for ${refKey}`));
        }
        return Promise.resolve({ id: refKey });
      });
    }

    it('skips one bad record and continues processing remaining good records', async () => {
      const records = [
        { Ref_Key: 'good-1', Amount: '100.00', Date: '2026-04-20', Description: 'Rent' },
        { Ref_Key: 'bad-1',  Amount: 'NaN',    Date: '2026-04-20', Description: 'Broken' },
        { Ref_Key: 'good-2', Amount: '200.00', Date: '2026-04-20', Description: 'IT' },
      ];

      setupExpenseMocks(records, ['bad-1']);

      // WHEN: syncExpenses is called
      // THEN: must NOT throw (per-record catch stops propagation)
      await expect(service.syncExpenses(dateFrom, dateTo)).resolves.toBeUndefined();

      // All 3 upsert attempts were made (good-1, bad-1 throws, good-2)
      expect(mockPrisma.expense.upsert).toHaveBeenCalledTimes(3);

      // SyncLog must record SUCCESS (not ERROR) since the outer loop completed
      expect(mockPrisma.syncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SUCCESS' }),
        }),
      );
    });

    it('logs warning + Sentry.withScope for each skipped record (not throw)', async () => {
      const records = [
        { Ref_Key: 'bad-1', Amount: 'NaN', Date: '2026-04-20', Description: 'Bad' },
      ];

      setupExpenseMocks(records, ['bad-1']);

      const loggerWarnSpy = jest.spyOn((service as any).logger, 'warn');

      await service.syncExpenses(dateFrom, dateTo);

      // logger.warn must mention the bad record's Ref_Key
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('bad-1'),
      );

      // Sentry.withScope must have been invoked
      expect(Sentry.withScope).toHaveBeenCalled();

      // scope.captureMessage called with 'warning' severity
      expect(mockScope.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('Skipped 1C expense record'),
        'warning',
      );
    });

    it('tagged with system=ONE_C and recordRefKey in Sentry scope', async () => {
      const records = [
        { Ref_Key: 'bad-key-42', Amount: 'NaN', Date: '2026-04-20' },
      ];

      setupExpenseMocks(records, ['bad-key-42']);

      await service.syncExpenses(dateFrom, dateTo);

      // Scope must have system=ONE_C tag
      expect(mockScope.setTag).toHaveBeenCalledWith('system', 'ONE_C');

      // Scope must have recordRefKey extra matching the bad record's Ref_Key
      expect(mockScope.setExtra).toHaveBeenCalledWith('recordRefKey', 'bad-key-42');
    });
  });
});
