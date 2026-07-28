import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { RecommendationService } from '../recommendation/recommendation.service';
import { DayDatePipe } from './dto/day-date.param';
import { GeneratePlanDto } from './dto/generate-plan.dto';

@Controller('plans')
export class PlansController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Post('generate')
  generate(@Body() dto: GeneratePlanDto) {
    return this.recommendationService.generateWeek(dto.weekStart);
  }

  @Get('current')
  current(@Query('weekStart') weekStart?: string) {
    if (weekStart) {
      return this.recommendationService.getPlanForWeek(weekStart);
    }
    return this.recommendationService.getCurrentPlan();
  }

  @Post('week/:weekStart/confirm')
  confirmWeek(@Param('weekStart', DayDatePipe) weekStart: string) {
    return this.recommendationService.confirmWeekMenu(weekStart);
  }

  @Get('history')
  history(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : 30;
    return this.recommendationService.getMenuHistory(
      Number.isFinite(parsed) ? parsed : 30,
    );
  }

  @Get('history/:date')
  historyDetail(@Param('date', DayDatePipe) date: string) {
    return this.recommendationService.getMenuHistoryDetail(date);
  }

  @Get('day/:date')
  dayMenu(@Param('date', DayDatePipe) date: string) {
    return this.recommendationService.getDayMenu(date);
  }

  @Post('day/:date/confirm')
  confirmDay(@Param('date', DayDatePipe) date: string) {
    return this.recommendationService.confirmDayMenu(date);
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
