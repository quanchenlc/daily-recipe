import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
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
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedbackService.create(recipeId, dto);
  }
}
