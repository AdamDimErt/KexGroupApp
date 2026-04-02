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
});
