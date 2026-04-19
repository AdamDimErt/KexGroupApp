import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
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
      findMany: jest.fn(),
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
    paymentType: {
      findMany: jest.fn(),
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
      // getRestaurantSummary uses $queryRaw 3 times: revenue, directExpenses, allocatedExpenses
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ restaurantId: 'restaurant-1', sum_revenue: 2500 }])
        .mockResolvedValueOnce([{ restaurantId: 'restaurant-1', sum_amount: 400 }])
        .mockResolvedValueOnce([{ restaurantId: 'restaurant-1', sum_allocatedAmount: 250 }]);

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

      // getArticleSummary uses $queryRaw for expenses grouped by articleId
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        { articleId: 'article-1', sum_amount: 500 },
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
      // getDashboardSummary uses $queryRaw for revenueByRestaurant
      mockPrismaService.$queryRaw.mockResolvedValue([]);
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
      // getDashboardSummary uses $queryRaw for revenueByRestaurant
      mockPrismaService.$queryRaw.mockResolvedValue([]);
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

      // getReportDds uses $queryRaw for expenseRows grouped by restaurantId + articleId
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        { restaurantId: 'r-1', articleId: 'a-1', sum_amount: 1000 },
        { restaurantId: 'r-1', articleId: 'a-2', sum_amount: 500 },
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

      // getReportCompanyExpenses uses $queryRaw for HQ expenses
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        { articleId: 'a-1', source: 'ONE_C', sum_amount: 3000 },
        { articleId: 'a-2', source: 'IIKO', sum_amount: 1000 },
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

      // getReportKitchen uses $queryRaw for shipments grouped by restaurantId
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        { restaurantId: 'r-1', sum_amount: 3000, count_id: 2 },
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

      // getReportTrends uses $queryRaw twice: revenue rows and expense rows
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([
          { date: new Date('2026-04-01T00:00:00+05:00'), sum_revenue: 10000 },
          { date: new Date('2026-04-02T00:00:00+05:00'), sum_revenue: 12000 },
        ])
        .mockResolvedValueOnce([
          { date: new Date('2026-04-01T00:00:00+05:00'), sum_amount: 4000 },
          { date: new Date('2026-04-02T00:00:00+05:00'), sum_amount: 5000 },
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
      // getReportTrends uses $queryRaw twice even with empty restaurants
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getReportTrends(tenantId, '2026-04-01', '2026-04-02');

      expect(result.points).toHaveLength(0);
      expect(result.summary.avgDailyRevenue).toBe(0);
      expect(result.summary.avgDailyExpenses).toBe(0);
      expect(result.summary.totalNetProfit).toBe(0);
    });
  });

  describe('getCompanyRevenueAggregated', () => {
    const tenantId = 'tenant-1';
    const dateFrom = '2026-04-01';
    const dateTo = '2026-04-02';
    const periodType = 'custom';

    it('happy path — returns aggregated revenue, payment breakdown, daily chart, top restaurants', async () => {
      mockPrismaService.restaurant.findMany.mockResolvedValue([
        { id: 'r-1', name: 'BNA Besagash' },
        { id: 'r-2', name: 'BNA Aksay' },
      ]);

      // $queryRaw call sequence:
      // 1. snapshotRows (per restaurant per day)
      // 2. snapshotIdRows (IDs for SnapshotPayment join)
      // 3. paymentRows (SnapshotPayment grouped by paymentTypeId)
      // 4. directExpensesAgg
      // 5. distributedAgg
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([
          { restaurantId: 'r-1', date: new Date('2026-04-01T00:00:00+05:00'), sum_revenue: 10000, sum_directExpenses: 0, sum_salesCount: 50 },
          { restaurantId: 'r-2', date: new Date('2026-04-01T00:00:00+05:00'), sum_revenue: 5000,  sum_directExpenses: 0, sum_salesCount: 30 },
          { restaurantId: 'r-1', date: new Date('2026-04-02T00:00:00+05:00'), sum_revenue: 12000, sum_directExpenses: 0, sum_salesCount: 60 },
        ])
        .mockResolvedValueOnce([{ id: 'snap-1' }, { id: 'snap-2' }, { id: 'snap-3' }])
        .mockResolvedValueOnce([
          { paymentTypeId: 'pt-1', sum_amount: 20000 },
          { paymentTypeId: 'pt-2', sum_amount: 7000 },
        ])
        .mockResolvedValueOnce([{ sum_amount: 3000 }])
        .mockResolvedValueOnce([{ sum_amount: 1500 }]);

      mockPrismaService.paymentType.findMany.mockResolvedValue([
        { id: 'pt-1', name: 'Наличные', iikoCode: 'CASH' },
        { id: 'pt-2', name: 'Каспи банк', iikoCode: 'KASPI' },
      ]);

      const result = await service.getCompanyRevenueAggregated(
        tenantId, periodType, dateFrom, dateTo,
      );

      expect(result.tenantId).toBe(tenantId);
      expect(result.totalRevenue).toBe(27000); // 10000 + 5000 + 12000
      expect(result.totalDirectExpenses).toBe(3000);
      expect(result.totalDistributedExpenses).toBe(1500);
      expect(result.totalExpenses).toBe(4500);
      expect(result.financialResult).toBe(22500); // 27000 - 4500

      // Payment breakdown sorted by amount desc
      expect(result.paymentBreakdown).toHaveLength(2);
      expect(result.paymentBreakdown[0].iikoCode).toBe('CASH');
      expect(result.paymentBreakdown[0].amount).toBe(20000);
      expect(result.paymentBreakdown[0].percent).toBeCloseTo(74.07, 1);
      expect(result.paymentBreakdown[1].iikoCode).toBe('KASPI');

      // Daily revenue chart: 2 days (Apr 1 and Apr 2)
      expect(result.dailyRevenue).toHaveLength(2);
      expect(result.dailyRevenue[0].date).toBe('2026-04-01');
      expect(result.dailyRevenue[0].revenue).toBe(15000); // 10000 + 5000
      expect(result.dailyRevenue[0].transactions).toBe(80); // 50 + 30
      expect(result.dailyRevenue[1].date).toBe('2026-04-02');
      expect(result.dailyRevenue[1].revenue).toBe(12000);

      // Top restaurants: r-1 has 22000, r-2 has 5000
      expect(result.topRestaurants).toHaveLength(2);
      expect(result.topRestaurants[0].id).toBe('r-1');
      expect(result.topRestaurants[0].revenue).toBe(22000);
      expect(result.topRestaurants[0].name).toBe('BNA Besagash');
      expect(result.topRestaurants[0].share).toBeCloseTo(81.48, 1);
    });

    it('empty data — returns zeroes and empty arrays when no restaurants found', async () => {
      mockPrismaService.restaurant.findMany.mockResolvedValue([]);

      const result = await service.getCompanyRevenueAggregated(
        tenantId, periodType, dateFrom, dateTo,
      );

      expect(result.totalRevenue).toBe(0);
      expect(result.totalExpenses).toBe(0);
      expect(result.financialResult).toBe(0);
      expect(result.paymentBreakdown).toHaveLength(0);
      expect(result.dailyRevenue).toHaveLength(0);
      expect(result.topRestaurants).toHaveLength(0);
    });

    it('OPERATIONS_DIRECTOR filtering — passes restaurantFilter to restaurant query', async () => {
      const assignedIds = ['r-1'];

      // Return only the assigned restaurant
      mockPrismaService.restaurant.findMany.mockResolvedValue([
        { id: 'r-1', name: 'BNA Besagash' },
      ]);

      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([
          { restaurantId: 'r-1', date: new Date('2026-04-01T00:00:00+05:00'), sum_revenue: 8000, sum_directExpenses: 0, sum_salesCount: 40 },
        ])
        .mockResolvedValueOnce([{ id: 'snap-1' }])
        .mockResolvedValueOnce([]) // no SnapshotPayment rows
        .mockResolvedValueOnce([{ sum_amount: 1000 }])
        .mockResolvedValueOnce([{ sum_amount: 500 }]);

      const result = await service.getCompanyRevenueAggregated(
        tenantId, periodType, dateFrom, dateTo, assignedIds,
      );

      // Confirm restaurant.findMany was called with id filter
      expect(mockPrismaService.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: assignedIds },
          }),
        }),
      );

      expect(result.totalRevenue).toBe(8000);
      expect(result.topRestaurants).toHaveLength(1);
      expect(result.topRestaurants[0].id).toBe('r-1');
      expect(result.topRestaurants[0].share).toBe(100);
    });

    // ── bug_007 RBAC fail-closed tests ─────────────────────────────────────

    it('bug_007: OPS_DIRECTOR with empty restaurantFilter ([]) — Prisma called with id:{in:[]} and returns empty', async () => {
      // Empty array = no assigned restaurants. Service must call findMany with { id: { in: [] } }
      // which causes the early-return path (restaurantRows.length === 0 → zeroed DTO).
      mockPrismaService.restaurant.findMany.mockResolvedValue([]);

      const result = await service.getCompanyRevenueAggregated(
        tenantId, periodType, dateFrom, dateTo,
        [], // explicit empty restaurantFilter
      );

      // Prisma must have received the id filter with an empty array
      expect(mockPrismaService.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: [] },
          }),
        }),
      );

      // Fail-closed: everything is zero, no data leaked
      expect(result.totalRevenue).toBe(0);
      expect(result.totalExpenses).toBe(0);
      expect(result.financialResult).toBe(0);
      expect(result.paymentBreakdown).toHaveLength(0);
      expect(result.dailyRevenue).toHaveLength(0);
      expect(result.topRestaurants).toHaveLength(0);
    });

    it('bug_007: OPS_DIRECTOR with 2 assigned restaurants — Prisma called with { id: { in: [r1, r2] } }', async () => {
      const assignedIds = ['r-1', 'r-2'];

      mockPrismaService.restaurant.findMany.mockResolvedValue([
        { id: 'r-1', name: 'BNA Besagash' },
        { id: 'r-2', name: 'BNA Aksay' },
      ]);

      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([
          { restaurantId: 'r-1', date: new Date('2026-04-01T00:00:00+05:00'), sum_revenue: 6000, sum_directExpenses: 0, sum_salesCount: 30 },
          { restaurantId: 'r-2', date: new Date('2026-04-01T00:00:00+05:00'), sum_revenue: 4000, sum_directExpenses: 0, sum_salesCount: 20 },
        ])
        .mockResolvedValueOnce([{ id: 'snap-1' }, { id: 'snap-2' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ sum_amount: 500 }])
        .mockResolvedValueOnce([{ sum_amount: 200 }]);

      const result = await service.getCompanyRevenueAggregated(
        tenantId, periodType, dateFrom, dateTo, assignedIds,
      );

      expect(mockPrismaService.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['r-1', 'r-2'] },
          }),
        }),
      );

      expect(result.totalRevenue).toBe(10000);
      expect(result.topRestaurants).toHaveLength(2);
    });

    it('bug_007: OWNER (restaurantFilter=undefined) — Prisma called WITHOUT id filter', async () => {
      mockPrismaService.restaurant.findMany.mockResolvedValue([
        { id: 'r-1', name: 'BNA Besagash' },
      ]);

      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([
          { restaurantId: 'r-1', date: new Date('2026-04-01T00:00:00+05:00'), sum_revenue: 9000, sum_directExpenses: 0, sum_salesCount: 45 },
        ])
        .mockResolvedValueOnce([{ id: 'snap-1' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ sum_amount: 0 }])
        .mockResolvedValueOnce([{ sum_amount: 0 }]);

      await service.getCompanyRevenueAggregated(
        tenantId, periodType, dateFrom, dateTo,
        undefined, // OWNER: no filter
      );

      // restaurant.findMany must NOT contain an id filter
      const call = mockPrismaService.restaurant.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(call.where).not.toHaveProperty('id');
    });
  });

  // ── bug_007: getDashboardSummary RBAC fail-closed ──────────────────────────

  describe('getDashboardSummary — bug_007 RBAC fail-closed', () => {
    const tenantId = 'tenant-1';
    const dateFrom = '2026-04-01';
    const dateTo = '2026-04-01';

    it('OPS_DIRECTOR with empty restaurantFilter ([]) — restaurant.findMany called with id:{in:[]}', async () => {
      mockPrismaService.brand.findMany.mockResolvedValue([]);
      mockPrismaService.restaurant.findMany.mockResolvedValue([]);
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockPrismaService.syncLog.aggregate.mockResolvedValue({ _max: { createdAt: null } });

      await service.getDashboardSummary(tenantId, 'today', dateFrom, dateTo, []);

      expect(mockPrismaService.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: [] },
          }),
        }),
      );
    });

    it('OWNER (restaurantFilter=undefined) — restaurant.findMany called WITHOUT id filter', async () => {
      mockPrismaService.brand.findMany.mockResolvedValue([]);
      mockPrismaService.restaurant.findMany.mockResolvedValue([]);
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockPrismaService.syncLog.aggregate.mockResolvedValue({ _max: { createdAt: null } });

      await service.getDashboardSummary(tenantId, 'today', dateFrom, dateTo, undefined);

      const call = mockPrismaService.restaurant.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(call.where).not.toHaveProperty('id');
    });
  });
});
