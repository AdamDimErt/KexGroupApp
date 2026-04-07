import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DashboardQueryDto } from './dashboard-query.dto';

export class OperationsQueryDto extends DashboardQueryDto {
  @IsString()
  @IsNotEmpty()
  declare restaurantId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}

export class OperationItemDto {
  id: string;
  date: string;
  amount: number;
  comment: string | null;
  source: 'IIKO' | 'ONE_C';
  allocationCoefficient: number | null;
  restaurantName: string;
}

export class ArticleOperationsDto {
  items: OperationItemDto[];
  total: number;
  period: { from: string; to: string };
}
