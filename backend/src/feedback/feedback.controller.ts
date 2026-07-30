import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackService } from './feedback.service';

@Controller('recipes/:recipeId/feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  list(@Param('recipeId', ParseUUIDPipe) recipeId: string) {
    return this.feedbackService.listByRecipe(recipeId);
  }

  @Post()
  create(
    @CurrentUser() user: User,
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedbackService.create(user.id, recipeId, dto);
  }
}
