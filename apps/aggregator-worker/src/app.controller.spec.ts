import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IikoSyncService } from './iiko/iiko-sync.service';

describe('AppController', () => {
  let appController: AppController;
  let iikoSync: { [key: string]: jest.Mock };

  beforeEach(async () => {
    iikoSync = {
      syncOrganizations: jest.fn().mockResolvedValue(undefined),
      syncRevenue: jest.fn().mockResolvedValue(undefined),
      syncExpenses: jest.fn().mockResolvedValue(undefined),
      syncCashDiscrepancies: jest.fn().mockResolvedValue(undefined),
      syncDdsArticles: jest.fn().mockResolvedValue(undefined),
      syncDdsTransactions: jest.fn().mockResolvedValue(undefined),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: IikoSyncService,
          useValue: iikoSync,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('syncAll', () => {
    it('should call syncDdsArticles and syncDdsTransactions', async () => {
      const result = await appController.syncAll();

      expect(iikoSync.syncDdsArticles).toHaveBeenCalledTimes(1);
      expect(iikoSync.syncDdsTransactions).toHaveBeenCalledTimes(1);
      expect(result.results).toHaveProperty('ddsArticles', 'ok');
      expect(result.results).toHaveProperty('ddsTransactions', 'ok');
    });

    it('should call syncDdsArticles BEFORE syncDdsTransactions (ordering)', async () => {
      const callOrder: string[] = [];
      iikoSync.syncDdsArticles.mockImplementation(async () => { callOrder.push('ddsArticles'); });
      iikoSync.syncDdsTransactions.mockImplementation(async () => { callOrder.push('ddsTransactions'); });

      await appController.syncAll();

      const articlesIdx = callOrder.indexOf('ddsArticles');
      const transactionsIdx = callOrder.indexOf('ddsTransactions');
      expect(articlesIdx).toBeGreaterThanOrEqual(0);
      expect(transactionsIdx).toBeGreaterThanOrEqual(0);
      expect(articlesIdx).toBeLessThan(transactionsIdx);
    });
  });

  describe('syncDds', () => {
    it('should call syncDdsArticles then syncDdsTransactions and return results', async () => {
      const result = await appController.syncDds({});

      expect(iikoSync.syncDdsArticles).toHaveBeenCalledTimes(1);
      expect(iikoSync.syncDdsTransactions).toHaveBeenCalledTimes(1);
      expect(result.results).toHaveProperty('ddsArticles', 'ok');
      expect(result.results).toHaveProperty('ddsTransactions', 'ok');
      expect(result.status).toBe('completed');
    });
  });
});
