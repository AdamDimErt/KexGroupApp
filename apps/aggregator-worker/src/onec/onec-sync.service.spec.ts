jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  withScope: jest.fn((cb) => cb({ setTag: jest.fn(), setContext: jest.fn() })),
  captureException: jest.fn(),
}));

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
});
