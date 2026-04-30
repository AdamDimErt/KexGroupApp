import {
  Controller,
  Get,
  Param,
  Headers,
  UseGuards,
  Query,
  Req,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceProxyService } from './finance-proxy.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '@dashboard/shared-types';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@ApiTags('Finance')
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FinanceProxyController {
  private readonly logger = new Logger(FinanceProxyController.name);

  constructor(private readonly proxy: FinanceProxyService) {}

  // ─── Defense-in-depth helpers (bug_007) ───────────────────────────────────

  private isOpsDirectorWithNoScope(user: JwtPayload): boolean {
    return (
      user?.role === UserRole.OPERATIONS_DIRECTOR &&
      (user.restaurantIds?.length ?? 0) === 0
    );
  }

  private emptyDashboardResponse(
    tenantId: string,
    query: { periodType?: string; dateFrom?: string; dateTo?: string },
  ) {
    return {
      tenantId,
      period: {
        type: query.periodType ?? 'today',
        from: query.dateFrom ?? '',
        to: query.dateTo ?? '',
      },
      totalRevenue: 0,
      totalExpenses: 0,
      financialResult: 0,
      brands: [],
    };
  }

  // ─── Endpoints ────────────────────────────────────────────────────────────

  @Get('dashboard')
  @Roles([UserRole.OWNER, UserRole.FINANCE_DIRECTOR, UserRole.OPERATIONS_DIRECTOR, UserRole.ADMIN])
  @ApiOperation({
    summary:
      'Получить главный экран финансов (OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR)',
  })
  getDashboard(
    @Req() req: { user: JwtPayload },
    @Headers('authorization') authHeader: string,
    @Query('periodType') periodType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const user = req.user;
    if (this.isOpsDirectorWithNoScope(user)) {
      this.logger.warn(
        `OPS_DIRECTOR ${user.sub} called /finance/dashboard with empty scope`,
      );
      return this.emptyDashboardResponse(user.tenantId ?? '', {
        periodType,
        dateFrom,
        dateTo,
      });
    }
    const tenantId = user?.tenantId ?? '';
    const userRole = user?.role ?? '';
    const restaurantIds = (user?.restaurantIds ?? []).join(',');
    const path = this.buildQueryString('/dashboard', {
      periodType,
      dateFrom,
      dateTo,
    });
    return this.proxy.forward('GET', path, undefined, {
      authorization: authHeader,
      'x-tenant-id': tenantId,
      'x-user-role': userRole,
      'x-user-restaurant-ids': restaurantIds,
    });
  }

  @Get('dashboard/revenue-aggregated')
  @Roles([UserRole.OWNER, UserRole.FINANCE_DIRECTOR, UserRole.OPERATIONS_DIRECTOR, UserRole.ADMIN])
  @ApiOperation({
    summary:
      'Получить агрегированную выручку компании (OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR)',
  })
  getRevenueAggregated(
    @Req() req: { user: JwtPayload },
    @Headers('authorization') authHeader: string,
    @Query('periodType') periodType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const user = req.user;
    if (this.isOpsDirectorWithNoScope(user)) {
      this.logger.warn(
        `OPS_DIRECTOR ${user.sub} called /finance/dashboard/revenue-aggregated with empty scope`,
      );
      return this.emptyDashboardResponse(user.tenantId ?? '', {
        periodType,
        dateFrom,
        dateTo,
      });
    }
    const tenantId = user?.tenantId ?? '';
    const userRole = user?.role ?? '';
    const restaurantIds = (user?.restaurantIds ?? []).join(',');
    const path = this.buildQueryString('/dashboard/revenue-aggregated', {
      periodType,
      dateFrom,
      dateTo,
    });
    return this.proxy.forward('GET', path, undefined, {
      authorization: authHeader,
      'x-tenant-id': tenantId,
      'x-user-role': userRole,
      'x-user-restaurant-ids': restaurantIds,
    });
  }

  @Get('brand/:id')
  @Roles([UserRole.OWNER, UserRole.FINANCE_DIRECTOR, UserRole.OPERATIONS_DIRECTOR, UserRole.ADMIN])
  @ApiOperation({
    summary:
      'Получить детали бренда (OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR)',
  })
  getBrandDetail(
    @Req() req: { user: JwtPayload },
    @Param('id') brandId: string,
    @Headers('authorization') authHeader: string,
    @Query('periodType') periodType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const user = req.user;
    if (this.isOpsDirectorWithNoScope(user)) {
      this.logger.warn(
        `OPS_DIRECTOR ${user.sub} called /finance/brand/${brandId} with empty scope`,
      );
      return this.emptyDashboardResponse(user.tenantId ?? '', {
        periodType,
        dateFrom,
        dateTo,
      });
    }
    const tenantId = user?.tenantId ?? '';
    const userRole = user?.role ?? '';
    const restaurantIds = (user?.restaurantIds ?? []).join(',');
    const path = this.buildQueryString(`/dashboard/brand/${brandId}`, {
      periodType,
      dateFrom,
      dateTo,
    });
    return this.proxy.forward('GET', path, undefined, {
      authorization: authHeader,
      'x-tenant-id': tenantId,
      'x-user-role': userRole,
      'x-user-restaurant-ids': restaurantIds,
    });
  }

  @Get('legal-entity/:id')
  @Roles([UserRole.OWNER, UserRole.FINANCE_DIRECTOR, UserRole.OPERATIONS_DIRECTOR, UserRole.ADMIN])
  @ApiOperation({
    summary:
      'Получить детали юр-лица (OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR)',
  })
  getLegalEntityDetail(
    @Req() req: { user: JwtPayload },
    @Param('id') legalEntityId: string,
    @Headers('authorization') authHeader: string,
    @Query('periodType') periodType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const user = req.user;
    if (this.isOpsDirectorWithNoScope(user)) {
      this.logger.warn(
        `OPS_DIRECTOR ${user.sub} called /finance/legal-entity/${legalEntityId} with empty scope`,
      );
      return this.emptyDashboardResponse(user.tenantId ?? '', {
        periodType,
        dateFrom,
        dateTo,
      });
    }
    const tenantId = user?.tenantId ?? '';
    const userRole = user?.role ?? '';
    const restaurantIds = (user?.restaurantIds ?? []).join(',');
    const path = this.buildQueryString(
      `/dashboard/legal-entity/${legalEntityId}`,
      { periodType, dateFrom, dateTo },
    );
    return this.proxy.forward('GET', path, undefined, {
      authorization: authHeader,
      'x-tenant-id': tenantId,
      'x-user-role': userRole,
      'x-user-restaurant-ids': restaurantIds,
    });
  }

  @Get('restaurant/:id')
  @Roles([UserRole.OWNER, UserRole.FINANCE_DIRECTOR, UserRole.OPERATIONS_DIRECTOR, UserRole.ADMIN])
  @ApiOperation({
    summary:
      'Получить детали ресторана (OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR)',
  })
  getRestaurantDetail(
    @Req() req: { user: JwtPayload },
    @Param('id') restaurantId: string,
    @Headers('authorization') authHeader: string,
    @Query('periodType') periodType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const user = req.user;
    if (this.isOpsDirectorWithNoScope(user)) {
      this.logger.warn(
        `OPS_DIRECTOR ${user.sub} called /finance/restaurant/${restaurantId} with empty scope`,
      );
      return this.emptyDashboardResponse(user.tenantId ?? '', {
        periodType,
        dateFrom,
        dateTo,
      });
    }
    const tenantId = user?.tenantId ?? '';
    const userRole = user?.role ?? '';
    const restaurantIds = (user?.restaurantIds ?? []).join(',');
    const path = this.buildQueryString(
      `/dashboard/restaurant/${restaurantId}`,
      {
        periodType,
        dateFrom,
        dateTo,
      },
    );
    return this.proxy.forward('GET', path, undefined, {
      authorization: authHeader,
      'x-tenant-id': tenantId,
      'x-user-role': userRole,
      'x-user-restaurant-ids': restaurantIds,
    });
  }

  @Get('article/:id/operations')
  @Roles([UserRole.OWNER, UserRole.ADMIN])
  @ApiOperation({ summary: 'Получить операции по статье (только OWNER)' })
  getArticleOperations(
    @Req() req: { user: JwtPayload },
    @Param('id') articleId: string,
    @Headers('authorization') authHeader: string,
    @Query('restaurantId') restaurantId: string,
    @Query('periodType') periodType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const user = req.user;
    const tenantId = user?.tenantId ?? '';
    const userRole = user?.role ?? '';
    const restaurantIds = (user?.restaurantIds ?? []).join(',');
    const path = this.buildQueryString(
      `/dashboard/article/${articleId}/operations`,
      { restaurantId, periodType, dateFrom, dateTo, limit, offset },
    );
    return this.proxy.forward('GET', path, undefined, {
      authorization: authHeader,
      'x-tenant-id': tenantId,
      'x-user-role': userRole,
      'x-user-restaurant-ids': restaurantIds,
    });
  }

  @Get('article/:id')
  @Roles([UserRole.OWNER, UserRole.FINANCE_DIRECTOR, UserRole.ADMIN])
  @ApiOperation({
    summary: 'Получить детали статьи (OWNER, FINANCE_DIRECTOR только)',
  })
  getArticleDetail(
    @Req() req: { user: JwtPayload },
    @Param('id') articleId: string,
    @Headers('authorization') authHeader: string,
    @Query('restaurantId') restaurantId?: string,
    @Query('periodType') periodType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const user = req.user;
    const tenantId = user?.tenantId ?? '';
    const userRole = user?.role ?? '';
    const restaurantIds = (user?.restaurantIds ?? []).join(',');
    const path = this.buildQueryString(`/dashboard/article/${articleId}`, {
      restaurantId,
      periodType,
      dateFrom,
      dateTo,
    });
    return this.proxy.forward('GET', path, undefined, {
      authorization: authHeader,
      'x-tenant-id': tenantId,
      'x-user-role': userRole,
      'x-user-restaurant-ids': restaurantIds,
    });
  }

  @Get('reports/dds')
  @Roles([UserRole.OWNER, UserRole.FINANCE_DIRECTOR, UserRole.ADMIN])
  @ApiOperation({ summary: 'ДДС отчёт по всем точкам (OWNER, FINANCE_DIRECTOR)' })
  getReportDds(
    @Req() req: { user: JwtPayload },
    @Headers('authorization') authHeader: string,
    @Query('periodType') periodType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const user = req.user;
    const tenantId = user?.tenantId ?? '';
    const userRole = user?.role ?? '';
    const restaurantIds = (user?.restaurantIds ?? []).join(',');
    const path = this.buildQueryString('/dashboard/reports/dds', {
      periodType,
      dateFrom,
      dateTo,
    });
    return this.proxy.forward('GET', path, undefined, {
      authorization: authHeader,
      'x-tenant-id': tenantId,
      'x-user-role': userRole,
      'x-user-restaurant-ids': restaurantIds,
    });
  }

  @Get('reports/company-expenses')
  @Roles([UserRole.OWNER, UserRole.FINANCE_DIRECTOR, UserRole.ADMIN])
  @ApiOperation({ summary: 'Затраты компании (ГО + Цех) (OWNER, FINANCE_DIRECTOR)' })
  getReportCompanyExpenses(
    @Req() req: { user: JwtPayload },
    @Headers('authorization') authHeader: string,
    @Query('periodType') periodType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const user = req.user;
    const tenantId = user?.tenantId ?? '';
    const userRole = user?.role ?? '';
    const restaurantIds = (user?.restaurantIds ?? []).join(',');
    const path = this.buildQueryString('/dashboard/reports/company-expenses', {
      periodType,
      dateFrom,
      dateTo,
    });
    return this.proxy.forward('GET', path, undefined, {
      authorization: authHeader,
      'x-tenant-id': tenantId,
      'x-user-role': userRole,
      'x-user-restaurant-ids': restaurantIds,
    });
  }

  @Get('reports/kitchen')
  @Roles([UserRole.OWNER, UserRole.FINANCE_DIRECTOR, UserRole.OPERATIONS_DIRECTOR, UserRole.ADMIN])
  @ApiOperation({ summary: 'Закупки и отгрузки Цеха (OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR)' })
  getReportKitchen(
    @Req() req: { user: JwtPayload },
    @Headers('authorization') authHeader: string,
    @Query('periodType') periodType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const user = req.user;
    const tenantId = user?.tenantId ?? '';
    const userRole = user?.role ?? '';
    const restaurantIds = (user?.restaurantIds ?? []).join(',');
    const path = this.buildQueryString('/dashboard/reports/kitchen', {
      periodType,
      dateFrom,
      dateTo,
    });
    return this.proxy.forward('GET', path, undefined, {
      authorization: authHeader,
      'x-tenant-id': tenantId,
      'x-user-role': userRole,
      'x-user-restaurant-ids': restaurantIds,
    });
  }

  @Get('reports/trends')
  @Roles([UserRole.OWNER, UserRole.FINANCE_DIRECTOR, UserRole.OPERATIONS_DIRECTOR, UserRole.ADMIN])
  @ApiOperation({ summary: 'Аналитика и тренды (OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR)' })
  getReportTrends(
    @Req() req: { user: JwtPayload },
    @Headers('authorization') authHeader: string,
    @Query('periodType') periodType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const user = req.user;
    const tenantId = user?.tenantId ?? '';
    const userRole = user?.role ?? '';
    const restaurantIds = (user?.restaurantIds ?? []).join(',');
    const path = this.buildQueryString('/dashboard/reports/trends', {
      periodType,
      dateFrom,
      dateTo,
    });
    return this.proxy.forward('GET', path, undefined, {
      authorization: authHeader,
      'x-tenant-id': tenantId,
      'x-user-role': userRole,
      'x-user-restaurant-ids': restaurantIds,
    });
  }

  private buildQueryString(
    basePath: string,
    params: Record<string, string | undefined>,
  ): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        query.append(key, value);
      }
    }
    const queryString = query.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  }
}
