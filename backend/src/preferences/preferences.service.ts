import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../recipes/entities/feedback.entity';
import { Recipe } from '../recipes/entities/recipe.entity';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { UserPreference } from './entities/user-preference.entity';
import {
  DEFAULT_MEAL_CONFIG,
  MealConfig,
  itemsPerDay,
  normalizeMealConfig,
  slotDishCount,
} from './preference.types';

const DEFAULT_KEY = 'default';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectRepository(UserPreference)
    private readonly prefsRepo: Repository<UserPreference>,
  ) {}

  async getOrCreate() {
    let pref = await this.prefsRepo.findOne({ where: { key: DEFAULT_KEY } });
    if (!pref) {
      pref = await this.prefsRepo.save(
        this.prefsRepo.create({
          key: DEFAULT_KEY,
          likes: [],
          dislikes: [],
          constraints: [],
          adultsCount: 2,
          elderlyCount: 0,
          childrenCount: 0,
          flavorNotes: null,
          mealConfig: DEFAULT_MEAL_CONFIG,
          summaryText: '暂无偏好，按家常均衡口味推荐。',
        }),
      );
    }
    return this.normalize(pref);
  }

  async update(dto: UpdatePreferenceDto) {
    const pref = await this.getOrCreate();
    const adults = dto.adultsCount ?? pref.adultsCount;
    const elderly = dto.elderlyCount ?? pref.elderlyCount;
    const children = dto.childrenCount ?? pref.childrenCount;

    if (adults + elderly + children < 1) {
      throw new BadRequestException('家庭人数至少为 1 人');
    }

    if (dto.adultsCount !== undefined) pref.adultsCount = dto.adultsCount;
    if (dto.elderlyCount !== undefined) pref.elderlyCount = dto.elderlyCount;
    if (dto.childrenCount !== undefined) pref.childrenCount = dto.childrenCount;
    if (dto.flavorNotes !== undefined) pref.flavorNotes = dto.flavorNotes.trim() || null;
    if (dto.mealConfig !== undefined) {
      pref.mealConfig = normalizeMealConfig(dto.mealConfig);
      if (itemsPerDay(pref.mealConfig) < 1) {
        throw new BadRequestException('每餐至少需要 1 道菜或 1 道汤');
      }
      const lunch = pref.mealConfig.lunch;
      const dinner = pref.mealConfig.dinner;
      if (slotDishCount(lunch) < 1 && slotDishCount(dinner) < 1) {
        throw new BadRequestException('午餐或晚餐至少有一餐包含荤菜/素菜');
      }
    }

    pref.summaryText = this.buildSummary(pref);
    return this.prefsRepo.save(pref);
  }

  getMealConfig(pref: UserPreference): MealConfig {
    return normalizeMealConfig(pref.mealConfig);
  }

  async applyFeedback(recipe: Recipe, feedback: Feedback) {
    const pref = await this.getOrCreate();
    const likes = new Set(pref.likes ?? []);
    const dislikes = new Set(pref.dislikes ?? []);
    const constraints = new Set(pref.constraints ?? []);

    const signals = this.extractSignals(recipe, feedback);
    for (const signal of signals.likes) likes.add(signal);
    for (const signal of signals.dislikes) dislikes.add(signal);
    for (const signal of signals.constraints) constraints.add(signal);

    if (feedback.rating >= 4) {
      likes.add(recipe.name);
      dislikes.delete(recipe.name);
    }
    if (feedback.rating <= 2) {
      dislikes.add(recipe.name);
      likes.delete(recipe.name);
    }

    pref.likes = [...likes];
    pref.dislikes = [...dislikes];
    pref.constraints = [...constraints];
    pref.summaryText = this.buildSummary(pref);
    return this.prefsRepo.save(pref);
  }

  private normalize(pref: UserPreference) {
    pref.mealConfig = normalizeMealConfig(pref.mealConfig);
    if (!pref.adultsCount && pref.adultsCount !== 0) pref.adultsCount = 2;
    return pref;
  }

  private extractSignals(recipe: Recipe, feedback: Feedback) {
    const likes: string[] = [];
    const dislikes: string[] = [];
    const constraints: string[] = [];
    const text = `${feedback.comment ?? ''} ${(recipe.tags ?? []).join(' ')}`;

    const likeWords = ['喜欢', '好吃', '清淡', '家常', '下饭', '快手'];
    const dislikeWords = ['太辣', '太油', '太咸', '太甜', '腻', '不喜欢'];
    const avoidWords = ['香菜', '芹菜', '海鲜', '羊肉'];

    for (const word of likeWords) {
      if (text.includes(word) && feedback.rating >= 3) likes.push(word);
    }
    for (const word of dislikeWords) {
      if (text.includes(word) || feedback.rating <= 2) {
        if (text.includes(word)) dislikes.push(word.replace('太', ''));
      }
    }
    for (const word of avoidWords) {
      if (text.includes(`不要${word}`) || text.includes(`讨厌${word}`)) {
        constraints.push(`avoid:${word}`);
      }
    }
    return { likes, dislikes, constraints };
  }

  private buildSummary(pref: UserPreference) {
    const parts: string[] = [];
    const total = pref.adultsCount + pref.elderlyCount + pref.childrenCount;
    parts.push(
      `家庭 ${total} 人（成人 ${pref.adultsCount}，老人 ${pref.elderlyCount}，儿童 ${pref.childrenCount}）`,
    );

    const mealConfig = normalizeMealConfig(pref.mealConfig);
    parts.push(
      `午餐 ${mealConfig.lunch.meatDishes}荤${mealConfig.lunch.vegetableDishes}素${mealConfig.lunch.soups}汤，晚餐 ${mealConfig.dinner.meatDishes}荤${mealConfig.dinner.vegetableDishes}素${mealConfig.dinner.soups}汤`,
    );

    if (pref.flavorNotes?.trim()) {
      parts.push(`口味：${pref.flavorNotes.trim()}`);
    }
    if (pref.likes?.length) parts.push(`喜欢：${pref.likes.slice(0, 12).join('、')}`);
    if (pref.dislikes?.length) {
      parts.push(`不喜欢：${pref.dislikes.slice(0, 12).join('、')}`);
    }
    if (pref.constraints?.length) {
      parts.push(`约束：${pref.constraints.slice(0, 12).join('、')}`);
    }
    return parts.join('；');
  }
}
