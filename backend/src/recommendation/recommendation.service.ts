import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { LlmService } from '../llm/llm.service';
import {
  DishCategory,
  DishType,
  LlmMenuItem,
  MealSlot,
  RecommendContext,
} from '../llm/llm.types';
import { ensureDetailedIngredients } from '../llm/ingredient-detail';
import { isPlaceholderDishName, inventRecipeName } from '../llm/mock-dishes';
import { PlanItem } from '../plans/entities/plan-item.entity';
import { RecommendationHistory } from '../plans/entities/recommendation-history.entity';
import { DailyMenuConfirmation } from '../plans/entities/daily-menu-confirmation.entity';
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
    @InjectRepository(DailyMenuConfirmation)
    private readonly confirmationsRepo: Repository<DailyMenuConfirmation>,
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
      await this.clearWeekConfirmations(weekStart, days);
      await this.plansRepo.remove(existing);
    }

    const plan = this.plansRepo.create({
      weekStart,
      status: 'draft',
      items: validated.map((item) =>
        this.itemsRepo.create({
          recipeId: item.recipeId,
          serveDate: item.date,
          mealSlot: item.mealSlot,
          dishType: item.dishType,
          dishCategory: item.dishCategory,
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
    return this.getPlanForWeek(this.currentMonday());
  }

  async getPlanForWeek(weekStartInput?: string) {
    const weekStart = weekStartInput || this.currentMonday();
    const plan = await this.plansRepo.findOne({
      where: { weekStart },
      relations: { items: { recipe: true } },
      order: { createdAt: 'DESC' },
    });
    if (!plan) {
      throw new NotFoundException('该周还没有菜单，请先生成');
    }
    plan.items.sort(this.sortItems);
    return plan;
  }

  async getDayMenu(serveDate: string) {
    const weekStart = this.mondayOf(serveDate);
    const plan = await this.plansRepo.findOne({
      where: { weekStart },
      relations: { items: { recipe: true } },
      order: { createdAt: 'DESC' },
    });

    const dayItems = (plan?.items ?? [])
      .filter((item) => item.serveDate === serveDate)
      .sort(this.sortItems);

    const confirmation = await this.confirmationsRepo.findOne({
      where: { serveDate },
    });

    return {
      date: serveDate,
      weekStart,
      planId: plan?.id ?? null,
      weekStatus: plan?.status ?? null,
      hasMenu: dayItems.length > 0,
      confirmed: Boolean(confirmation),
      confirmedAt: confirmation?.confirmedAt?.toISOString() ?? null,
      items: dayItems,
    };
  }

  async confirmWeekMenu(weekStartInput: string) {
    const weekStart = weekStartInput || this.currentMonday();
    const plan = await this.plansRepo.findOne({
      where: { weekStart },
      relations: { items: true },
    });
    if (!plan || plan.items.length === 0) {
      throw new BadRequestException('该周还没有菜单，请先生成预设');
    }

    plan.status = 'confirmed';
    await this.plansRepo.save(plan);
    await this.upsertDayConfirmations(
      plan.id,
      [...new Set(plan.items.map((item) => item.serveDate))],
    );
    return this.getPlanForWeek(weekStart);
  }

  async confirmDayMenu(serveDate: string) {
    const dayMenu = await this.getDayMenu(serveDate);
    if (!dayMenu.hasMenu || !dayMenu.planId) {
      throw new BadRequestException('这一天还没有菜单，请先生成');
    }

    await this.upsertDayConfirmations(dayMenu.planId, [serveDate]);
    return this.getDayMenu(serveDate);
  }

  private async upsertDayConfirmations(planId: string, dates: string[]) {
    for (const serveDate of dates) {
      const existing = await this.confirmationsRepo.findOne({
        where: { serveDate },
      });
      if (existing) {
        existing.planId = planId;
        await this.confirmationsRepo.save(existing);
      } else {
        await this.confirmationsRepo.save(
          this.confirmationsRepo.create({ serveDate, planId }),
        );
      }
    }
  }

  private async clearWeekConfirmations(weekStart: string, days: number) {
    const dates = Array.from({ length: days }, (_, i) =>
      this.addDays(weekStart, i),
    );
    await this.confirmationsRepo.delete({ serveDate: In(dates) });
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
      dishCategory: item.dishCategory ?? 'meat',
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
        `LLM item count ${working.length} != expected ${expectedCount}, filling gaps`,
      );
      working = this.llm
        .mockMenu(context)
        .items.slice(0, expectedCount)
        .map((item, index) => ({
          ...item,
          date: expectedSlots[index].date,
          mealSlot: expectedSlots[index].mealSlot,
          dishType: expectedSlots[index].dishType,
          dishCategory: expectedSlots[index].dishCategory,
          slotIndex: expectedSlots[index].slotIndex,
          recipeName:
            working[index]?.recipeName?.trim() || item.recipeName,
        }));
    } else {
      const mockItems = this.llm.mockMenu(context).items;
      working = working.map((item, index) => {
        const name = item?.recipeName?.trim();
        if (name && !isPlaceholderDishName(name)) {
          return item;
        }
        return {
          ...mockItems[index],
          date: expectedSlots[index].date,
          mealSlot: expectedSlots[index].mealSlot,
          dishType: expectedSlots[index].dishType,
          dishCategory: expectedSlots[index].dishCategory,
          slotIndex: expectedSlots[index].slotIndex,
        };
      });
    }

    const used = new Set<string>();
    const resolved: Array<{
      date: string;
      mealSlot: MealSlot;
      dishType: DishType;
      dishCategory: DishCategory;
      slotIndex: number;
      recipeId: string;
      reason?: string;
    }> = [];

    const people =
      context.familyComposition.adults +
      context.familyComposition.elderly +
      context.familyComposition.children;

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
        (blocked.has(name.toLowerCase()) ||
          used.has(name.toLowerCase()) ||
          isPlaceholderDishName(name)) &&
        guard < 20
      ) {
        const replacement = this.llm.mockMenu({
          ...context,
          target: {
            date: slot.date,
            mealSlot: slot.mealSlot,
            dishType: slot.dishType,
            dishCategory: slot.dishCategory,
            slotIndex: slot.slotIndex,
            avoidNames: [...used, ...blocked],
          },
          blockedRecipeNames: [...blocked],
        });
        const next = replacement.items[0];
        const invented = inventRecipeName(
          slot.dishCategory ?? 'meat',
          used,
          blocked,
        );
        name = next?.recipeName?.trim() || invented.name;
        if (isPlaceholderDishName(name)) {
          name = invented.name;
        }
        description = next?.description;
        ingredients = next?.ingredients;
        tags = next?.tags;
        cookMinutes = next?.cookMinutes;
        difficulty = next?.difficulty;
        reason = next?.reason;
        guard += 1;
      }

      if (
        blocked.has(name.toLowerCase()) ||
        used.has(name.toLowerCase()) ||
        isPlaceholderDishName(name)
      ) {
        throw new BadRequestException(
          `无法在冷却规则下生成合法菜品，冲突菜名：${name}`,
        );
      }

      const recipe = await this.recipesService.findOrCreateFromLlm({
        name,
        description,
        ingredients: ensureDetailedIngredients(name, ingredients, Math.max(1, people)),
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
        dishCategory: slot.dishCategory,
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
        dishCategory: slots[index].dishCategory,
        slotIndex: slots[index].slotIndex,
      }));
    }
    return items.slice(0, slots.length);
  }

  private mondayOf(dateStr: string) {
    const date = new Date(`${dateStr}T00:00:00`);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    return this.formatDate(date);
  }

  private currentMonday() {
    return this.mondayOf(this.formatDate(new Date()));
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
