import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockPrismaService = {
    company: {
      findMany: jest.fn(),
    },
    brand: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    restaurant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    financialSnapshot: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    costAllocation: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    ddsArticle: {
      findMany: jest.fn(),
    },
    ddsArticleGroup: {
      findUnique: jest.fn(),
    },
    cashDiscrepancy: {
      findMany: jest.fn(),
    },
    syncLog: {
      aggregate: jest.fn(),
    },
    kitchenPurchase: {
      findMany: jest.fn(),
    },
    kitchenShipment: {
      groupBy: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('Asia/Almaty'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCompanySummary', () => {
    it('should return company summary with aggregated financials', async () => {
      const tenantId = 'tenant-1';
      const dateFrom = '2026-01-01';
      const dateTo = '2026-01-31';

      const mockCompanies = [
        {
          id: 'company-1',
          name: 'TOO Burger na Abaya',
          tenantId,
        },
      ];

      mockPrismaService.company.findMany.mockResolvedValue(mockCompanies);
      mockPrismaService.restaurant.findMany.mockResolvedValue([
        {
          id: 'restaurant-1',
          name: 'BNA Besagash',
          brandId: 'brand-1',
          brand: { id: 'brand-1', companyId: 'company-1' },
        },
      ]);
      mockPrismaService.financialSnapshot.aggregate.mockResolvedValue({
        _sum: { revenue: 1000 },
      });
      mockPrismaService.expense.aggregate.mockResolvedValue({
        _sum: { amount: 200 },
      });
      mockPrismaService.costAllocation.aggregate.mockResolvedValue({
        _sum: { allocatedAmount: 150 },
      });

      const result = await service.getCompanySummary(
        tenantId,
        dateFrom,
        dateTo,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'company-1',
        name: 'TOO Burger na Abaya',
        revenue: 1000,
        directExpenses: 200,
        allocatedExpenses: 150,
        netProfit: 650,
      });
    });
  });

  describe('getBrandSummary', () => {
    it('should return brand summary with aggregated financials', async () => {
      const companyId = 'company-1';
      const dateFrom = '2026-01-01';
      const dateTo = '2026-01-31';

      const mockBrands = [
        {
          id: 'brand-1',
          name: 'Burger na Abaya',
          companyId,
        },
      ];

      mockPrismaService.brand.findMany.mockResolvedValue(mockBrands);
      mockPrismaService.restaurant.findMany.mockResolvedValue([
        {
          id: 'restaurant-1',
          name: 'BNA Besagash',
          brandId: 'brand-1',
        },
      ]);
      mockPrismaService.financialSnapshot.aggregate.mockResolvedValue({
        _sum: { revenue: 5000 },
      });
      mockPrismaService.expense.aggregate.mockResolvedValue({
        _sum: { amount: 800 },
      });
      mockPrismaService.costAllocation.aggregate.mockResolvedValue({
        _sum: { allocatedAmount: 500 },
      });

      const result = await service.getBrandSummary(companyId, dateFrom, dateTo);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'brand-1',
        name: 'Burger na Abaya',
        revenue: 5000,
        directExpenses: 800,
        allocatedExpenses: 500,
        netProfit: 3700,
      });
    });
  });

  describe('getRestaurantSummary', () => {
    it('should return restaurant summary for brand', async () => {
      const brandId = 'brand-1';
      const dateFrom = '2026-01-01';
      const dateTo = '2026-01-31';

      const mockRestaurants = [
        {
          id: 'restaurant-1',
          name: 'BNA Besagash',
          brandId,
        },
      ];

      mockPrismaService.restaurant.findMany.mockResolvedValue(mockRestaurants);
      mockPrismaService.financialSnapshot.groupBy.mockResolvedValue([
        {
          restaurantId: 'restaurant-1',
          _sum: { revenue: 2500 },
        },
      ]);
      mockPrismaService.expense.groupBy.mockResolvedValue([
        {
          restaurantId: 'restaurant-1',
          _sum: { amount: 400 },
        },
      ]);
      mockPrismaService.costAllocation.groupBy.mockResolvedValue([
        {
          restaurantId: 'restaurant-1',
          _sum: { allocatedAmount: 250 },
        },
      ]);

      const result = await service.getRestaurantSummary(
        brandId,
        dateFrom,
        dateTo,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'restaurant-1',
        name: 'BNA Besagash',
        revenue: 2500,
        directExpenses: 400,
        allocatedExpenses: 250,
        netProfit: 1850,
      });
    });
  });

  describe('getArticleSummary', () => {
    it('should return article summary for restaurant with coefficient', async () => {
      const restaurantId = 'restaurant-1';
      const dateFrom = '2026-01-01';
      const dateTo = '2026-01-31';

      mockPrismaService.expense.groupBy.mockResolvedValue([
        {
          articleId: 'article-1',
          _sum: { amount: 500 },
        },
      ]);

      mockPrismaService.ddsArticle.findMany.mockResolvedValue([
        {
          id: 'article-1',
          name: 'Продукты',
          code: 'PROD-001',
          source: 'IIKO',
          allocationType: 'DIRECT',
          groupId: 'group-1',
          group: {
            id: 'group-1',
            name: 'Продукты и материалы',
          },
        },
      ]);

      mockPrismaService.restaurant.findUnique.mockResolvedValue({
        id: 'restaurant-1',
        brandId: 'brand-1',
      });

      mockPrismaService.restaurant.findMany.mockResolvedValue([
        {
          id: 'restaurant-1',
          brandId: 'brand-1',
        },
      ]);

      mockPrismaService.financialSnapshot.aggregate
        .mockResolvedValueOnce({ _sum: { revenue: 5000 } }) // this restaurant
        .mockResolvedValueOnce({ _sum: { revenue: 10000 } }); // all restaurants in brand

      const result = await service.getArticleSummary(
        restaurantId,
        dateFrom,
        dateTo,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'article-1',
        name: 'Продукты',
        code: 'PROD-001',
        source: 'IIKO',
        allocationType: 'DIRECT',
        amount: 500,
        coefficient: 0.5, // 5000 / 10000
      });
    });
  });

  describe('toNumber helper', () => {
    it('should convert Decimal to number', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = (service as any).toNumber(500.5);
      expect(result).toBe(500.5);
    });

    it('should handle null values', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = (service as any).toNumber(null);
      expect(result).toBe(0);
    });

    it('should handle undefined values', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = (service as any).toNumber(undefined);
      expect(result).toBe(0);
    });
  });

  describe('getDashboardSummary - lastSyncAt', () => {
    it('should populate lastSyncAt from SyncLog', async () => {
      const tenantId = 'tenant-1';
      const syncDate = new Date('2026-04-07T10:00:00Z');

      mockPrismaService.restaurant.findMany.mockResolvedValue([]);
      mockPrismaService.brand.findMany.mockResolvedValue([{ id: 'brand-1', name: 'BNA', slug: 'bna', _count: { restaurants: 0 } }]);
      mockPrismaService.financialSnapshot.groupBy.mockResolvedValue([]);
      mockPrismaService.syncLog.aggregate.mockResolvedValue({
        _max: { createdAt: syncDate },
      });

      const result = await service.getDashboardSummary(tenantId, 'today', '2026-04-07', '2026-04-07');

      expect(result.lastSyncAt).toBe(syncDate.toISOString());
      expect(result.lastSyncStatus).toBe('success');
      expect(mockPrismaService.syncLog.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, status: 'SUCCESS' },
          _max: { createdAt: true },
        }),
      );
    });

    it('should return null lastSyncAt when no successful syncs exist', async () => {
      const tenantId = 'tenant-1';

      mockPrismaService.restaurant.findMany.mockResolvedValue([]);
      mockPrismaService.brand.findMany.mockResolvedValue([]);
      mockPrismaService.financialSnapshot.groupBy.mockResolvedValue([]);
      mockPrismaService.syncLog.aggregate.mockResolvedValue({
        _max: { createdAt: null },
      });

      const result = await service.getDashboardSummary(tenantId, 'today', '2026-04-07', '2026-04-07');

      expect(result.lastSyncAt).toBeNull();
      expect(result.lastSyncStatus).toBeNull();
    });
  });

  describe('getArticleOperations', () => {
    it('should return paginated operations with allocationCoefficient', async () => {
      const mockExpenses = [
        {
          id: 'exp-1',
          date: new Date('2026-04-01'),
          amount: { toString: () => '1500.50' },
          comment: 'Test expense',
          source: 'IIKO',
          restaurant: { name: 'BNA Besagash' },
          costAllocations: [{ coefficient: { toString: () => '0.350000' } }],
        },
      ];

      mockPrismaService.expense.count.mockResolvedValue(1);
      mockPrismaService.expense.findMany.mockResolvedValue(mockExpenses);

      const result = await service.getArticleOperations(
        'article-1', 'restaurant-1', '2026-04-01', '2026-04-30', 50, 0,
      );

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: 'exp-1',
        amount: 1500.5,
        comment: 'Test expense',
        source: 'IIKO',
        allocationCoefficient: 0.35,
        restaurantName: 'BNA Besagash',
      });
      expect(result.period).toEqual({ from: '2026-04-01', to: '2026-04-30' });
    });

    it('should return null allocationCoefficient when no costAllocations exist', async () => {
      const mockExpenses = [
        {
          id: 'exp-2',
          date: new Date('2026-04-01'),
          amount: { toString: () => '500.00' },
          comment: null,
          source: 'ONE_C',
          restaurant: { name: 'DNA Aksay' },
          costAllocations: [],
        },
      ];

      mockPrismaService.expense.count.mockResolvedValue(1);
      mockPrismaService.expense.findMany.mockResolvedValue(mockExpenses);

      const result = await service.getArticleOperations(
        'article-2', 'restaurant-2', '2026-04-01', '2026-04-30', 50, 0,
      );

      expect(result.items[0].allocationCoefficient).toBeNull();
      expect(result.items[0].comment).toBeNull();
    });

    it('should pass correct skip/take for pagination', async () => {
      mockPrismaService.expense.count.mockResolvedValue(0);
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      await service.getArticleOperations(
        'article-1', 'restaurant-1', '2026-04-01', '2026-04-30', 25, 50,
      );

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
          skip: 50,
          orderBy: { date: 'desc' },
        }),
      );
    });
  });

  describe('getReportDds', () => {
    it('should return expenses grouped by restaurant with article groups', async () => {
      const tenantId = 'tenant-1';

      mockPrismaService.restaurant.findMany.mockResolvedValue([
        { id: 'r-1', name: 'BNA Besagash' },
      ]);

      mockPrismaService.expense.groupBy.mockResolvedValue([
        { restaurantId: 'r-1', articleId: 'a-1', _sum: { amount: { toString: () => '1000.00' } } },
        { restaurantId: 'r-1', articleId: 'a-2', _sum: { amount: { toString: () => '500.00' } } },
      ]);

      mockPrismaService.ddsArticle.findMany.mockResolvedValue([
        { id: 'a-1', group: { name: 'Продукты' } },
        { id: 'a-2', group: { name: 'Транспорт' } },
      ]);

      const result = await service.getReportDds(tenantId, '2026-04-01', '2026-04-30');

      expect(result.restaurants).toHaveLength(1);
      expect(result.restaurants[0].restaurantName).toBe('BNA Besagash');
      expect(result.restaurants[0].totalExpense).toBe(1500);
      expect(result.restaurants[0].groups).toHaveLength(2);
      expect(result.totals.totalExpense).toBe(1500);
      expect(result.period).toEqual({ from: '2026-04-01', to: '2026-04-30' });
    });
  });

  describe('getReportCompanyExpenses', () => {
    it('should return HQ expenses with source and share percentage', async () => {
      const tenantId = 'tenant-1';

      mockPrismaService.expense.groupBy.mockResolvedValue([
        { articleId: 'a-1', source: 'ONE_C', _sum: { amount: { toString: () => '3000.00' } } },
        { articleId: 'a-2', source: 'IIKO', _sum: { amount: { toString: () => '1000.00' } } },
      ]);

      mockPrismaService.ddsArticle.findMany.mockResolvedValue([
        { id: 'a-1', name: 'Аренда ГО' },
        { id: 'a-2', name: 'Канцелярия' },
      ]);

      const result = await service.getReportCompanyExpenses(tenantId, '2026-04-01', '2026-04-30');

      expect(result.categories).toHaveLength(2);
      expect(result.categories[0].source).toBe('ONE_C');
      expect(result.categories[0].totalAmount).toBe(3000);
      expect(result.categories[0].share).toBe(75); // 3000/4000 * 100
      expect(result.totals.totalAmount).toBe(4000);
    });
  });

  describe('getReportKitchen', () => {
    it('should return purchases and shipments grouped by restaurant', async () => {
      const tenantId = 'tenant-1';

      mockPrismaService.kitchenPurchase.findMany.mockResolvedValue([
        { date: new Date('2026-04-01'), productName: 'Бакалея', amount: { toString: () => '5000.00' } },
      ]);

      mockPrismaService.restaurant.findMany.mockResolvedValue([
        { id: 'r-1', name: 'BNA Besagash' },
      ]);

      mockPrismaService.kitchenShipment.groupBy.mockResolvedValue([
        { restaurantId: 'r-1', _sum: { amount: { toString: () => '3000.00' } }, _count: { id: 2 } },
      ]);

      const result = await service.getReportKitchen(tenantId, '2026-04-01', '2026-04-30');

      expect(result.purchases).toHaveLength(1);
      expect(result.purchases[0].description).toBe('Бакалея');
      expect(result.purchases[0].amount).toBe(5000);
      expect(result.shipments).toHaveLength(1);
      expect(result.shipments[0].restaurantName).toBe('BNA Besagash');
      expect(result.shipments[0].totalAmount).toBe(3000);
      expect(result.shipments[0].items).toBe(2);
      expect(result.totals).toEqual({ totalPurchases: 5000, totalShipments: 3000 });
    });
  });

  describe('getReportTrends', () => {
    it('should return daily points with revenue, expenses, and netProfit', async () => {
      const tenantId = 'tenant-1';

      mockPrismaService.restaurant.findMany.mockResolvedValue([
        { id: 'r-1', name: 'BNA Besagash' },
      ]);

      mockPrismaService.financialSnapshot.groupBy.mockResolvedValue([
        { date: new Date('2026-04-01'), _sum: { revenue: { toString: () => '10000.00' } } },
        { date: new Date('2026-04-02'), _sum: { revenue: { toString: () => '12000.00' } } },
      ]);

      mockPrismaService.expense.groupBy.mockResolvedValue([
        { date: new Date('2026-04-01'), _sum: { amount: { toString: () => '4000.00' } } },
        { date: new Date('2026-04-02'), _sum: { amount: { toString: () => '5000.00' } } },
      ]);

      const result = await service.getReportTrends(tenantId, '2026-04-01', '2026-04-02');

      expect(result.points).toHaveLength(2);
      expect(result.points[0]).toMatchObject({
        revenue: 10000,
        expenses: 4000,
        netProfit: 6000,
      });
      expect(result.points[1]).toMatchObject({
        revenue: 12000,
        expenses: 5000,
        netProfit: 7000,
      });
      expect(result.summary.avgDailyRevenue).toBe(11000); // (10000+12000)/2
      expect(result.summary.avgDailyExpenses).toBe(4500);  // (4000+5000)/2
      expect(result.summary.totalNetProfit).toBe(13000);   // 22000-9000
    });

    it('should handle empty data gracefully', async () => {
      const tenantId = 'tenant-1';

      mockPrismaService.restaurant.findMany.mockResolvedValue([]);
      mockPrismaService.financialSnapshot.groupBy.mockResolvedValue([]);
      mockPrismaService.expense.groupBy.mockResolvedValue([]);

      const result = await service.getReportTrends(tenantId, '2026-04-01', '2026-04-02');

      expect(result.points).toHaveLength(0);
      expect(result.summary.avgDailyRevenue).toBe(0);
      expect(result.summary.avgDailyExpenses).toBe(0);
      expect(result.summary.totalNetProfit).toBe(0);
    });
  });
});
