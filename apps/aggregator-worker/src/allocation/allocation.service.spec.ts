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

      jest
        .spyOn(prisma.expense, 'findMany')
        .mockResolvedValue(mockExpenses as any);
      jest
        .spyOn(prisma.restaurant, 'findMany')
        .mockResolvedValue(mockRestaurants as any);

      await service.runAllocation(dateFrom, dateTo);

      // Each restaurant should receive 50% of the expense (5000 / 10000 = 0.5)
      const upsertMock = prisma.costAllocation.upsert as jest.Mock;
      expect(upsertMock).toHaveBeenCalledTimes(2);

      // Verify first allocation
      const firstCallArgs = upsertMock.mock.calls[0] as [
        {
          create: {
            coefficient: { toString(): string };
            allocatedAmount: { toString(): string };
          };
        },
      ];
      expect(firstCallArgs[0].create.coefficient.toString()).toEqual('0.5');
      expect(firstCallArgs[0].create.allocatedAmount.toString()).toEqual(
        '5000',
      );
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

      jest
        .spyOn(prisma.expense, 'findMany')
        .mockResolvedValue(mockExpenses as any);
      jest
        .spyOn(prisma.restaurant, 'findMany')
        .mockResolvedValue(mockRestaurants as any);

      await service.runAllocation(dateFrom, dateTo);

      // Should log warning and not allocate
      expect(prisma.costAllocation.upsert as jest.Mock).not.toHaveBeenCalled();
    });

    it('should handle no unallocated expenses', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');

      jest.spyOn(prisma.expense, 'findMany').mockResolvedValue([]);

      await service.runAllocation(dateFrom, dateTo);

      // Should log that no expenses found
      expect(prisma.costAllocation.upsert as jest.Mock).not.toHaveBeenCalled();
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

      jest
        .spyOn(prisma.expense, 'findMany')
        .mockResolvedValue(mockExpenses as any);
      jest
        .spyOn(prisma.restaurant, 'findMany')
        .mockResolvedValue(mockRestaurants as any);

      await service.runAllocation(dateFrom, dateTo);

      // Restaurant 1: 7000/10000 = 0.7 -> 700
      // Restaurant 2: 3000/10000 = 0.3 -> 300
      const upsertMock2 = prisma.costAllocation.upsert as jest.Mock;
      expect(upsertMock2).toHaveBeenCalledTimes(2);

      type UpsertArg = {
        create: {
          coefficient: { toString(): string };
          allocatedAmount: { toString(): string };
        };
      };
      const calls = upsertMock2.mock.calls as [UpsertArg][];
      expect(calls[0][0].create.coefficient.toString()).toEqual('0.7');
      expect(calls[0][0].create.allocatedAmount.toString()).toEqual('700');
      expect(calls[1][0].create.coefficient.toString()).toEqual('0.3');
      expect(calls[1][0].create.allocatedAmount.toString()).toEqual('300');
    });
  });
});
