import { IsOptional, IsString, Matches } from 'class-validator';

export class GeneratePlanDto {
  /** Monday date YYYY-MM-DD. Defaults to current week's Monday. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  weekStart?: string;
}
