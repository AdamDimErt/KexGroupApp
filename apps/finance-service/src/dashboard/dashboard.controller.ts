import {
  Controller,
  Get,
  Param,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import {
  CompanySummaryDto,
  BrandSummaryDto,
  RestaurantSummaryDto,
  ArticleSummaryDto,
} from './dto/summary.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard?dateFrom=2026-01-01&dateTo=2026-01-31
   * Company level (level 1) - requires tenantId from JWT header
   */
  @Get()
  async getCompanySummary(
    @Query() query: DashboardQueryDto,
    @Headers('x-tenant-id') tenantId?: string,
  ): Promise<CompanySummaryDto[]> {
    if (!tenantId) {
      throw new BadRequestException('Missing x-tenant-id header');
    }

    return this.dashboardService.getCompanySummary(
      tenantId,
      query.dateFrom,
      query.dateTo,
    );
  }

  /**
   * GET /dashboard/brand/:companyId?dateFrom=2026-01-01&dateTo=2026-01-31
   * Brand level (level 2)
   */
  @Get('brand/:companyId')
  async getBrandSummary(
    @Param('companyId') companyId: string,
    @Query() query: DashboardQueryDto,
  ): Promise<BrandSummaryDto[]> {
    return this.dashboardService.getBrandSummary(
      companyId,
      query.dateFrom,
      query.dateTo,
    );
  }

  /**
   * GET /dashboard/restaurant/:brandId?dateFrom=2026-01-01&dateTo=2026-01-31
   * Restaurant level (level 3)
   */
  @Get('restaurant/:brandId')
  async getRestaurantSummary(
    @Param('brandId') brandId: string,
    @Query() query: DashboardQueryDto,
  ): Promise<RestaurantSummaryDto[]> {
    return this.dashboardService.getRestaurantSummary(
      brandId,
      query.dateFrom,
      query.dateTo,
    );
  }

  /**
   * GET /dashboard/article/:restaurantId?dateFrom=2026-01-01&dateTo=2026-01-31
   * Article level (level 4) - expenses by DDS article
   */
  @Get('article/:restaurantId')
  async getArticleSummary(
    @Param('restaurantId') restaurantId: string,
    @Query() query: DashboardQueryDto,
  ): Promise<ArticleSummaryDto[]> {
    return this.dashboardService.getArticleSummary(
      restaurantId,
      query.dateFrom,
      query.dateTo,
    );
  }
}
