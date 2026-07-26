import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MealSlotConfig } from '../preference.types';

class MealSlotConfigDto implements MealSlotConfig {
  @IsInt()
  @Min(0)
  @Max(6)
  dishes: number;

  @IsInt()
  @Min(0)
  @Max(4)
  soups: number;
}

class MealConfigDto {
  @ValidateNested()
  @Type(() => MealSlotConfigDto)
  lunch: MealSlotConfigDto;

  @ValidateNested()
  @Type(() => MealSlotConfigDto)
  dinner: MealSlotConfigDto;
}

export class UpdatePreferenceDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  adultsCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  elderlyCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  childrenCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  flavorNotes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MealConfigDto)
  mealConfig?: MealConfigDto;
}
