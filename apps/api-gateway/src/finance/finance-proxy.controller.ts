import {
  Controller,
  Get,
  Param,
  Headers,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { FinanceProxyService } from './finance-proxy.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '@dashboard/shared-types';

@ApiTags('Finance')
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FinanceProxyController {
  constructor(private readonly proxy: FinanceProxyService) {}

  @Get('dashboard')
  @ApiOperation({
    summary:
      'Получить главный экран финансов (OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR)',
  })
  getDashboard(
    @Req() req: Request,
    @Headers('authorization') authHeader: string,
    @Query('periodType') periodType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const tenantId = (req as any).user?.tenantId ?? '';
    const path = this.buildQueryString('/dashboard', {
      periodType,
      dateFrom,
      dateTo,
    });
    return this.proxy.forward('GET', path, undefined, {
      authorization: authHeader,
      'x-tenant-id': tenantId,
    });
  }

  @Get('brand/:id')
  @ApiOperation({
    summary:
      'Получить детали бренда (OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR)',
  })
  getBrandDetail(
    @Req() req: Request,
    @Param('id') brandId: string,
    @Headers('authorization') authHeader: string,
    @Query('periodType') periodType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const tenantId = (req as any).user?.tenantId ?? '';
    const path = this.buildQueryString(`/brand/${brandId}`, {
      periodType,
      dateFrom,
      dateTo,
    });
    return this.proxy.forward('GET', path, undefined, {
      authorization: authHeader,
      'x-tenant-id': tenantId,
    });
  }

  @Get('restaurant/:id')
  @ApiOperation({
    summary:
      'Получить детали ресторана (OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR)',
  })
  getRestaurantDetail(
    @Req() req: Request,
    @Param('id') restaurantId: string,
    @Headers('authorization') authHeader: string,
    @Query('periodType') periodType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const tenantId = (req as any).user?.tenantId ?? '';
    const path = this.buildQueryString(`/restaurant/${restaurantId}`, {
      periodType,
      dateFrom,
      dateTo,
    });
    return this.proxy.forward('GET', path, undefined, {
      authorization: authHeader,
      'x-tenant-id': tenantId,
    });
  }

  @Get('article/:id')
  @Roles([UserRole.OWNER, UserRole.FINANCE_DIRECTOR])
  @ApiOperation({
    summary: 'Получить детали статьи (OWNER, FINANCE_DIRECTOR только)',
  })
  getArticleDetail(
    @Req() req: Request,
    @Param('id') articleId: string,
    @Headers('authorization') authHeader: string,
    @Query('restaurantId') restaurantId?: string,
    @Query('periodType') periodType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const tenantId = (req as any).user?.tenantId ?? '';
    const path = this.buildQueryString(`/article/${articleId}`, {
      restaurantId,
      periodType,
      dateFrom,
      dateTo,
    });
    return this.proxy.forward('GET', path, undefined, {
      authorization: authHeader,
      'x-tenant-id': tenantId,
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
