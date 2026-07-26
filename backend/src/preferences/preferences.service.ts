import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../recipes/entities/feedback.entity';
import { Recipe } from '../recipes/entities/recipe.entity';
import { UserPreference } from './entities/user-preference.entity';

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
          summaryText: '暂无偏好，按家常均衡口味推荐。',
        }),
      );
    }
    return pref;
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
    if (pref.likes?.length) parts.push(`喜欢：${pref.likes.slice(0, 12).join('、')}`);
    if (pref.dislikes?.length) {
      parts.push(`不喜欢：${pref.dislikes.slice(0, 12).join('、')}`);
    }
    if (pref.constraints?.length) {
      parts.push(`约束：${pref.constraints.slice(0, 12).join('、')}`);
    }
    return parts.length ? parts.join('；') : '暂无偏好，按家常均衡口味推荐。';
  }
}
