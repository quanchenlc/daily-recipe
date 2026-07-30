import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { RecommendationService } from '../recommendation/recommendation.service';
import { DayDatePipe } from './dto/day-date.param';
import { GeneratePlanDto } from './dto/generate-plan.dto';

@Controller('plans')
export class PlansController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Post('generate')
  generate(@CurrentUser() user: User, @Body() dto: GeneratePlanDto) {
    return this.recommendationService.generateWeek(user.id, dto.weekStart);
  }

  @Get('current')
  current(@CurrentUser() user: User, @Query('weekStart') weekStart?: string) {
    if (weekStart) {
      return this.recommendationService.getPlanForWeek(user.id, weekStart);
    }
    return this.recommendationService.getCurrentPlan(user.id);
  }

  @Post('week/:weekStart/confirm')
  confirmWeek(
    @CurrentUser() user: User,
    @Param('weekStart', DayDatePipe) weekStart: string,
  ) {
    return this.recommendationService.confirmWeekMenu(user.id, weekStart);
  }

  @Get('history')
  history(@CurrentUser() user: User, @Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : 30;
    return this.recommendationService.getMenuHistory(
      user.id,
      Number.isFinite(parsed) ? parsed : 30,
    );
  }

  @Get('history/:date')
  historyDetail(
    @CurrentUser() user: User,
    @Param('date', DayDatePipe) date: string,
  ) {
    return this.recommendationService.getMenuHistoryDetail(user.id, date);
  }

  @Get('day/:date')
  dayMenu(
    @CurrentUser() user: User,
    @Param('date', DayDatePipe) date: string,
  ) {
    return this.recommendationService.getDayMenu(user.id, date);
  }

  @Post('day/:date/regenerate')
  regenerateDay(
    @CurrentUser() user: User,
    @Param('date', DayDatePipe) date: string,
  ) {
    return this.recommendationService.regenerateDay(user.id, date);
  }

  @Post('day/:date/confirm')
  confirmDay(
    @CurrentUser() user: User,
    @Param('date', DayDatePipe) date: string,
  ) {
    return this.recommendationService.confirmDayMenu(user.id, date);
  }

  @Get(':id')
  one(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.recommendationService.getPlan(user.id, id);
  }

  @Post(':id/items/:itemId/reroll')
  reroll(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.recommendationService.rerollItem(user.id, id, itemId);
  }
}
