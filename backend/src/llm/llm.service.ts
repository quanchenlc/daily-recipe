import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  DEFAULT_MEAL_CONFIG,
  normalizeMealConfig,
  totalItemsForWeek,
} from '../preferences/preference.types';
import { ensureDetailedIngredients } from './ingredient-detail';
import {
  inventRecipeName,
  isVegetableDish,
  MOCK_DISHES,
  MOCK_SOUPS,
} from './mock-dishes';
import {
  DishCategory,
  DishType,
  LlmMenuItem,
  LlmMenuResult,
  MealSlot,
  RecommendContext,
} from './llm.types';

interface MenuSlot {
  date: string;
  mealSlot: MealSlot;
  dishType: DishType;
  dishCategory: DishCategory;
  slotIndex: number;
}

/** Single LLM call handles at most this many items reliably */
const SINGLE_CALL_ITEM_LIMIT = 12;

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return Boolean(this.config.get<string>('LLM_API_KEY')?.trim());
  }

  async generateMenu(context: RecommendContext): Promise<LlmMenuResult> {
    if (!this.isConfigured()) {
      this.logger.warn('LLM_API_KEY empty, using mock menu generator');
      return this.mockMenu(context);
    }

    if (context.target) {
      return this.generateOnceWithRetry(context);
    }

    const mealConfig = context.mealConfig ?? DEFAULT_MEAL_CONFIG;
    const total = totalItemsForWeek(context.days, mealConfig);

    if (total <= SINGLE_CALL_ITEM_LIMIT) {
      return this.generateOnceWithRetry(context);
    }

    return this.generateByDay(context);
  }

  private async generateByDay(context: RecommendContext): Promise<LlmMenuResult> {
    const items: LlmMenuItem[] = [];
    const usedInWeek: string[] = [];

    for (let d = 0; d < context.days; d++) {
      const date = this.addDays(context.weekStart, d);
      const dayContext: RecommendContext = {
        ...context,
        weekStart: date,
        days: 1,
        blockedRecipeNames: [
          ...new Set([...context.blockedRecipeNames, ...usedInWeek]),
        ],
      };

      try {
        const dayResult = await this.generateOnceWithRetry(dayContext);
        items.push(...dayResult.items);
        usedInWeek.push(...dayResult.items.map((i) => i.recipeName));
      } catch (error) {
        this.logger.warn(
          `Day ${date} LLM failed, using mock fallback: ${String(error)}`,
        );
        const fallback = this.mockMenu(dayContext);
        items.push(...fallback.items);
        usedInWeek.push(...fallback.items.map((i) => i.recipeName));
      }
    }

    return { weekStart: context.weekStart, items };
  }

  private async generateOnceWithRetry(
    context: RecommendContext,
  ): Promise<LlmMenuResult> {
    const maxRetries = Number(this.config.get('LLM_MAX_RETRIES', '2'));
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const content = await this.callChat(context);
        const parsed = this.parseMenu(content, context);
        const expected = this.buildSlots(context).length;
        if (parsed.items.length !== expected) {
          this.logger.warn(
            `LLM returned ${parsed.items.length} items, expected ${expected}`,
          );
          return this.fillMissingSlots(parsed.items, context);
        }
        return parsed;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `LLM generate attempt ${attempt + 1} failed: ${String(error)}`,
        );
      }
    }
    throw new BadGatewayException(
      `LLM failed after retries: ${String(lastError)}`,
    );
  }

  private fillMissingSlots(
    partial: LlmMenuItem[],
    context: RecommendContext,
  ): LlmMenuResult {
    const slots = this.buildSlots(context);
    const aligned = this.alignToSlots(partial, slots);
    const used = new Set(aligned.map((i) => i.recipeName));
    const blocked = new Set(
      [
        ...context.blockedRecipeNames,
        ...(context.target?.avoidNames ?? []),
      ].map((n) => n.trim()),
    );
    const people = familySize(context);

    const filled = aligned.map((item, index) => {
      if (item?.recipeName?.trim()) {
        return this.enrichItem(item, people);
      }
      const slot = slots[index];
      const invented = inventRecipeName(slot.dishCategory, used, blocked);
      used.add(invented.name);
      return {
        date: slot.date,
        mealSlot: slot.mealSlot,
        dishType: slot.dishType,
        dishCategory: slot.dishCategory,
        slotIndex: slot.slotIndex,
        recipeName: invented.name,
        reason: '补充推荐',
        description: `${invented.name}，适合家庭日常。`,
        ingredients: ensureDetailedIngredients(
          invented.name,
          invented.ingredients,
          people,
        ),
        tags: invented.tags,
        cookMinutes: invented.cookMinutes,
        difficulty: invented.difficulty,
      };
    });

    return { weekStart: context.weekStart, items: filled };
  }

  private enrichItem(item: LlmMenuItem, people: number): LlmMenuItem {
    return {
      ...item,
      ingredients: ensureDetailedIngredients(
        item.recipeName,
        item.ingredients,
        people,
      ),
    };
  }

  private alignToSlots(items: LlmMenuItem[], slots: MenuSlot[]): LlmMenuItem[] {
    const result: LlmMenuItem[] = [];
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      result.push(
        items[i]
          ? {
              ...items[i],
              date: slot.date,
              mealSlot: slot.mealSlot,
              dishType: slot.dishType,
              dishCategory: slot.dishCategory,
              slotIndex: slot.slotIndex,
            }
          : {
              date: slot.date,
              mealSlot: slot.mealSlot,
              dishType: slot.dishType,
              dishCategory: slot.dishCategory,
              slotIndex: slot.slotIndex,
              recipeName: '',
            },
      );
    }
    return result;
  }

  buildSlots(context: RecommendContext): MenuSlot[] {
    const mealConfig = normalizeMealConfig(context.mealConfig);

    if (context.target) {
      return [
        {
          date: context.target.date,
          mealSlot: context.target.mealSlot,
          dishType: context.target.dishType,
          dishCategory: context.target.dishCategory,
          slotIndex: context.target.slotIndex,
        },
      ];
    }

    const slots: MenuSlot[] = [];
    for (let i = 0; i < context.days; i++) {
      const date = this.addDays(context.weekStart, i);
      for (const mealSlot of context.mealSlots) {
        const cfg = mealConfig[mealSlot];
        for (let j = 0; j < cfg.meatDishes; j++) {
          slots.push({
            date,
            mealSlot,
            dishType: 'dish',
            dishCategory: 'meat',
            slotIndex: j,
          });
        }
        for (let j = 0; j < cfg.vegetableDishes; j++) {
          slots.push({
            date,
            mealSlot,
            dishType: 'dish',
            dishCategory: 'vegetable',
            slotIndex: j,
          });
        }
        for (let j = 0; j < cfg.soups; j++) {
          slots.push({
            date,
            mealSlot,
            dishType: 'soup',
            dishCategory: 'soup',
            slotIndex: j,
          });
        }
      }
    }
    return slots;
  }

  private mealInstruction(context: RecommendContext): string {
    const mealConfig = normalizeMealConfig(context.mealConfig);
    const expectedCount = context.target
      ? 1
      : totalItemsForWeek(context.days, mealConfig);

    if (context.target) {
      const cat =
        context.target.dishCategory === 'vegetable'
          ? '素菜'
          : context.target.dishCategory === 'meat'
            ? '荤菜'
            : '汤';
      return `只生成 1 道${cat}，替换 ${context.target.date} 的 ${context.target.mealSlot}（dishCategory=${context.target.dishCategory}, slotIndex=${context.target.slotIndex}）。`;
    }

    const l = mealConfig.lunch;
    const d = mealConfig.dinner;
    return `生成 ${context.days} 天。每餐荤素搭配：午餐 ${l.meatDishes}荤+${l.vegetableDishes}素+${l.soups}汤，晚餐 ${d.meatDishes}荤+${d.vegetableDishes}素+${d.soups}汤，共 ${expectedCount} 条。荤菜 tags 含「荤菜」，素菜 tags 含「素菜」，汤品 tags 含「汤品」。`;
  }

  private async callChat(context: RecommendContext) {
    const baseUrl = this.config
      .get<string>('LLM_BASE_URL', 'https://api.openai.com/v1')
      .replace(/\/$/, '');
    const model = this.config.get<string>('LLM_MODEL', 'gpt-4o-mini');
    const apiKey = this.config.get<string>('LLM_API_KEY', '');
    const timeout = Number(this.config.get('LLM_TIMEOUT_MS', '90000'));

    const system = `你是家庭周菜单助手。按中式家庭餐桌习惯推荐午餐和晚餐，每餐荤素搭配。必须输出严格 JSON，不要 markdown。
规则：
1. 不要推荐 blockedRecipeNames 中的菜
2. 同一周内菜名不能重复
3. recipeName 必须是具体中式菜名，禁止占位名
4. 每餐必须有荤有素（按 mealConfig 的 meatDishes / vegetableDishes 数量）
5. dishCategory: meat=荤菜, vegetable=素菜, soup=汤品；tags 必须含对应标签
6. ingredients 至少 6 条，格式「食材名 数量单位」，须包含主料、配菜、调味料（如姜蒜、生抽、料酒、盐、油等），按 familyComposition 估算份量
7. 示例水煮牛肉 ingredients: ["牛肉 400g","豆芽 200g","生菜 150g","干辣椒 15g","花椒 5g","豆瓣酱 2勺","姜 3片","蒜 3瓣","料酒 1勺","淀粉 1勺","食用油 适量"]
8. items 数量必须严格等于要求
9. JSON schema:
{"weekStart":"YYYY-MM-DD","items":[{"date":"YYYY-MM-DD","mealSlot":"lunch|dinner","dishType":"dish|soup","dishCategory":"meat|vegetable|soup","slotIndex":0,"recipeName":"string","reason":"string","description":"string","ingredients":["string"],"tags":["string"],"cookMinutes":30,"difficulty":"简单|中等|困难"}]}`;

    const userPayload = {
      ...context,
      mealConfig: normalizeMealConfig(context.mealConfig),
      instruction: this.mealInstruction(context),
    };

    const payload: Record<string, unknown> = {
      model,
      temperature: 0.8,
      max_tokens: 8192,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(userPayload) },
      ],
      response_format: { type: 'json_object' },
    };

    if (baseUrl.includes('deepseek') || model.includes('deepseek')) {
      payload.thinking = { type: 'disabled' };
    }

    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      payload,
      {
        timeout,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new ServiceUnavailableException('LLM returned empty content');
    }
    return content;
  }

  private parseMenu(content: string, context: RecommendContext): LlmMenuResult {
    const cleaned = content
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned) as LlmMenuResult;
    if (!parsed?.items || !Array.isArray(parsed.items)) {
      throw new Error('Invalid LLM JSON: missing items');
    }
    const slots = this.buildSlots(context);
    const people = familySize(context);
    parsed.weekStart = parsed.weekStart || context.weekStart;
    parsed.items = parsed.items.map((item, index) => {
      const slot = slots[index];
      const dishCategory =
        item.dishCategory === 'vegetable' ||
        item.dishCategory === 'meat' ||
        item.dishCategory === 'soup'
          ? item.dishCategory
          : slot?.dishCategory ?? 'meat';
      return this.enrichItem(
        {
          ...item,
          mealSlot: item.mealSlot === 'lunch' ? 'lunch' : 'dinner',
          dishType: item.dishType === 'soup' ? 'soup' : 'dish',
          dishCategory,
          slotIndex:
            typeof item.slotIndex === 'number' ? item.slotIndex : index,
          recipeName: String(item.recipeName).trim(),
        },
        people,
      );
    });
    return parsed;
  }

  /** Public for backend cooldown fallback when LLM returns blocked dishes. */
  mockMenu(context: RecommendContext): LlmMenuResult {
    const blocked = new Set(
      [
        ...context.blockedRecipeNames,
        ...(context.target?.avoidNames ?? []),
        ...context.dislikes,
      ].map((n) => n.trim()),
    );
    const people = familySize(context);

    const meatPool = [
      ...MOCK_DISHES.filter((d) => !isVegetableDish(d)),
      ...context.knownRecipes
        .filter(
          (r) =>
            !(r.tags ?? []).includes('汤品') &&
            !(r.tags ?? []).includes('素菜'),
        )
        .map((r) => ({
          name: r.name,
          tags: r.tags ?? ['荤菜'],
          ingredients: [] as string[],
          cookMinutes: r.cookMinutes ?? 30,
          difficulty: '中等',
        })),
    ].filter((d) => !blocked.has(d.name));

    const vegPool = [
      ...MOCK_DISHES.filter((d) => isVegetableDish(d)),
      ...context.knownRecipes
        .filter((r) => (r.tags ?? []).includes('素菜'))
        .map((r) => ({
          name: r.name,
          tags: r.tags ?? ['素菜'],
          ingredients: [] as string[],
          cookMinutes: r.cookMinutes ?? 15,
          difficulty: '简单',
        })),
    ].filter((d) => !blocked.has(d.name));

    const soupPool = [
      ...MOCK_SOUPS,
      ...context.knownRecipes
        .filter((r) => (r.tags ?? []).includes('汤品'))
        .map((r) => ({
          name: r.name,
          tags: r.tags ?? ['汤品'],
          ingredients: [] as string[],
          cookMinutes: r.cookMinutes ?? 40,
          difficulty: '简单',
        })),
    ].filter((d) => !blocked.has(d.name));

    const shuffledMeat = [...meatPool].sort(() => Math.random() - 0.5);
    const shuffledVeg = [...vegPool].sort(() => Math.random() - 0.5);
    const shuffledSoups = [...soupPool].sort(() => Math.random() - 0.5);
    const picked: LlmMenuItem[] = [];
    const used = new Set<string>();

    const pickFromPool = (
      pool: typeof MOCK_DISHES,
      category: DishCategory,
    ) => {
      const dish = pool.find((d) => !used.has(d.name) && !blocked.has(d.name));
      if (dish) {
        used.add(dish.name);
        return {
          ...dish,
          ingredients: ensureDetailedIngredients(dish.name, dish.ingredients, people),
        };
      }
      const invented = inventRecipeName(category, used, blocked);
      used.add(invented.name);
      return {
        ...invented,
        ingredients: ensureDetailedIngredients(
          invented.name,
          invented.ingredients,
          people,
        ),
      };
    };

    for (const slot of this.buildSlots(context)) {
      const pool =
        slot.dishCategory === 'soup'
          ? shuffledSoups
          : slot.dishCategory === 'vegetable'
            ? shuffledVeg
            : shuffledMeat;
      const dish = pickFromPool(pool, slot.dishCategory);

      picked.push({
        date: slot.date,
        mealSlot: slot.mealSlot,
        dishType: slot.dishType,
        dishCategory: slot.dishCategory,
        slotIndex: slot.slotIndex,
        recipeName: dish.name,
        reason: this.isConfigured()
          ? '补充推荐'
          : '本地 mock 推荐（未配置 LLM_API_KEY）',
        description: `${dish.name}，适合家庭日常。`,
        ingredients: dish.ingredients,
        tags: dish.tags,
        cookMinutes: dish.cookMinutes,
        difficulty: dish.difficulty,
      });
    }

    return { weekStart: context.weekStart, items: picked };
  }

  private addDays(dateStr: string, days: number) {
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }
}

function familySize(context: RecommendContext) {
  const f = context.familyComposition;
  return Math.max(1, f.adults + f.elderly + f.children);
}
