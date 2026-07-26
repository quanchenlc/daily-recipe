import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackModule } from './feedback/feedback.module';
import { HealthController } from './health.controller';
import { LlmModule } from './llm/llm.module';
import { PlansModule } from './plans/plans.module';
import { PreferencesModule } from './preferences/preferences.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { RecipesModule } from './recipes/recipes.module';
import { Feedback } from './recipes/entities/feedback.entity';
import { Recipe } from './recipes/entities/recipe.entity';
import { PlanItem } from './plans/entities/plan-item.entity';
import { RecommendationHistory } from './plans/entities/recommendation-history.entity';
import { WeekPlan } from './plans/entities/week-plan.entity';
import { UserPreference } from './preferences/entities/user-preference.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST', '127.0.0.1'),
        port: Number(config.get<string>('DB_PORT', '3306')),
        username: config.get<string>('DB_USER', 'recipe'),
        password: config.get<string>('DB_PASSWORD', 'recipe123'),
        database: config.get<string>('DB_NAME', 'daily_recipe'),
        entities: [
          Recipe,
          Feedback,
          WeekPlan,
          PlanItem,
          RecommendationHistory,
          UserPreference,
        ],
        synchronize: true,
        charset: 'utf8mb4',
      }),
    }),
    RecipesModule,
    FeedbackModule,
    PreferencesModule,
    LlmModule,
    RecommendationModule,
    PlansModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
