import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AlertService } from './alert.service';
import { PrismaService } from '../prisma/prisma.service';

// Redis mock functions — accessible to all tests
const redisMock = {
  get: jest.fn(),
  set: jest.fn(),
  quit: jest.fn().mockResolvedValue('OK'),
};

// Mock ioredis before module import — returns the same mock object every time
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => redisMock);
});

const mockAxiosResponse = {
  data: {},
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as any,
};

describe('AlertService', () => {
  let service: AlertService;
  let prisma: jest.Mocked<PrismaService>;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        {
          provide: PrismaService,
          useValue: {
            syncLog: { findFirst: jest.fn() },
            restaurant: { findMany: jest.fn() },
            financialSnapshot: {
              findFirst: jest.fn(),
              aggregate: jest.fn(),
            },
            expense: { findMany: jest.fn() },
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                API_GATEWAY_URL: 'http://gateway:3000',
                INTERNAL_API_SECRET: 'test-secret',
                LARGE_EXPENSE_THRESHOLD_KZT: '500000',
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AlertService>(AlertService);
    prisma = module.get(PrismaService);
    httpService = module.get(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── Test 1: checkSyncHealth fires SYNC_FAILURE when last success > 1 hour ago ───
  it('Test 1: checkSyncHealth fires SYNC_FAILURE when latest SUCCESS SyncLog is > 1 hour ago', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    (prisma.syncLog.findFirst as jest.Mock).mockResolvedValue({
      id: 'log-1',
      createdAt: twoHoursAgo,
    });
    redisMock.get.mockResolvedValue(null);
    redisMock.set.mockResolvedValue('OK');
    (httpService.post as jest.Mock).mockReturnValue(of(mockAxiosResponse));

    await service.checkSyncHealth('IIKO');

    expect(httpService.post).toHaveBeenCalledWith(
      'http://gateway:3000/internal/notifications/trigger',
      expect.objectContaining({ type: 'SYNC_FAILURE' }),
      expect.objectContaining({ headers: { 'x-internal-secret': 'test-secret' } }),
    );
  });

  // ─── Test 2: checkSyncHealth does NOT fire when last success < 1 hour ago ───
  it('Test 2: checkSyncHealth does NOT fire when latest SUCCESS SyncLog is < 1 hour ago', async () => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    (prisma.syncLog.findFirst as jest.Mock).mockResolvedValue({
      id: 'log-1',
      createdAt: thirtyMinutesAgo,
    });

    await service.checkSyncHealth('IIKO');

    expect(httpService.post).not.toHaveBeenCalled();
  });

  // ─── Test 3: checkRevenueThresholds fires LOW_REVENUE when today < 70% avg ───
  it('Test 3: checkRevenueThresholds fires LOW_REVENUE when today revenue < 70% of 30-day avg', async () => {
    (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([
      { id: 'r1', name: 'BNA Бесагаш' },
    ]);
    (prisma.financialSnapshot.findFirst as jest.Mock).mockResolvedValue({
      id: 'snap-1',
      revenue: '300000', // today revenue
    });
    (prisma.financialSnapshot.aggregate as jest.Mock).mockResolvedValue({
      _avg: { revenue: '600000' }, // avg = 600000, threshold = 420000, 300000 < 420000
    });
    redisMock.get.mockResolvedValue(null);
    redisMock.set.mockResolvedValue('OK');
    (httpService.post as jest.Mock).mockReturnValue(of(mockAxiosResponse));

    await service.checkRevenueThresholds();

    expect(httpService.post).toHaveBeenCalledWith(
      'http://gateway:3000/internal/notifications/trigger',
      expect.objectContaining({ type: 'LOW_REVENUE' }),
      expect.any(Object),
    );
  });

  // ─── Test 4: checkRevenueThresholds does NOT fire when revenue is above 70% ───
  it('Test 4: checkRevenueThresholds does NOT fire when revenue is above 70%', async () => {
    (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([
      { id: 'r1', name: 'BNA Бесагаш' },
    ]);
    (prisma.financialSnapshot.findFirst as jest.Mock).mockResolvedValue({
      id: 'snap-1',
      revenue: '550000', // above 70% of 600000 (threshold=420000)
    });
    (prisma.financialSnapshot.aggregate as jest.Mock).mockResolvedValue({
      _avg: { revenue: '600000' },
    });

    await service.checkRevenueThresholds();

    expect(httpService.post).not.toHaveBeenCalled();
  });

  // ─── Test 5: checkRevenueThresholds does NOT fire when no historical data ───
  it('Test 5: checkRevenueThresholds does NOT fire when no historical data (avg=0)', async () => {
    (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([
      { id: 'r1', name: 'BNA Бесагаш' },
    ]);
    (prisma.financialSnapshot.findFirst as jest.Mock).mockResolvedValue({
      id: 'snap-1',
      revenue: '100000',
    });
    (prisma.financialSnapshot.aggregate as jest.Mock).mockResolvedValue({
      _avg: { revenue: null }, // no history
    });

    await service.checkRevenueThresholds();

    expect(httpService.post).not.toHaveBeenCalled();
  });

  // ─── Test 6: checkLargeExpenses fires LARGE_EXPENSE for expenses > threshold ───
  it('Test 6: checkLargeExpenses fires LARGE_EXPENSE for expenses > threshold', async () => {
    (prisma.expense.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'exp-1',
        amount: '750000',
        restaurant: { name: 'BNA Бесагаш' },
        article: { name: 'Аренда' },
      },
    ]);
    redisMock.get.mockResolvedValue(null);
    redisMock.set.mockResolvedValue('OK');
    (httpService.post as jest.Mock).mockReturnValue(of(mockAxiosResponse));

    await service.checkLargeExpenses(new Date(Date.now() - 60 * 60 * 1000));

    expect(httpService.post).toHaveBeenCalledWith(
      'http://gateway:3000/internal/notifications/trigger',
      expect.objectContaining({ type: 'LARGE_EXPENSE' }),
      expect.any(Object),
    );
  });

  // ─── Test 7: checkLargeExpenses does NOT fire for expenses <= threshold ───
  it('Test 7: checkLargeExpenses does NOT fire for expenses <= threshold', async () => {
    // findMany returns empty because Prisma where clause filters out small expenses
    (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);

    await service.checkLargeExpenses(new Date(Date.now() - 60 * 60 * 1000));

    expect(httpService.post).not.toHaveBeenCalled();
  });

  // ─── Test 8: shouldFireAlert returns false when Redis key exists (cooldown) ───
  it('Test 8: shouldFireAlert returns false when Redis key exists (cooldown active)', async () => {
    redisMock.get.mockResolvedValue('1');

    const result = await service.shouldFireAlert('alert:SYNC_FAILURE:IIKO');

    expect(result).toBe(false);
    expect(redisMock.set).not.toHaveBeenCalled();
  });

  // ─── Test 9: shouldFireAlert returns true and sets Redis key when no cooldown ───
  it('Test 9: shouldFireAlert returns true and sets Redis key when no cooldown', async () => {
    redisMock.get.mockResolvedValue(null);
    redisMock.set.mockResolvedValue('OK');

    const result = await service.shouldFireAlert('alert:SYNC_FAILURE:IIKO');

    expect(result).toBe(true);
    expect(redisMock.set).toHaveBeenCalledWith(
      'alert:SYNC_FAILURE:IIKO',
      '1',
      'PX',
      4 * 60 * 60 * 1000,
    );
  });

  // ─── Test 10: fireAlert catches HTTP errors without throwing (fire-and-forget) ───
  it('Test 10: fireAlert catches HTTP errors without throwing (fire-and-forget)', async () => {
    // Trigger via checkSyncHealth path
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    (prisma.syncLog.findFirst as jest.Mock).mockResolvedValue({
      id: 'log-1',
      createdAt: twoHoursAgo,
    });
    redisMock.get.mockResolvedValue(null);
    redisMock.set.mockResolvedValue('OK');

    // Make HTTP throw
    (httpService.post as jest.Mock).mockReturnValue(
      throwError(() => new Error('Connection refused')),
    );

    // Should NOT throw
    await expect(service.checkSyncHealth('IIKO')).resolves.toBeUndefined();
  });
});
