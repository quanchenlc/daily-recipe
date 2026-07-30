import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { FeedbackModule } from './feedback/feedback.module';
import { HealthController } from './health.controller';
import { LlmModule } from './llm/llm.module';
import { PlansModule } from './plans/plans.module';
import { PreferencesModule } from './preferences/preferences.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { RecipesModule } from './recipes/recipes.module';
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
    AuthModule,
    RecipesModule,
    FeedbackModule,
    PreferencesModule,
    LlmModule,
    RecommendationModule,
    PlansModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
