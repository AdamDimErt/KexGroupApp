import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class DashboardQueryDto {
  @IsDateString()
  @IsNotEmpty()
  dateFrom: string;

  @IsDateString()
  @IsNotEmpty()
  dateTo: string;

  @IsString()
  @IsOptional()
  periodType?: string;

  @IsString()
  @IsOptional()
  restaurantId?: string;
}
