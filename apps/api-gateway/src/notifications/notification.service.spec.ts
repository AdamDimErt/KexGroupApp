import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';

// Mock prisma client
const mockPrisma = {
  notificationToken: {
    upsert: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
  notificationLog: {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    updateMany: jest.fn().mockResolvedValue({}),
  },
  notificationPreference: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  user: {
    findMany: jest.fn().mockResolvedValue([]),
  },
};

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'FIREBASE_PROJECT_ID') return undefined; // dev mode
    if (key === 'INTERNAL_API_SECRET') return 'test-secret';
    return undefined;
  }),
};

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: 'PRISMA_CLIENT', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  // ─── Test 1: triggerLowRevenueAlert dispatches to OWNER + OPERATIONS_DIRECTOR ──
  describe('triggerLowRevenueAlert', () => {
    it('should call sendToRole for OWNER and OPERATIONS_DIRECTOR', async () => {
      const spy = jest.spyOn(service, 'sendToRole').mockResolvedValue();

      await service.triggerLowRevenueAlert('BNA Бесагаш', 100000, 150000);

      const calls = spy.mock.calls.map((c) => c[0]);
      expect(calls).toContain('OWNER');
      expect(calls).toContain('OPERATIONS_DIRECTOR');
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  // ─── Test 2: triggerLargeExpenseAlert dispatches to OWNER + FINANCE_DIRECTOR ──
  describe('triggerLargeExpenseAlert', () => {
    it('should call sendToRole for OWNER and FINANCE_DIRECTOR', async () => {
      const spy = jest.spyOn(service, 'sendToRole').mockResolvedValue();

      await service.triggerLargeExpenseAlert('DNA Аксай', 'Аренда', 200000);

      const calls = spy.mock.calls.map((c) => c[0]);
      expect(calls).toContain('OWNER');
      expect(calls).toContain('FINANCE_DIRECTOR');
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  // ─── Test 3: triggerSyncFailureAlert dispatches to OWNER (not ADMIN) ──────────
  describe('triggerSyncFailureAlert', () => {
    it('should call sendToRole with OWNER, not ADMIN', async () => {
      const spy = jest.spyOn(service, 'sendToRole').mockResolvedValue();

      await service.triggerSyncFailureAlert('IIKO', 'Connection timeout');

      expect(spy).toHaveBeenCalledWith('OWNER', 'SYNC_FAILURE', expect.any(Object));
      const calls = spy.mock.calls.map((c) => c[0]);
      expect(calls).not.toContain('ADMIN');
    });
  });

  // ─── Test 4: sendToUser skips when preference disabled ───────────────────────
  describe('sendToUser - preference check', () => {
    it('should skip sending when notification preference is disabled', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        id: 'pref-1',
        userId: 'user-1',
        type: 'LOW_REVENUE',
        enabled: false,
      });

      await service.sendToUser('user-1', 'LOW_REVENUE', {
        title: 'Test',
        body: 'Test body',
      });

      expect(mockPrisma.notificationToken.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── Test 5: sendToUser proceeds when no preference row exists (default enabled) ──
  describe('sendToUser - default enabled', () => {
    it('should proceed normally when no preference row exists', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.notificationToken.findMany.mockResolvedValue([]);

      await service.sendToUser('user-1', 'LOW_REVENUE', {
        title: 'Test',
        body: 'Test body',
      });

      expect(mockPrisma.notificationToken.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true },
      });
    });
  });

  // ─── Test 6: handleInternalTrigger routes SYNC_FAILURE ───────────────────────
  describe('handleInternalTrigger', () => {
    it('should route SYNC_FAILURE to triggerSyncFailureAlert', async () => {
      const spy = jest
        .spyOn(service, 'triggerSyncFailureAlert')
        .mockResolvedValue();

      await service.handleInternalTrigger('SYNC_FAILURE', {
        system: 'IIKO',
        error: 'Connection timeout',
      });

      expect(spy).toHaveBeenCalledWith('IIKO', 'Connection timeout');
    });

    it('should route LOW_REVENUE to triggerLowRevenueAlert', async () => {
      const spy = jest
        .spyOn(service, 'triggerLowRevenueAlert')
        .mockResolvedValue();

      await service.handleInternalTrigger('LOW_REVENUE', {
        restaurantName: 'BNA',
        amount: 50000,
        threshold: 100000,
      });

      expect(spy).toHaveBeenCalledWith('BNA', 50000, 100000);
    });

    it('should route LARGE_EXPENSE to triggerLargeExpenseAlert', async () => {
      const spy = jest
        .spyOn(service, 'triggerLargeExpenseAlert')
        .mockResolvedValue();

      await service.handleInternalTrigger('LARGE_EXPENSE', {
        restaurantName: 'DNA',
        articleName: 'Аренда',
        amount: 300000,
      });

      expect(spy).toHaveBeenCalledWith('DNA', 'Аренда', 300000);
    });
  });

  // ─── Test 7: getUserPreferences returns all 3 types with defaults ─────────────
  describe('getUserPreferences', () => {
    it('should return all 3 types with defaults when no rows exist', async () => {
      mockPrisma.notificationPreference.findMany.mockResolvedValue([]);

      const prefs = await service.getUserPreferences('user-1');

      expect(prefs).toHaveLength(3);
      expect(prefs.map((p) => p.type)).toEqual(
        expect.arrayContaining(['SYNC_FAILURE', 'LOW_REVENUE', 'LARGE_EXPENSE']),
      );
      expect(prefs.every((p) => p.enabled === true)).toBe(true);
    });
  });

  // ─── Test 8: updatePreference calls upsert with correct params ───────────────
  describe('updatePreference', () => {
    it('should call upsert with correct params', async () => {
      mockPrisma.notificationPreference.upsert.mockResolvedValue({});

      await service.updatePreference('user-1', 'LOW_REVENUE', false);

      expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId_type: { userId: 'user-1', type: 'LOW_REVENUE' } },
        update: { enabled: false },
        create: { userId: 'user-1', type: 'LOW_REVENUE', enabled: false },
      });
    });
  });
});
