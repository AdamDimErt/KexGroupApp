import { IsDateString, IsNotEmpty } from 'class-validator';

export class DashboardQueryDto {
  @IsDateString()
  @IsNotEmpty()
  dateFrom: string;

  @IsDateString()
  @IsNotEmpty()
  dateTo: string;
}
