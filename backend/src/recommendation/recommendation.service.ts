import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { LlmService } from '../llm/llm.service';
import {
  DishType,
  LlmMenuItem,
  MealSlot,
  RecommendContext,
} from '../llm/llm.types';
import { PlanItem } from '../plans/entities/plan-item.entity';
import { RecommendationHistory } from '../plans/entities/recommendation-history.entity';
import { WeekPlan } from '../plans/entities/week-plan.entity';
import { PreferencesService } from '../preferences/preferences.service';
import { RecipesService } from '../recipes/recipes.service';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly mealSlots: MealSlot[] = ['lunch', 'dinner'];

  constructor(
    private readonly config: ConfigService,
    private readonly llm: LlmService,
    private readonly recipesService: RecipesService,
    private readonly preferencesService: PreferencesService,
    @InjectRepository(WeekPlan)
    private readonly plansRepo: Repository<WeekPlan>,
    @InjectRepository(PlanItem)
    private readonly itemsRepo: Repository<PlanItem>,
    @InjectRepository(RecommendationHistory)
    private readonly historyRepo: Repository<RecommendationHistory>,
  ) {}

  async generateWeek(weekStartInput?: string) {
    const weekStart = weekStartInput || this.currentMonday();
    const days = Number(this.config.get('PLAN_DAYS', '7'));
    const context = await this.buildContext(weekStart, days);
    const menu = await this.llm.generateMenu(context);
    const validated = await this.validateAndResolveItems(menu.items, context);

    const existing = await this.plansRepo.findOne({
      where: { weekStart },
      relations: { items: { recipe: true } },
    });
    if (existing) {
      await this.plansRepo.remove(existing);
    }

    const plan = this.plansRepo.create({
      weekStart,
      status: 'active',
      items: validated.map((item) =>
        this.itemsRepo.create({
          recipeId: item.recipeId,
          serveDate: item.date,
          mealSlot: item.mealSlot,
          dishType: item.dishType,
          slotIndex: item.slotIndex,
          reason: item.reason ?? null,
        }),
      ),
    });
    const saved = await this.plansRepo.save(plan);
    await this.appendHistory(validated);
    return this.getPlan(saved.id);
  }

  async getCurrentPlan() {
    const weekStart = this.currentMonday();
    const plan = await this.plansRepo.findOne({
      where: { weekStart },
      relations: { items: { recipe: true } },
      order: { createdAt: 'DESC' },
    });
    if (!plan) {
      throw new NotFoundException('当前周还没有菜单，请先调用 /plans/generate');
    }
    plan.items.sort(this.sortItems);
    return plan;
  }

  async getPlan(id: string) {
    const plan = await this.plansRepo.findOne({
      where: { id },
      relations: { items: { recipe: true } },
    });
    if (!plan) {
      throw new NotFoundException(`Plan ${id} not found`);
    }
    plan.items.sort(this.sortItems);
    return plan;
  }

  async rerollItem(planId: string, itemId: string) {
    const plan = await this.getPlan(planId);
    const item = plan.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException(`Plan item ${itemId} not found`);
    }

    const days = Number(this.config.get('PLAN_DAYS', '7'));
    const context = await this.buildContext(plan.weekStart, days);
    const weekNames = plan.items
      .filter((i) => i.id !== item.id)
      .map((i) => i.recipe.name);
    context.target = {
      date: item.serveDate,
      mealSlot: item.mealSlot,
      dishType: item.dishType ?? 'dish',
      slotIndex: item.slotIndex ?? 0,
      avoidNames: weekNames,
    };
    context.blockedRecipeNames = [
      ...new Set([
        ...context.blockedRecipeNames,
        ...weekNames,
        item.recipe.name,
      ]),
    ];

    const menu = await this.llm.generateMenu(context);
    const [resolved] = await this.validateAndResolveItems(menu.items, context);
    if (!resolved) {
      throw new BadRequestException('换菜失败：未能生成合法菜品');
    }

    await this.itemsRepo.update(item.id, {
      recipeId: resolved.recipeId,
      reason: resolved.reason ?? '换菜',
    });
    await this.appendHistory([resolved]);
    return this.getPlan(planId);
  }

  private async appendHistory(
    items: Array<{
      date: string;
      mealSlot: MealSlot;
      recipeId: string;
    }>,
  ) {
    await this.historyRepo.save(
      items.map((item) =>
        this.historyRepo.create({
          recipeId: item.recipeId,
          serveDate: item.date,
          mealSlot: item.mealSlot,
        }),
      ),
    );
  }

  private async buildContext(
    weekStart: string,
    days: number,
  ): Promise<RecommendContext> {
    const cooldownDays = Number(this.config.get('COOLDOWN_DAYS', '30'));
    const rangeEnd = this.addDays(weekStart, days - 1);
    const rangeStart = this.addDays(weekStart, -(cooldownDays - 1));

    const recent = await this.historyRepo.find({
      where: { serveDate: Between(rangeStart, rangeEnd) },
      relations: { recipe: true },
    });
    const blockedRecipeNames = [
      ...new Set(recent.map((i) => i.recipe.name)),
    ];

    const knownRecipes = await this.recipesService.findAll();
    const pref = await this.preferencesService.getOrCreate();
    const mealConfig = this.preferencesService.getMealConfig(pref);

    return {
      weekStart,
      days,
      mealSlots: this.mealSlots,
      mealConfig,
      familyComposition: {
        adults: pref.adultsCount,
        elderly: pref.elderlyCount,
        children: pref.childrenCount,
      },
      flavorNotes: pref.flavorNotes ?? undefined,
      blockedRecipeNames,
      knownRecipes: knownRecipes.map((r) => ({
        name: r.name,
        tags: r.tags,
        cookMinutes: r.cookMinutes,
      })),
      preferenceSummary: pref.summaryText ?? '',
      likes: pref.likes ?? [],
      dislikes: pref.dislikes ?? [],
      constraints: pref.constraints ?? [],
    };
  }

  private async validateAndResolveItems(
    items: LlmMenuItem[],
    context: RecommendContext,
  ) {
    const blocked = new Set(
      context.blockedRecipeNames.map((n) => n.trim().toLowerCase()),
    );
    if (context.target) {
      for (const name of context.target.avoidNames) {
        blocked.add(name.trim().toLowerCase());
      }
    }

    const expectedSlots = this.llm.buildSlots(context);
    const expectedCount = expectedSlots.length;
    let working = this.alignItemsToSlots(items, expectedSlots);

    if (working.length !== expectedCount) {
      this.logger.warn(
        `LLM item count ${working.length} != expected ${expectedCount}, regenerating via mock fallback`,
      );
      working = this.alignItemsToSlots(
        this.llm.mockMenu(context).items,
        expectedSlots,
      );
    }

    const used = new Set<string>();
    const resolved: Array<{
      date: string;
      mealSlot: MealSlot;
      dishType: DishType;
      slotIndex: number;
      recipeId: string;
      reason?: string;
    }> = [];

    for (let i = 0; i < expectedCount; i++) {
      const slot = expectedSlots[i];
      const item = working[i];
      let name = item?.recipeName?.trim();
      if (!name) {
        throw new BadRequestException('模型返回了空菜名');
      }

      let guard = 0;
      let description = item.description;
      let ingredients = item.ingredients;
      let tags = item.tags;
      let cookMinutes = item.cookMinutes;
      let difficulty = item.difficulty;
      let reason = item.reason;

      while (
        (blocked.has(name.toLowerCase()) || used.has(name.toLowerCase())) &&
        guard < 20
      ) {
        const replacement = this.llm.mockMenu({
          ...context,
          target: {
            date: slot.date,
            mealSlot: slot.mealSlot,
            dishType: slot.dishType,
            slotIndex: slot.slotIndex,
            avoidNames: [...used, ...blocked],
          },
          blockedRecipeNames: [...blocked],
        });
        const next = replacement.items[0];
        name = next?.recipeName?.trim() || `家常小炒${guard}`;
        description = next?.description;
        ingredients = next?.ingredients;
        tags = next?.tags;
        cookMinutes = next?.cookMinutes;
        difficulty = next?.difficulty;
        reason = next?.reason;
        guard += 1;
      }

      if (blocked.has(name.toLowerCase()) || used.has(name.toLowerCase())) {
        throw new BadRequestException(
          `无法在冷却规则下生成合法菜品，冲突菜名：${name}`,
        );
      }

      const recipe = await this.recipesService.findOrCreateFromLlm({
        name,
        description,
        ingredients,
        tags,
        cookMinutes,
        difficulty,
      });

      used.add(name.toLowerCase());
      blocked.add(name.toLowerCase());
      resolved.push({
        date: slot.date,
        mealSlot: slot.mealSlot,
        dishType: slot.dishType,
        slotIndex: slot.slotIndex,
        recipeId: recipe.id,
        reason,
      });
    }

    return resolved;
  }

  private alignItemsToSlots(items: LlmMenuItem[], slots: ReturnType<LlmService['buildSlots']>) {
    if (items.length === slots.length) {
      return items.map((item, index) => ({
        ...item,
        date: slots[index].date,
        mealSlot: slots[index].mealSlot,
        dishType: slots[index].dishType,
        slotIndex: slots[index].slotIndex,
      }));
    }
    return items.slice(0, slots.length);
  }

  private currentMonday() {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() + diff);
    return this.formatDate(monday);
  }

  private addDays(dateStr: string, days: number) {
    const date = new Date(`${dateStr}T00:00:00`);
    date.setDate(date.getDate() + days);
    return this.formatDate(date);
  }

  private formatDate(date: Date) {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private sortItems = (a: PlanItem, b: PlanItem) => {
    if (a.serveDate !== b.serveDate) {
      return a.serveDate.localeCompare(b.serveDate);
    }
    if (a.mealSlot !== b.mealSlot) {
      return a.mealSlot.localeCompare(b.mealSlot);
    }
    if ((a.dishType ?? 'dish') !== (b.dishType ?? 'dish')) {
      return (a.dishType ?? 'dish').localeCompare(b.dishType ?? 'dish');
    }
    return (a.slotIndex ?? 0) - (b.slotIndex ?? 0);
  };
}
