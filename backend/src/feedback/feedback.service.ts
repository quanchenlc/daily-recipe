import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PreferencesService } from '../preferences/preferences.service';
import { RecipesService } from '../recipes/recipes.service';
import { Feedback } from '../recipes/entities/feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepo: Repository<Feedback>,
    private readonly recipesService: RecipesService,
    private readonly preferencesService: PreferencesService,
  ) {}

  async create(recipeId: string, dto: CreateFeedbackDto) {
    const recipe = await this.recipesService.findOne(recipeId);
    const feedback = await this.feedbackRepo.save(
      this.feedbackRepo.create({
        recipeId: recipe.id,
        rating: dto.rating,
        comment: dto.comment ?? null,
      }),
    );
    await this.preferencesService.applyFeedback(recipe, feedback);
    return feedback;
  }

  listByRecipe(recipeId: string) {
    return this.feedbackRepo.find({
      where: { recipeId },
      order: { createdAt: 'DESC' },
    });
  }
}
