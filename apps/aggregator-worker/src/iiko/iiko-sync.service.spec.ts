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
            getAccessToken: jest.fn().mockResolvedValue('test-token'),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            brand: {
              upsert: jest.fn().mockResolvedValue({ id: 'brand-1' }),
              findUnique: jest.fn().mockResolvedValue({ id: 'brand-1' }),
            },
            restaurant: {
              upsert: jest.fn().mockResolvedValue({ id: 'restaurant-1' }),
              findMany: jest.fn().mockResolvedValue([
                {
                  id: 'restaurant-1',
                  iikoId: 'iiko-1',
                  name: 'Test Restaurant',
                  brand: {
                    id: 'brand-1',
                    companyId: 'company-1',
                    company: {
                      id: 'company-1',
                    },
                  },
                },
              ]),
            },
            financialSnapshot: {
              upsert: jest.fn().mockResolvedValue({}),
              update: jest.fn().mockResolvedValue({}),
            },
            expense: {
              upsert: jest.fn().mockResolvedValue({}),
            },
            ddsArticle: {
              findFirst: jest.fn().mockResolvedValue({ id: 'article-1' }),
              create: jest.fn().mockResolvedValue({ id: 'article-1' }),
            },
            ddsArticleGroup: {
              upsert: jest.fn().mockResolvedValue({ id: 'group-1' }),
            },
            cashDiscrepancy: {
              upsert: jest.fn().mockResolvedValue({}),
            },
            company: {
              upsert: jest.fn().mockResolvedValue({ id: 'company-1' }),
            },
            syncLog: {
              create: jest.fn().mockResolvedValue({}),
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncRevenue', () => {
    it('should sync revenue from iiko API', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-02');

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({
          data: {
            data: {
              rows: [
                {
                  rowLabels: ['cash', 'iiko-1'],
                  aggregates: [1000],
                },
              ],
            },
          },
        } as any)
      );

      await service.syncRevenue(dateFrom, dateTo);

      expect(prisma.financialSnapshot.upsert).toHaveBeenCalled();
    });

    it('should handle empty response', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-02');

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({
          data: {
            data: {
              rows: [],
            },
          },
        } as any)
      );

      await service.syncRevenue(dateFrom, dateTo);

      expect(prisma.syncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SUCCESS',
            recordsCount: 0,
          }),
        })
      );
    });
  });

  describe('syncExpenses', () => {
    it('should sync expenses from iiko API', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-02');

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({
          data: {
            data: [
              {
                restaurantId: 'iiko-1',
                articleId: 'article-1',
                amount: 500,
                date: '2024-01-01',
              },
            ],
          },
        } as any)
      );

      await service.syncExpenses(dateFrom, dateTo);

      expect(prisma.expense.upsert).toHaveBeenCalled();
    });
  });

  describe('syncCashDiscrepancies', () => {
    it('should sync cash discrepancies from iiko API', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-02');

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({
          data: {
            data: [
              {
                restaurantId: 'iiko-1',
                date: '2024-01-01',
                discrepancy: -100,
                expectedAmount: 5000,
              },
            ],
          },
        } as any)
      );

      await service.syncCashDiscrepancies(dateFrom, dateTo);

      expect(prisma.cashDiscrepancy.upsert).toHaveBeenCalled();
    });
  });
});
