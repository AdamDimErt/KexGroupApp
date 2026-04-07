import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { FinanceProxyController } from './finance-proxy.controller';
import { FinanceProxyService } from './finance-proxy.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { UserRole } from '@dashboard/shared-types';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

// Allow all requests through in unit tests — guards are unit-tested separately
const mockJwtAuthGuard = { canActivate: (_ctx: ExecutionContext) => true };
const mockRolesGuard = { canActivate: (_ctx: ExecutionContext) => true };

describe('FinanceProxyController — new routes', () => {
  let controller: FinanceProxyController;
  let mockForward: jest.Mock;
  let reflector: Reflector;

  const mockUser: JwtPayload = {
    sub: 'user-1',
    role: UserRole.OWNER,
    tenantId: 'tenant-1',
    restaurantIds: ['r1', 'r2'],
  };

  const mockReq = { user: mockUser };
  const authHeader = 'Bearer test-token';

  beforeEach(async () => {
    mockForward = jest.fn().mockResolvedValue({ data: 'ok' });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinanceProxyController],
      providers: [
        { provide: FinanceProxyService, useValue: { forward: mockForward } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<FinanceProxyController>(FinanceProxyController);
    reflector = new Reflector();
  });

  describe('getArticleOperations', () => {
    it('calls proxy.forward with /dashboard/article/:id/operations path', async () => {
      await controller.getArticleOperations(
        mockReq as { user: JwtPayload },
        'test-id',
        authHeader,
        'r1',
      );
      expect(mockForward).toHaveBeenCalledWith(
        'GET',
        expect.stringContaining('/dashboard/article/test-id/operations'),
        undefined,
        expect.objectContaining({
          authorization: authHeader,
          'x-tenant-id': 'tenant-1',
          'x-user-role': UserRole.OWNER,
          'x-user-restaurant-ids': 'r1,r2',
        }),
      );
    });

    it('has @Roles([OWNER]) metadata', () => {
      const roles = reflector.get<UserRole[]>(
        'roles',
        controller.getArticleOperations,
      );
      expect(roles).toEqual([UserRole.OWNER]);
    });
  });

  describe('getReportDds', () => {
    it('calls proxy.forward with /dashboard/reports/dds path', async () => {
      await controller.getReportDds(mockReq as { user: JwtPayload }, authHeader);
      expect(mockForward).toHaveBeenCalledWith(
        'GET',
        expect.stringContaining('/dashboard/reports/dds'),
        undefined,
        expect.any(Object),
      );
    });

    it('has @Roles([OWNER, FINANCE_DIRECTOR]) metadata', () => {
      const roles = reflector.get<UserRole[]>('roles', controller.getReportDds);
      expect(roles).toEqual([UserRole.OWNER, UserRole.FINANCE_DIRECTOR]);
    });
  });

  describe('getReportCompanyExpenses', () => {
    it('calls proxy.forward with /dashboard/reports/company-expenses path', async () => {
      await controller.getReportCompanyExpenses(
        mockReq as { user: JwtPayload },
        authHeader,
      );
      expect(mockForward).toHaveBeenCalledWith(
        'GET',
        expect.stringContaining('/dashboard/reports/company-expenses'),
        undefined,
        expect.any(Object),
      );
    });
  });

  describe('getReportKitchen', () => {
    it('calls proxy.forward with /dashboard/reports/kitchen path', async () => {
      await controller.getReportKitchen(
        mockReq as { user: JwtPayload },
        authHeader,
      );
      expect(mockForward).toHaveBeenCalledWith(
        'GET',
        expect.stringContaining('/dashboard/reports/kitchen'),
        undefined,
        expect.any(Object),
      );
    });

    it('has @Roles including OPERATIONS_DIRECTOR metadata', () => {
      const roles = reflector.get<UserRole[]>(
        'roles',
        controller.getReportKitchen,
      );
      expect(roles).toContain(UserRole.OPERATIONS_DIRECTOR);
    });
  });

  describe('getReportTrends', () => {
    it('calls proxy.forward with /dashboard/reports/trends path', async () => {
      await controller.getReportTrends(
        mockReq as { user: JwtPayload },
        authHeader,
      );
      expect(mockForward).toHaveBeenCalledWith(
        'GET',
        expect.stringContaining('/dashboard/reports/trends'),
        undefined,
        expect.any(Object),
      );
    });

    it('has @Roles including OPERATIONS_DIRECTOR metadata', () => {
      const roles = reflector.get<UserRole[]>(
        'roles',
        controller.getReportTrends,
      );
      expect(roles).toContain(UserRole.OPERATIONS_DIRECTOR);
    });
  });
});
