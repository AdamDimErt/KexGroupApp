import { Test, TestingModule } from '@nestjs/testing';
import { AllocationService } from './allocation.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AllocationService', () => {
  let service: AllocationService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllocationService,
        {
          provide: PrismaService,
          useValue: {
            expense: {
              findMany: jest.fn(),
            },
            restaurant: {
              findMany: jest.fn(),
            },
            costAllocation: {
              upsert: jest.fn().mockResolvedValue({}),
            },
            syncLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AllocationService>(AllocationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runAllocation', () => {
    it('should calculate cost allocation correctly', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');

      // Mock unallocated expenses
      const mockExpenses = [
        {
          id: 'expense-1',
          amount: 10000,
          article: {
            allocationType: 'DISTRIBUTED',
          },
        },
      ];

      // Mock restaurants and their revenues
      const mockRestaurants = [
        {
          id: 'restaurant-1',
          snapshots: [
            {
              revenue: 5000,
            },
            {
              revenue: 5000,
            },
          ],
        },
        {
          id: 'restaurant-2',
          snapshots: [
            {
              revenue: 5000,
            },
            {
              revenue: 5000,
            },
          ],
        },
      ];

      jest.spyOn(prisma.expense, 'findMany').mockResolvedValue(mockExpenses as any);
      jest.spyOn(prisma.restaurant, 'findMany').mockResolvedValue(mockRestaurants as any);

      await service.runAllocation(dateFrom, dateTo);

      // Each restaurant should receive 50% of the expense (5000 / 10000 = 0.5)
      expect(prisma.costAllocation.upsert).toHaveBeenCalledTimes(2);

      // Verify first allocation
      const firstCall = (prisma.costAllocation.upsert as jest.Mock).mock.calls[0];
      expect(firstCall[0].create.coefficient).toEqual('0.5');
      expect(firstCall[0].create.allocatedAmount).toEqual('5000');
    });

    it('should handle zero total revenue', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');

      const mockExpenses = [
        {
          id: 'expense-1',
          amount: 10000,
          article: {
            allocationType: 'DISTRIBUTED',
          },
        },
      ];

      // All restaurants have zero revenue
      const mockRestaurants = [
        {
          id: 'restaurant-1',
          snapshots: [],
        },
      ];

      jest.spyOn(prisma.expense, 'findMany').mockResolvedValue(mockExpenses as any);
      jest.spyOn(prisma.restaurant, 'findMany').mockResolvedValue(mockRestaurants as any);

      await service.runAllocation(dateFrom, dateTo);

      // Should log warning and not allocate
      expect(prisma.costAllocation.upsert).not.toHaveBeenCalled();
    });

    it('should handle no unallocated expenses', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');

      jest.spyOn(prisma.expense, 'findMany').mockResolvedValue([]);

      await service.runAllocation(dateFrom, dateTo);

      // Should log that no expenses found
      expect(prisma.costAllocation.upsert).not.toHaveBeenCalled();
    });

    it('should allocate correctly with multiple restaurants', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');

      const mockExpenses = [
        {
          id: 'expense-1',
          amount: 1000,
          article: {
            allocationType: 'DISTRIBUTED',
          },
        },
      ];

      const mockRestaurants = [
        {
          id: 'restaurant-1',
          snapshots: [{ revenue: 7000 }],
        },
        {
          id: 'restaurant-2',
          snapshots: [{ revenue: 3000 }],
        },
      ];

      jest.spyOn(prisma.expense, 'findMany').mockResolvedValue(mockExpenses as any);
      jest.spyOn(prisma.restaurant, 'findMany').mockResolvedValue(mockRestaurants as any);

      await service.runAllocation(dateFrom, dateTo);

      // Restaurant 1: 7000/10000 = 0.7 -> 700
      // Restaurant 2: 3000/10000 = 0.3 -> 300
      expect(prisma.costAllocation.upsert).toHaveBeenCalledTimes(2);

      const calls = (prisma.costAllocation.upsert as jest.Mock).mock.calls;
      expect(calls[0][0].create.coefficient).toEqual('0.7');
      expect(calls[0][0].create.allocatedAmount).toEqual('700');
      expect(calls[1][0].create.coefficient).toEqual('0.3');
      expect(calls[1][0].create.allocatedAmount).toEqual('300');
    });
  });
});
