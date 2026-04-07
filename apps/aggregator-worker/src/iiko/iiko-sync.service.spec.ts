import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { IikoSyncService } from './iiko-sync.service';
import { IikoAuthService } from './iiko-auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { OneCyncService } from '../onec/onec-sync.service';
import { AllocationService } from '../allocation/allocation.service';
import { SchedulerService } from '../scheduler/scheduler.service';

describe('IikoSyncService', () => {
  let service: IikoSyncService;
  let prisma: PrismaService;
  let iikoAuth: IikoAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        IikoSyncService,
        {
          provide: IikoAuthService,
          useValue: {
            getAccessToken: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            brand: {
              upsert: jest.fn(),
              findUnique: jest.fn(),
            },
            restaurant: {
              upsert: jest.fn(),
              findMany: jest.fn(),
            },
            financialSnapshot: {
              upsert: jest.fn(),
              update: jest.fn(),
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
            cashDiscrepancy: {
              upsert: jest.fn(),
            },
            company: {
              upsert: jest.fn(),
            },
            syncLog: {
              create: jest.fn(),
            },
            tenant: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
          },
        },
      ],
    }).compile();

    service = module.get<IikoSyncService>(IikoSyncService);
    prisma = module.get<PrismaService>(PrismaService);
    iikoAuth = module.get<IikoAuthService>(IikoAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncOrganizations', () => {
    it('should be defined', () => {
      expect(typeof service.syncOrganizations).toBe('function');
    });
  });

  describe('syncRevenue', () => {
    it('should be defined', () => {
      expect(typeof service.syncRevenue).toBe('function');
    });

    it('should skip sync when no restaurants found', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-02');

      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([]);

      await service.syncRevenue(dateFrom, dateTo);

      expect(iikoAuth.getAccessToken as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('syncExpenses', () => {
    it('should be defined', () => {
      expect(typeof service.syncExpenses).toBe('function');
    });

    it('should skip sync when no restaurants found', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-02');

      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([]);

      await service.syncExpenses(dateFrom, dateTo);

      expect(iikoAuth.getAccessToken as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('syncCashDiscrepancies', () => {
    it('should be defined', () => {
      expect(typeof service.syncCashDiscrepancies).toBe('function');
    });

    it('should skip sync when no restaurants found', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-02');

      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([]);

      await service.syncCashDiscrepancies(dateFrom, dateTo);

      // Should not attempt to get token when no restaurants
      expect(iikoAuth.getAccessToken as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('syncNomenclature', () => {
    // XML with two groups: fast-xml-parser wraps repeated elements as array
    const mockXml =
      '<groupDtoList><group><id>uuid-1</id><name>Products</name></group><group><id>uuid-2</id><name>Rent</name></group></groupDtoList>';

    beforeEach(() => {
      jest
        .spyOn(service as any, 'getTenantId')
        .mockResolvedValue('test-tenant');
    });

    it('should upsert DdsArticleGroup from parsed XML response', async () => {
      (iikoAuth.getAccessToken as jest.Mock).mockResolvedValue('test-token');
      // Bypass real makeRequest; return pre-built parsed object so xmlParser.parse produces predictable output
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue(mockXml);
      // Spy on xmlParser.parse to return a structure that normalizeArray can handle
      // groupDtoList must be an array directly (normalizeArray wraps non-arrays)
      jest.spyOn((service as any).xmlParser, 'parse').mockReturnValue({
        groupDtoList: [
          { id: 'uuid-1', name: 'Products' },
          { id: 'uuid-2', name: 'Rent' },
        ],
      });
      (prisma.ddsArticleGroup.upsert as jest.Mock).mockResolvedValue({});
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await service.syncNomenclature();

      expect(prisma.ddsArticleGroup.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.ddsArticleGroup.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId_code: { tenantId: 'test-tenant', code: 'uuid-1' } },
          update: { name: 'Products' },
          create: { tenantId: 'test-tenant', code: 'uuid-1', name: 'Products' },
        }),
      );
    });

    it('should log SUCCESS after nomenclature sync', async () => {
      (iikoAuth.getAccessToken as jest.Mock).mockResolvedValue('test-token');
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue(mockXml);
      jest.spyOn((service as any).xmlParser, 'parse').mockReturnValue({
        groupDtoList: [{ id: 'uuid-1', name: 'Products' }],
      });
      (prisma.ddsArticleGroup.upsert as jest.Mock).mockResolvedValue({});
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await service.syncNomenclature();

      expect(prisma.syncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            system: 'IIKO',
            status: 'SUCCESS',
          }),
        }),
      );
    });

    it('should log ERROR and throw when API call fails', async () => {
      const apiError = new Error('Connection refused');
      (iikoAuth.getAccessToken as jest.Mock).mockRejectedValue(apiError);
      (prisma.syncLog.create as jest.Mock).mockResolvedValue({});

      await expect(service.syncNomenclature()).rejects.toThrow(
        'Connection refused',
      );

      expect(prisma.syncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            system: 'IIKO',
            status: 'ERROR',
          }),
        }),
      );
    });
  });

  describe('SchedulerService syncNomenclature', () => {
    it('should call iikoSync.syncNomenclature when syncNomenclature cron fires', async () => {
      const mockIikoSync = {
        syncNomenclature: jest.fn().mockResolvedValue(undefined),
        syncOrganizations: jest.fn(),
        syncRevenue: jest.fn(),
        syncExpenses: jest.fn(),
        syncCashDiscrepancies: jest.fn(),
        syncKitchenShipments: jest.fn(),
      };

      const mockOneCync = {
        syncExpenses: jest.fn(),
        syncKitchenPurchases: jest.fn(),
        syncKitchenIncome: jest.fn(),
      };

      const mockAllocation = {
        runAllocation: jest.fn(),
      };

      const schedulerModule = await Test.createTestingModule({
        providers: [
          SchedulerService,
          { provide: IikoSyncService, useValue: mockIikoSync },
          { provide: OneCyncService, useValue: mockOneCync },
          { provide: AllocationService, useValue: mockAllocation },
        ],
      }).compile();

      const scheduler = schedulerModule.get<SchedulerService>(SchedulerService);
      await scheduler.syncNomenclature();

      expect(mockIikoSync.syncNomenclature).toHaveBeenCalledTimes(1);
    });
  });
});
