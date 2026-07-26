import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { RecommendationService } from '../recommendation/recommendation.service';
import { GeneratePlanDto } from './dto/generate-plan.dto';

@Controller('plans')
export class PlansController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Post('generate')
  generate(@Body() dto: GeneratePlanDto) {
    return this.recommendationService.generateWeek(dto.weekStart);
  }

  @Get('current')
  current() {
    return this.recommendationService.getCurrentPlan();
  }

  @Get(':id')
  one(@Param('id', ParseUUIDPipe) id: string) {
    return this.recommendationService.getPlan(id);
  }

  @Post(':id/items/:itemId/reroll')
  reroll(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.recommendationService.rerollItem(id, itemId);
  }
}
