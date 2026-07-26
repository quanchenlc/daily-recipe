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
import { UserPreference } from './preferences/entities/user-preference.entity';
import { createTypeOrmOptions } from './database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createTypeOrmOptions(config),
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
