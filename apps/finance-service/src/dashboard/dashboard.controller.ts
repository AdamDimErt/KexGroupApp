import {
  Controller,
  Get,
  Param,
  Query,
  Headers,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import {
  DashboardSummaryDto,
  BrandDetailDto,
  RestaurantDetailDto,
  ArticleGroupDetailDto,
} from './dto/summary.dto';
import { CompanyRevenueAggregatedDto } from './dto/revenue-aggregated.dto';
import { OperationsQueryDto, ArticleOperationsDto } from './dto/operations.dto';
import {
  DdsReportDto,
  CompanyExpensesReportDto,
  KitchenReportDto,
  TrendsReportDto,
} from './dto/reports.dto';

@Controller('dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard?dateFrom=2026-01-01&dateTo=2026-01-31&periodType=today
   * Main dashboard — brand-level summary with totals
   *
   * x-user-role: OWNER | FINANCE_DIRECTOR | OPERATIONS_DIRECTOR
   * x-user-restaurant-ids: comma-separated restaurant IDs (for OPS_DIRECTOR filtering)
   */
  @Get()
  async getDashboardSummary(
    @Query() query: DashboardQueryDto,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-user-role') userRole?: string,
    @Headers('x-user-restaurant-ids') userRestaurantIds?: string,
  ): Promise<DashboardSummaryDto> {
    if (!tenantId) {
      throw new BadRequestException('Missing x-tenant-id header');
    }

    // OPS_DIRECTOR: always build an explicit array (fail-closed).
    // An empty x-user-restaurant-ids header must yield [] not undefined,
    // so Prisma receives { id: { in: [] } } and returns nothing (not everything).
    const restaurantFilter =
      userRole === 'OPERATIONS_DIRECTOR'
        ? (userRestaurantIds ?? '').split(',').map((id) => id.trim()).filter(Boolean)
        : undefined;

    if (userRole === 'OPERATIONS_DIRECTOR' && restaurantFilter!.length === 0) {
      this.logger.warn('OPS_DIRECTOR request with empty restaurant scope — returning empty results');
    }

    return this.dashboardService.getDashboardSummary(
      tenantId,
      query.periodType || 'today',
      query.dateFrom,
      query.dateTo,
      restaurantFilter,
    );
  }

  /**
   * GET /dashboard/revenue-aggregated?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&periodType=today
   * Company-wide aggregated revenue for the "Выручка детально" mobile screen.
   * Returns totalRevenue, paymentBreakdown, dailyRevenue chart, expenses breakdown, top-10 restaurants.
   *
   * RBAC: OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR (all roles).
   * OPERATIONS_DIRECTOR is filtered to assigned restaurants via x-user-restaurant-ids.
   */
  @Get('revenue-aggregated')
  async getCompanyRevenueAggregated(
    @Query() query: DashboardQueryDto,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-user-role') userRole?: string,
    @Headers('x-user-restaurant-ids') userRestaurantIds?: string,
  ): Promise<CompanyRevenueAggregatedDto> {
    if (!tenantId) {
      throw new BadRequestException('Missing x-tenant-id header');
    }

    // OPS_DIRECTOR: always build an explicit array (fail-closed). See getDashboardSummary above.
    const restaurantFilter =
      userRole === 'OPERATIONS_DIRECTOR'
        ? (userRestaurantIds ?? '').split(',').map((id) => id.trim()).filter(Boolean)
        : undefined;

    if (userRole === 'OPERATIONS_DIRECTOR' && restaurantFilter!.length === 0) {
      this.logger.warn('OPS_DIRECTOR request with empty restaurant scope — returning empty results');
    }

    return this.dashboardService.getCompanyRevenueAggregated(
      tenantId,
      query.periodType || 'today',
      query.dateFrom,
      query.dateTo,
      restaurantFilter,
    );
  }

  /**
   * GET /dashboard/brand/:brandId?periodType=today&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
   * Brand detail (Level 1b): list of restaurants within a brand
   * Returns BrandDetailDto with restaurants array
   */
  @Get('brand/:brandId')
  async getBrandDetail(
    @Param('brandId') brandId: string,
    @Query() query: DashboardQueryDto,
  ): Promise<BrandDetailDto> {
    return this.dashboardService.getBrandDetail(
      brandId,
      query.periodType || 'today',
      query.dateFrom,
      query.dateTo,
    );
  }

  /**
   * GET /dashboard/restaurant/:restaurantId?periodType=today&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
   * Restaurant detail (Level 2): full financial detail for a single restaurant
   * Returns RestaurantDetailDto with expense groups, cash discrepancies, revenue chart
   */
  @Get('restaurant/:restaurantId')
  async getRestaurantDetail(
    @Param('restaurantId') restaurantId: string,
    @Query() query: DashboardQueryDto,
  ): Promise<RestaurantDetailDto> {
    return this.dashboardService.getRestaurantDetail(
      restaurantId,
      query.periodType || 'today',
      query.dateFrom,
      query.dateTo,
    );
  }

  /**
   * GET /dashboard/article/:articleId/operations?restaurantId=&dateFrom=&dateTo=&periodType=&limit=&offset=
   * Level 4: Individual expense operations for an article (OWNER only via DataAccessInterceptor)
   *
   * CRITICAL: This route MUST be registered BEFORE article/:groupId to avoid NestJS route collision.
   */
  @Get('article/:articleId/operations')
  async getArticleOperations(
    @Param('articleId') articleId: string,
    @Query() query: OperationsQueryDto,
  ): Promise<ArticleOperationsDto> {
    if (!query.restaurantId) {
      throw new BadRequestException('Missing restaurantId query parameter');
    }
    return this.dashboardService.getArticleOperations(
      articleId,
      query.restaurantId,
      query.dateFrom,
      query.dateTo,
      query.limit ?? 50,
      query.offset ?? 0,
    );
  }

  /**
   * GET /dashboard/article/:groupId?restaurantId=xxx&periodType=today&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
   * Article group detail (Level 3): individual articles within an expense group
   * Returns ArticleGroupDetailDto with articles array
   */
  @Get('article/:groupId')
  async getArticleGroupDetail(
    @Param('groupId') groupId: string,
    @Query('restaurantId') restaurantId: string,
    @Query() query: DashboardQueryDto,
  ): Promise<ArticleGroupDetailDto> {
    if (!restaurantId) {
      throw new BadRequestException('Missing restaurantId query parameter');
    }
    return this.dashboardService.getArticleGroupDetail(
      groupId,
      restaurantId,
      query.periodType || 'today',
      query.dateFrom,
      query.dateTo,
    );
  }

  /**
   * GET /dashboard/reports/dds?periodType=&dateFrom=&dateTo=
   * DDS report: expenses grouped by restaurant with article groups
   * Access: OWNER, FINANCE_DIRECTOR (via DataAccessInterceptor)
   */
  @Get('reports/dds')
  async getReportDds(
    @Query() query: DashboardQueryDto,
    @Headers('x-tenant-id') tenantId?: string,
  ): Promise<DdsReportDto> {
    if (!tenantId) {
      throw new BadRequestException('Missing x-tenant-id header');
    }
    return this.dashboardService.getReportDds(tenantId, query.dateFrom, query.dateTo);
  }

  /**
   * GET /dashboard/reports/company-expenses?periodType=&dateFrom=&dateTo=
   * Company expenses report: HQ overhead + workshop by article
   * Access: OWNER, FINANCE_DIRECTOR (via DataAccessInterceptor)
   */
  @Get('reports/company-expenses')
  async getReportCompanyExpenses(
    @Query() query: DashboardQueryDto,
    @Headers('x-tenant-id') tenantId?: string,
  ): Promise<CompanyExpensesReportDto> {
    if (!tenantId) {
      throw new BadRequestException('Missing x-tenant-id header');
    }
    return this.dashboardService.getReportCompanyExpenses(tenantId, query.dateFrom, query.dateTo);
  }

  /**
   * GET /dashboard/reports/kitchen?periodType=&dateFrom=&dateTo=
   * Kitchen report: purchases and shipments
   * Access: OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR (via DataAccessInterceptor)
   */
  @Get('reports/kitchen')
  async getReportKitchen(
    @Query() query: DashboardQueryDto,
    @Headers('x-tenant-id') tenantId?: string,
  ): Promise<KitchenReportDto> {
    if (!tenantId) {
      throw new BadRequestException('Missing x-tenant-id header');
    }
    return this.dashboardService.getReportKitchen(tenantId, query.dateFrom, query.dateTo);
  }

  /**
   * GET /dashboard/reports/trends?periodType=&dateFrom=&dateTo=
   * Trends report: daily revenue vs expenses vs net profit
   * Access: OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR (via DataAccessInterceptor)
   */
  @Get('reports/trends')
  async getReportTrends(
    @Query() query: DashboardQueryDto,
    @Headers('x-tenant-id') tenantId?: string,
  ): Promise<TrendsReportDto> {
    if (!tenantId) {
      throw new BadRequestException('Missing x-tenant-id header');
    }
    return this.dashboardService.getReportTrends(tenantId, query.dateFrom, query.dateTo);
  }
}
