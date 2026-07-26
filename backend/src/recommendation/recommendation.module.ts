import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LlmModule } from '../llm/llm.module';
import { PlanItem } from '../plans/entities/plan-item.entity';
import { RecommendationHistory } from '../plans/entities/recommendation-history.entity';
import { WeekPlan } from '../plans/entities/week-plan.entity';
import { PreferencesModule } from '../preferences/preferences.module';
import { RecipesModule } from '../recipes/recipes.module';
import { RecommendationService } from './recommendation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WeekPlan, PlanItem, RecommendationHistory]),
    RecipesModule,
    PreferencesModule,
    LlmModule,
  ],
  providers: [RecommendationService],
  exports: [RecommendationService],
})
export class RecommendationModule {}
