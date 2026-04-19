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

    it('has @Roles([OWNER, ADMIN]) metadata', () => {
      const roles = reflector.get<UserRole[]>(
        'roles',
        controller.getArticleOperations,
      );
      expect(roles).toEqual([UserRole.OWNER, UserRole.ADMIN]);
    });
  });

  describe('getRevenueAggregated', () => {
    it('calls proxy.forward with /dashboard/revenue-aggregated path', async () => {
      await controller.getRevenueAggregated(
        mockReq as { user: JwtPayload },
        authHeader,
        'month',
        '2026-04-01',
        '2026-04-30',
      );
      expect(mockForward).toHaveBeenCalledWith(
        'GET',
        expect.stringContaining('/dashboard/revenue-aggregated'),
        undefined,
        expect.objectContaining({
          authorization: authHeader,
          'x-tenant-id': 'tenant-1',
          'x-user-role': UserRole.OWNER,
          'x-user-restaurant-ids': 'r1,r2',
        }),
      );
    });

    it('has @Roles([OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR, ADMIN]) metadata', () => {
      const roles = reflector.get<UserRole[]>(
        'roles',
        controller.getRevenueAggregated,
      );
      expect(roles).toEqual([
        UserRole.OWNER,
        UserRole.FINANCE_DIRECTOR,
        UserRole.OPERATIONS_DIRECTOR,
        UserRole.ADMIN,
      ]);
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

    it('has @Roles([OWNER, FINANCE_DIRECTOR, ADMIN]) metadata', () => {
      const roles = reflector.get<UserRole[]>('roles', controller.getReportDds);
      expect(roles).toEqual([UserRole.OWNER, UserRole.FINANCE_DIRECTOR, UserRole.ADMIN]);
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

  // ─── bug_007: defense-in-depth for OPS_DIRECTOR with empty scope ──────────

  describe('bug_007 — OPS_DIRECTOR empty scope short-circuit', () => {
    const opsUserNoScope: JwtPayload = {
      sub: 'ops-user-1',
      role: UserRole.OPERATIONS_DIRECTOR,
      tenantId: 'tenant-1',
      restaurantIds: [],
    };

    const opsUserWithScope: JwtPayload = {
      sub: 'ops-user-2',
      role: UserRole.OPERATIONS_DIRECTOR,
      tenantId: 'tenant-1',
      restaurantIds: ['r1'],
    };

    it('getDashboard — OPS_DIRECTOR with empty restaurantIds returns empty payload without calling proxy.forward', async () => {
      const result = await controller.getDashboard(
        { user: opsUserNoScope },
        authHeader,
        'today',
        '2026-04-20',
        '2026-04-20',
      );
      expect(mockForward).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        tenantId: 'tenant-1',
        totalRevenue: 0,
        totalExpenses: 0,
        financialResult: 0,
        brands: [],
      });
    });

    it('getDashboard — OPS_DIRECTOR with restaurantIds forwards normally', async () => {
      await controller.getDashboard(
        { user: opsUserWithScope },
        authHeader,
        'today',
      );
      expect(mockForward).toHaveBeenCalledTimes(1);
      expect(mockForward).toHaveBeenCalledWith(
        'GET',
        expect.stringContaining('/dashboard'),
        undefined,
        expect.objectContaining({
          'x-user-restaurant-ids': 'r1',
        }),
      );
    });

    it('getDashboard — OWNER always forwards regardless of restaurantIds', async () => {
      const ownerNoScope: JwtPayload = {
        sub: 'owner-1',
        role: UserRole.OWNER,
        tenantId: 'tenant-1',
        restaurantIds: [],
      };
      await controller.getDashboard({ user: ownerNoScope }, authHeader);
      expect(mockForward).toHaveBeenCalledTimes(1);
    });

    it('getRevenueAggregated — OPS_DIRECTOR with empty restaurantIds returns empty payload without calling proxy.forward', async () => {
      const result = await controller.getRevenueAggregated(
        { user: opsUserNoScope },
        authHeader,
        'today',
      );
      expect(mockForward).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        tenantId: 'tenant-1',
        totalRevenue: 0,
        brands: [],
      });
    });

    it('getBrandDetail — OPS_DIRECTOR with empty restaurantIds returns empty payload without calling proxy.forward', async () => {
      const result = await controller.getBrandDetail(
        { user: opsUserNoScope },
        'brand-1',
        authHeader,
        'today',
      );
      expect(mockForward).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        tenantId: 'tenant-1',
        totalRevenue: 0,
        brands: [],
      });
    });

    it('getRestaurantDetail — OPS_DIRECTOR with empty restaurantIds returns empty payload without calling proxy.forward', async () => {
      const result = await controller.getRestaurantDetail(
        { user: opsUserNoScope },
        'rest-1',
        authHeader,
        'today',
      );
      expect(mockForward).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        tenantId: 'tenant-1',
        totalRevenue: 0,
        brands: [],
      });
    });
  });
});
