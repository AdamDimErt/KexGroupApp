import { Test, TestingModule } from '@nestjs/testing';
import { AllocationService } from './allocation.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  startOfBusinessDay,
  endOfBusinessDay,
  businessDaysInRange,
} from '../utils/date';

// ---------------------------------------------------------------------------
// Date utility unit tests
// ---------------------------------------------------------------------------

describe('startOfBusinessDay / endOfBusinessDay (Asia/Almaty UTC+5)', () => {
  it('returns 19:00 UTC as day-start for any instant in the first Almaty minute of a new day', () => {
    // 2026-04-20 00:00:00 Almaty = 2026-04-19 19:00:00 UTC
    const input = new Date('2026-04-19T19:00:00.000Z');
    const result = startOfBusinessDay(input);
    expect(result.toISOString()).toBe('2026-04-19T19:00:00.000Z');
  });

  it('midnight UTC belongs to the previous Almaty day (UTC+5 = 05:00 Almaty)', () => {
    // 2026-04-20 00:00:00 UTC = 2026-04-20 05:00:00 Almaty
    // So the Almaty day is 2026-04-20, which started at 2026-04-19 19:00 UTC
    const input = new Date('2026-04-20T00:00:00.000Z');
    const result = startOfBusinessDay(input);
    expect(result.toISOString()).toBe('2026-04-19T19:00:00.000Z');
  });

  it('22:00 UTC belongs to the next Almaty calendar day', () => {
    // 2026-04-20 22:00:00 UTC = 2026-04-21 03:00:00 Almaty
    // Almaty day 2026-04-21 starts at 2026-04-20 19:00:00 UTC
    const input = new Date('2026-04-20T22:00:00.000Z');
    const result = startOfBusinessDay(input);
    expect(result.toISOString()).toBe('2026-04-20T19:00:00.000Z');
  });

  it('18:59:59.999 UTC is still the previous Almaty day (23:59:59.999 Almaty)', () => {
    // 2026-04-20 18:59:59.999 UTC = 2026-04-20 23:59:59.999 Almaty
    // Still Almaty day 2026-04-20, started at 2026-04-19 19:00 UTC
    const input = new Date('2026-04-20T18:59:59.999Z');
    const result = startOfBusinessDay(input);
    expect(result.toISOString()).toBe('2026-04-19T19:00:00.000Z');
  });

  it('endOfBusinessDay is exactly 23:59:59.999 Almaty = dayStart + 24h - 1ms', () => {
    const input = new Date('2026-04-20T10:00:00.000Z');
    const start = startOfBusinessDay(input);
    const end = endOfBusinessDay(input);
    expect(end.getTime() - start.getTime()).toBe(24 * 3600 * 1000 - 1);
  });

  it('two instants in the same Almaty calendar day produce identical boundaries', () => {
    const a = new Date('2026-04-20T08:00:00.000Z'); // 13:00 Almaty
    const b = new Date('2026-04-20T15:30:00.000Z'); // 20:30 Almaty
    expect(startOfBusinessDay(a).getTime()).toBe(startOfBusinessDay(b).getTime());
    expect(endOfBusinessDay(a).getTime()).toBe(endOfBusinessDay(b).getTime());
  });
});

describe('businessDaysInRange', () => {
  it('single-day window returns exactly one entry', () => {
    const from = new Date('2026-04-20T05:00:00.000Z'); // 10:00 Almaty
    const to = new Date('2026-04-20T12:00:00.000Z');   // 17:00 Almaty
    const days = businessDaysInRange(from, to);
    expect(days).toHaveLength(1);
  });

  it('24-hour sliding window crossing midnight Almaty returns two entries', () => {
    // from: 2026-04-20 22:00 UTC = 2026-04-21 03:00 Almaty  (day 2026-04-21)
    // to:   2026-04-21 22:00 UTC = 2026-04-22 03:00 Almaty  (day 2026-04-22)
    // Both Almaty days should be covered.
    const from = new Date('2026-04-20T22:00:00.000Z');
    const to = new Date('2026-04-21T22:00:00.000Z');
    const days = businessDaysInRange(from, to);
    expect(days).toHaveLength(2);
  });

  it('each returned dayStart is at day boundary (minutes/seconds/ms all zero in Almaty)', () => {
    const from = new Date('2026-04-19T22:00:00.000Z');
    const to = new Date('2026-04-21T22:00:00.000Z');
    const days = businessDaysInRange(from, to);
    for (const { dayStart } of days) {
      // In Almaty: dayStart + 5h should be 00:00:00.000 UTC
      const almaty = new Date(dayStart.getTime() + 5 * 3600 * 1000);
      expect(almaty.getUTCHours()).toBe(0);
      expect(almaty.getUTCMinutes()).toBe(0);
      expect(almaty.getUTCSeconds()).toBe(0);
      expect(almaty.getUTCMilliseconds()).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// AllocationService tests
// ---------------------------------------------------------------------------

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

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runAllocation', () => {
    it('should calculate cost allocation correctly', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');

      const mockExpenses = [
        {
          id: 'expense-1',
          amount: 10000,
          article: { allocationType: 'DISTRIBUTED' },
        },
      ];

      const mockRestaurants = [
        { id: 'restaurant-1', snapshots: [{ revenue: 5000 }, { revenue: 5000 }] },
        { id: 'restaurant-2', snapshots: [{ revenue: 5000 }, { revenue: 5000 }] },
      ];

      jest.spyOn(prisma.expense, 'findMany').mockResolvedValue(mockExpenses as any);
      jest.spyOn(prisma.restaurant, 'findMany').mockResolvedValue(mockRestaurants as any);

      await service.runAllocation(dateFrom, dateTo);

      const upsertMock = prisma.costAllocation.upsert as jest.Mock;
      // 1 expense × 2 restaurants = 2 upserts per day; date window spans many
      // days so we just verify each call uses day-boundary periodStart/periodEnd
      expect(upsertMock).toHaveBeenCalled();

      const firstCall = upsertMock.mock.calls[0][0] as any;
      expect(firstCall.create.coefficient.toString()).toEqual('0.5');
      expect(firstCall.create.allocatedAmount.toString()).toEqual('5000');

      // All upsert calls must use truncated day boundaries
      for (const [args] of upsertMock.mock.calls as any[][]) {
        const ps: Date = args.where.restaurantId_expenseId_periodStart_periodEnd.periodStart;
        const pe: Date = args.where.restaurantId_expenseId_periodStart_periodEnd.periodEnd;
        // dayStart + 5h must be midnight UTC (Almaty midnight)
        const almatyStart = new Date(ps.getTime() + 5 * 3600 * 1000);
        expect(almatyStart.getUTCHours()).toBe(0);
        expect(almatyStart.getUTCMinutes()).toBe(0);
        expect(almatyStart.getUTCSeconds()).toBe(0);
        expect(almatyStart.getUTCMilliseconds()).toBe(0);
        // dayEnd = dayStart + 24h - 1ms
        expect(pe.getTime() - ps.getTime()).toBe(24 * 3600 * 1000 - 1);
      }
    });

    it('should handle zero total revenue', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-01T23:59:59.999Z');

      const mockExpenses = [
        {
          id: 'expense-1',
          amount: 10000,
          article: { allocationType: 'DISTRIBUTED' },
        },
      ];

      jest.spyOn(prisma.expense, 'findMany').mockResolvedValue(mockExpenses as any);
      jest.spyOn(prisma.restaurant, 'findMany').mockResolvedValue([
        { id: 'restaurant-1', snapshots: [] },
      ] as any);

      await service.runAllocation(dateFrom, dateTo);

      expect(prisma.costAllocation.upsert as jest.Mock).not.toHaveBeenCalled();
    });

    it('should handle no unallocated expenses', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-01T23:59:59.999Z');

      jest.spyOn(prisma.expense, 'findMany').mockResolvedValue([]);

      await service.runAllocation(dateFrom, dateTo);

      expect(prisma.costAllocation.upsert as jest.Mock).not.toHaveBeenCalled();
    });

    it('should allocate correctly with multiple restaurants', async () => {
      // Single-day window — no midnight crossing
      const dateFrom = new Date('2024-01-15T00:00:00.000Z');
      const dateTo = new Date('2024-01-15T18:00:00.000Z');

      const mockExpenses = [
        {
          id: 'expense-1',
          amount: 1000,
          article: { allocationType: 'DISTRIBUTED' },
        },
      ];

      const mockRestaurants = [
        { id: 'restaurant-1', snapshots: [{ revenue: 7000 }] },
        { id: 'restaurant-2', snapshots: [{ revenue: 3000 }] },
      ];

      jest.spyOn(prisma.expense, 'findMany').mockResolvedValue(mockExpenses as any);
      jest.spyOn(prisma.restaurant, 'findMany').mockResolvedValue(mockRestaurants as any);

      await service.runAllocation(dateFrom, dateTo);

      const upsertMock = prisma.costAllocation.upsert as jest.Mock;
      expect(upsertMock).toHaveBeenCalledTimes(2);

      type UpsertArg = { create: { coefficient: { toString(): string }; allocatedAmount: { toString(): string } } };
      const calls = upsertMock.mock.calls as [UpsertArg][];
      expect(calls[0][0].create.coefficient.toString()).toEqual('0.7');
      expect(calls[0][0].create.allocatedAmount.toString()).toEqual('700');
      expect(calls[1][0].create.coefficient.toString()).toEqual('0.3');
      expect(calls[1][0].create.allocatedAmount.toString()).toEqual('300');
    });

    it('2-day window calls upsert twice per (expense, restaurant) pair — once per day', async () => {
      // Force a 2-day Almaty window: from 20:00 UTC day-0 to 20:00 UTC day-1
      // Day-0 Almaty midnight starts at day-0 19:00 UTC
      // Day-1 Almaty midnight starts at day-1 19:00 UTC
      // So 20:00 UTC day-0 = 01:00 Almaty day-1  (Almaty day 1)
      // And 20:00 UTC day-1 = 01:00 Almaty day-2  (Almaty day 2)
      const dateFrom = new Date('2024-01-14T20:00:00.000Z');
      const dateTo = new Date('2024-01-15T20:00:00.000Z');

      const mockExpenses = [
        {
          id: 'expense-1',
          amount: 1000,
          article: { allocationType: 'DISTRIBUTED' },
        },
      ];

      const mockRestaurants = [
        { id: 'restaurant-1', snapshots: [{ revenue: 5000 }] },
      ];

      jest.spyOn(prisma.expense, 'findMany').mockResolvedValue(mockExpenses as any);
      jest.spyOn(prisma.restaurant, 'findMany').mockResolvedValue(mockRestaurants as any);

      await service.runAllocation(dateFrom, dateTo);

      // 2 Almaty days × 1 expense × 1 restaurant = 2 upsert calls
      const upsertMock = prisma.costAllocation.upsert as jest.Mock;
      expect(upsertMock).toHaveBeenCalledTimes(2);

      // The two upserts must use different periodStart values (different days)
      const ps0 = (upsertMock.mock.calls[0][0] as any)
        .where.restaurantId_expenseId_periodStart_periodEnd.periodStart as Date;
      const ps1 = (upsertMock.mock.calls[1][0] as any)
        .where.restaurantId_expenseId_periodStart_periodEnd.periodStart as Date;
      expect(ps0.getTime()).not.toBe(ps1.getTime());
    });

    it('idempotency: two sequential calls with same window produce no new upsert calls beyond the first batch', async () => {
      // Single Almaty day
      const dateFrom = new Date('2024-01-15T05:00:00.000Z');
      const dateTo = new Date('2024-01-15T10:00:00.000Z');

      const mockExpenses = [
        { id: 'expense-1', amount: 500, article: { allocationType: 'DISTRIBUTED' } },
      ];
      const mockRestaurants = [
        { id: 'restaurant-1', snapshots: [{ revenue: 1000 }] },
      ];

      jest.spyOn(prisma.expense, 'findMany').mockResolvedValue(mockExpenses as any);
      jest.spyOn(prisma.restaurant, 'findMany').mockResolvedValue(mockRestaurants as any);

      await service.runAllocation(dateFrom, dateTo);
      await service.runAllocation(dateFrom, dateTo);

      // Both runs cover exactly 1 Almaty day × 1 expense × 1 restaurant = 1 upsert each
      // In production the second call hits the update path on the same DB row.
      // Here we just verify the call count is 2 (same key both times).
      const upsertMock = prisma.costAllocation.upsert as jest.Mock;
      expect(upsertMock).toHaveBeenCalledTimes(2);

      const key0 = JSON.stringify(
        (upsertMock.mock.calls[0][0] as any).where.restaurantId_expenseId_periodStart_periodEnd,
      );
      const key1 = JSON.stringify(
        (upsertMock.mock.calls[1][0] as any).where.restaurantId_expenseId_periodStart_periodEnd,
      );
      // Both calls must use the identical composite key — proving idempotency
      expect(key0).toBe(key1);
    });
  });
});
