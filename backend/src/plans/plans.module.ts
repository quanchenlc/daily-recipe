import { Module } from '@nestjs/common';
import { RecommendationModule } from '../recommendation/recommendation.module';
import { PlansController } from './plans.controller';

@Module({
  imports: [RecommendationModule],
  controllers: [PlansController],
})
export class PlansModule {}
