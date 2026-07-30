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
import type { ConfirmedMenuSnapshotItem } from '../plans/types/confirmed-menu-snapshot';
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

  async generateWeek(userId: string, weekStartInput?: string) {
    const weekStart = weekStartInput || this.currentMonday();
    const days = Number(this.config.get('PLAN_DAYS', '7'));
    const context = await this.buildContext(userId, weekStart, days);
    const menu = await this.llm.generateMenu(context);
    const validated = await this.validateAndResolveItems(menu.items, context);

    const existing = await this.plansRepo.findOne({
      where: { weekStart, userId },
      relations: { items: { recipe: true } },
    });
    if (existing) {
      await this.plansRepo.remove(existing);
    }

    const plan = this.plansRepo.create({
      userId,
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
    await this.appendHistory(userId, validated);
    return this.getPlan(userId, saved.id);
  }

  async regenerateDay(userId: string, serveDate: string) {
    const weekStart = this.mondayOf(serveDate);
    const planDays = Number(this.config.get('PLAN_DAYS', '7'));
    const context = await this.buildContext(userId, weekStart, planDays);

    let plan = await this.plansRepo.findOne({
      where: { weekStart, userId },
      relations: { items: { recipe: true } },
    });

    const otherDayNames = (plan?.items ?? [])
      .filter((item) => item.serveDate !== serveDate)
      .map((item) => item.recipe.name);

    context.weekStart = serveDate;
    context.days = 1;
    context.blockedRecipeNames = [
      ...new Set([...context.blockedRecipeNames, ...otherDayNames]),
    ];

    const menu = await this.llm.generateMenu(context);
    const validated = await this.validateAndResolveItems(menu.items, context);

    if (plan) {
      const dayItems = plan.items.filter((item) => item.serveDate === serveDate);
      if (dayItems.length) {
        await this.itemsRepo.remove(dayItems);
      }
    } else {
      plan = await this.plansRepo.save(
        this.plansRepo.create({
          userId,
          weekStart,
          status: 'draft',
        }),
      );
    }

    await this.itemsRepo.save(
      validated.map((item) =>
        this.itemsRepo.create({
          planId: plan!.id,
          recipeId: item.recipeId,
          serveDate: item.date,
          mealSlot: item.mealSlot,
          dishType: item.dishType,
          dishCategory: item.dishCategory,
          slotIndex: item.slotIndex,
          reason: item.reason ?? null,
        }),
      ),
    );

    await this.confirmationsRepo.delete({ serveDate, userId });
    await this.appendHistory(userId, validated);
    return this.getPlan(userId, plan!.id);
  }

  async getCurrentPlan(userId: string) {
    return this.getPlanForWeek(userId, this.currentMonday());
  }

  async getPlanForWeek(userId: string, weekStartInput?: string) {
    const weekStart = weekStartInput || this.currentMonday();
    const plan = await this.plansRepo.findOne({
      where: { weekStart, userId },
      relations: { items: { recipe: true } },
      order: { createdAt: 'DESC' },
    });
    if (!plan) {
      throw new NotFoundException('该周还没有菜单，请先生成');
    }
    plan.items.sort(this.sortItems);
    return plan;
  }

  async getDayMenu(userId: string, serveDate: string) {
    const weekStart = this.mondayOf(serveDate);
    const plan = await this.plansRepo.findOne({
      where: { weekStart, userId },
      relations: { items: { recipe: true } },
      order: { createdAt: 'DESC' },
    });

    const dayItems = (plan?.items ?? [])
      .filter((item) => item.serveDate === serveDate)
      .sort(this.sortItems);

    const confirmation = await this.confirmationsRepo.findOne({
      where: { serveDate, userId },
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

  async getMenuHistory(userId: string, limitInput = 30) {
    const limit = Math.min(Math.max(1, limitInput), 100);
    const rows = await this.confirmationsRepo.find({
      where: { userId },
      order: { confirmedAt: 'DESC' },
      take: limit,
    });

    return rows
      .filter((row) => row.snapshot?.length)
      .map((row) => ({
        date: row.serveDate,
        confirmedAt: row.confirmedAt.toISOString(),
        dishCount: row.snapshot?.length ?? 0,
        preview: (row.snapshot ?? [])
          .slice(0, 5)
          .map((item) => item.recipeName),
      }));
  }

  async getMenuHistoryDetail(userId: string, serveDate: string) {
    const row = await this.confirmationsRepo.findOne({
      where: { serveDate, userId },
    });
    if (!row?.snapshot?.length) {
      throw new NotFoundException('没有找到该日期的确认菜单');
    }

    return {
      date: row.serveDate,
      confirmedAt: row.confirmedAt.toISOString(),
      items: row.snapshot,
    };
  }

  async confirmWeekMenu(userId: string, weekStartInput: string) {
    const weekStart = weekStartInput || this.currentMonday();
    const plan = await this.plansRepo.findOne({
      where: { weekStart, userId },
      relations: { items: true },
    });
    if (!plan || plan.items.length === 0) {
      throw new BadRequestException('该周还没有菜单，请先生成预设');
    }

    plan.status = 'confirmed';
    await this.plansRepo.save(plan);
    await this.upsertDayConfirmations(
      userId,
      plan.id,
      [...new Set(plan.items.map((item) => item.serveDate))],
    );
    return this.getPlanForWeek(userId, weekStart);
  }

  async confirmDayMenu(userId: string, serveDate: string) {
    const dayMenu = await this.getDayMenu(userId, serveDate);
    if (!dayMenu.hasMenu || !dayMenu.planId) {
      throw new BadRequestException('这一天还没有菜单，请先生成');
    }

    await this.upsertDayConfirmations(userId, dayMenu.planId, [serveDate]);
    return this.getDayMenu(userId, serveDate);
  }

  private async upsertDayConfirmations(
    userId: string,
    planId: string,
    dates: string[],
  ) {
    const plan = await this.plansRepo.findOne({
      where: { id: planId, userId },
      relations: { items: { recipe: true } },
    });
    if (!plan) return;

    for (const serveDate of dates) {
      const dayItems = plan.items
        .filter((item) => item.serveDate === serveDate)
        .sort(this.sortItems);
      const snapshot = this.buildSnapshot(dayItems);

      const existing = await this.confirmationsRepo.findOne({
        where: { serveDate, userId },
      });
      if (existing) {
        existing.planId = planId;
        existing.snapshot = snapshot;
        await this.confirmationsRepo.save(existing);
      } else {
        await this.confirmationsRepo.save(
          this.confirmationsRepo.create({ userId, serveDate, planId, snapshot }),
        );
      }
    }
  }

  private buildSnapshot(
    items: Array<PlanItem & { recipe: { name: string; tags?: string[] | null; cookMinutes?: number | null } }>,
  ): ConfirmedMenuSnapshotItem[] {
    return items.map((item) => ({
      recipeName: item.recipe.name,
      mealSlot: item.mealSlot,
      dishType: item.dishType ?? 'dish',
      dishCategory: item.dishCategory ?? 'meat',
      slotIndex: item.slotIndex ?? 0,
      tags: item.recipe.tags ?? null,
      cookMinutes: item.recipe.cookMinutes ?? null,
    }));
  }

  async getPlan(userId: string, id: string) {
    const plan = await this.plansRepo.findOne({
      where: { id, userId },
      relations: { items: { recipe: true } },
    });
    if (!plan) {
      throw new NotFoundException(`Plan ${id} not found`);
    }
    plan.items.sort(this.sortItems);
    return plan;
  }

  async rerollItem(userId: string, planId: string, itemId: string) {
    const plan = await this.getPlan(userId, planId);
    const item = plan.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException(`Plan item ${itemId} not found`);
    }

    const days = Number(this.config.get('PLAN_DAYS', '7'));
    const context = await this.buildContext(userId, plan.weekStart, days);
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
    await this.appendHistory(userId, [resolved]);
    return this.getPlan(userId, planId);
  }

  private async appendHistory(
    userId: string,
    items: Array<{
      date: string;
      mealSlot: MealSlot;
      recipeId: string;
    }>,
  ) {
    await this.historyRepo.save(
      items.map((item) =>
        this.historyRepo.create({
          userId,
          recipeId: item.recipeId,
          serveDate: item.date,
          mealSlot: item.mealSlot,
        }),
      ),
    );
  }

  private async buildContext(
    userId: string,
    weekStart: string,
    days: number,
  ): Promise<RecommendContext> {
    const cooldownDays = Number(this.config.get('COOLDOWN_DAYS', '30'));
    const rangeEnd = this.addDays(weekStart, days - 1);
    const rangeStart = this.addDays(weekStart, -(cooldownDays - 1));

    const recent = await this.historyRepo.find({
      where: { userId, serveDate: Between(rangeStart, rangeEnd) },
      relations: { recipe: true },
    });
    const blockedRecipeNames = [
      ...new Set(recent.map((i) => i.recipe.name)),
    ];

    const knownRecipes = await this.recipesService.findAll();
    const pref = await this.preferencesService.getOrCreate(userId);
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
