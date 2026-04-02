import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { IikoSyncService } from './iiko-sync.service';
import { IikoAuthService } from './iiko-auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { of } from 'rxjs';

describe('IikoSyncService', () => {
  let service: IikoSyncService;
  let httpService: HttpService;
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
          },
        },
      ],
    }).compile();

    service = module.get<IikoSyncService>(IikoSyncService);
    httpService = module.get<HttpService>(HttpService);
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
      expect(service.syncOrganizations).toBeDefined();
    });
  });

  describe('syncRevenue', () => {
    it('should be defined', () => {
      expect(service.syncRevenue).toBeDefined();
    });

    it('should skip sync when no restaurants found', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-02');

      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([]);

      await service.syncRevenue(dateFrom, dateTo);

      expect(iikoAuth.getAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('syncExpenses', () => {
    it('should be defined', () => {
      expect(service.syncExpenses).toBeDefined();
    });

    it('should skip sync when no restaurants found', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-02');

      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([]);

      await service.syncExpenses(dateFrom, dateTo);

      expect(iikoAuth.getAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('syncCashDiscrepancies', () => {
    it('should be defined', () => {
      expect(service.syncCashDiscrepancies).toBeDefined();
    });

    it('should skip sync when no restaurants found', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-02');

      (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([]);

      await service.syncCashDiscrepancies(dateFrom, dateTo);

      // Should not attempt to get token when no restaurants
      expect(iikoAuth.getAccessToken).not.toHaveBeenCalled();
    });
  });
});
