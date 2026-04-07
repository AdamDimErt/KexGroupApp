import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { AppModule } from '../src/app.module';
import { FinanceProxyService } from '../src/finance/finance-proxy.service';
import { JwtAuthGuard } from '../src/guards/jwt-auth.guard';
import { UserRole } from '@dashboard/shared-types';
import { JwtPayload } from '../src/interfaces/jwt-payload.interface';

function makeAuthGuard(role: string) {
  return {
    canActivate: (ctx: ExecutionContext) => {
      const req = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
      req.user = {
        sub: 'test-id',
        role,
        tenantId: 'tenant-1',
        restaurantIds: ['r1'],
      };
      return true;
    },
  };
}

describe('FinanceProxy (e2e)', () => {
  let app: INestApplication;
  let mockForward: jest.Mock;

  // Set required env vars before module loads
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-for-e2e';
  });

  // Helper to rebuild the app with a specific role guard
  async function buildApp(role: string): Promise<INestApplication> {
    mockForward = jest.fn().mockResolvedValue({ data: 'ok' });
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(makeAuthGuard(role))
      .overrideProvider(FinanceProxyService)
      .useValue({ forward: mockForward })
      .compile();

    const testApp = moduleFixture.createNestApplication();
    // main.ts calls app.setGlobalPrefix('api') — replicate here so routes match production
    testApp.setGlobalPrefix('api');
    await testApp.init();
    return testApp;
  }

  afterEach(async () => {
    if (app) await app.close();
  });

  it('OWNER can call article operations endpoint → 200', async () => {
    app = await buildApp(UserRole.OWNER);
    await supertest(app.getHttpServer())
      .get('/api/finance/article/abc/operations')
      .query({ restaurantId: 'r1' })
      .expect(200);
  });

  it('FINANCE_DIRECTOR calling article operations endpoint → 403', async () => {
    app = await buildApp(UserRole.FINANCE_DIRECTOR);
    await supertest(app.getHttpServer())
      .get('/api/finance/article/abc/operations')
      .query({ restaurantId: 'r1' })
      .expect(403);
  });

  it('OPERATIONS_DIRECTOR calling reports/dds → 403', async () => {
    app = await buildApp(UserRole.OPERATIONS_DIRECTOR);
    await supertest(app.getHttpServer())
      .get('/api/finance/reports/dds')
      .expect(403);
  });

  it('OWNER calling reports/dds → 200', async () => {
    app = await buildApp(UserRole.OWNER);
    await supertest(app.getHttpServer())
      .get('/api/finance/reports/dds')
      .expect(200);
  });

  it('OPERATIONS_DIRECTOR calling reports/kitchen → 200', async () => {
    app = await buildApp(UserRole.OPERATIONS_DIRECTOR);
    await supertest(app.getHttpServer())
      .get('/api/finance/reports/kitchen')
      .expect(200);
  });

  it('non-existent route → 404', async () => {
    app = await buildApp(UserRole.OWNER);
    await supertest(app.getHttpServer())
      .get('/api/finance/reports/nonexistent')
      .expect(404);
  });
});
