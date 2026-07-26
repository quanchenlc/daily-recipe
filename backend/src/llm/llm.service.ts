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
  totalItemsForWeek,
} from '../preferences/preference.types';
import {
  inventRecipeName,
  MOCK_DISHES,
  MOCK_SOUPS,
} from './mock-dishes';
import {
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

    const filled = aligned.map((item, index) => {
      if (item?.recipeName?.trim()) return item;
      const slot = slots[index];
      const invented = inventRecipeName(slot.dishType, used, blocked);
      used.add(invented.name);
      return {
        date: slot.date,
        mealSlot: slot.mealSlot,
        dishType: slot.dishType,
        slotIndex: slot.slotIndex,
        recipeName: invented.name,
        reason: '补充推荐',
        description: `${invented.name}，适合家庭日常。`,
        ingredients: invented.ingredients,
        tags: invented.tags,
        cookMinutes: invented.cookMinutes,
        difficulty: invented.difficulty,
      };
    });

    return { weekStart: context.weekStart, items: filled };
  }

  private alignToSlots(items: LlmMenuItem[], slots: MenuSlot[]): LlmMenuItem[] {
    if (items.length === slots.length) {
      return items.map((item, i) => ({
        ...item,
        date: slots[i].date,
        mealSlot: slots[i].mealSlot,
        dishType: slots[i].dishType,
        slotIndex: slots[i].slotIndex,
      }));
    }
    const result: LlmMenuItem[] = [];
    for (let i = 0; i < slots.length; i++) {
      result.push(
        items[i] ?? {
          date: slots[i].date,
          mealSlot: slots[i].mealSlot,
          dishType: slots[i].dishType,
          slotIndex: slots[i].slotIndex,
          recipeName: '',
        },
      );
    }
    return result;
  }

  buildSlots(context: RecommendContext): MenuSlot[] {
    if (context.target) {
      return [
        {
          date: context.target.date,
          mealSlot: context.target.mealSlot,
          dishType: context.target.dishType,
          slotIndex: context.target.slotIndex,
        },
      ];
    }

    const mealConfig = context.mealConfig ?? DEFAULT_MEAL_CONFIG;
    const slots: MenuSlot[] = [];
    for (let i = 0; i < context.days; i++) {
      const date = this.addDays(context.weekStart, i);
      for (const mealSlot of context.mealSlots) {
        const cfg = mealConfig[mealSlot];
        for (let j = 0; j < cfg.dishes; j++) {
          slots.push({ date, mealSlot, dishType: 'dish', slotIndex: j });
        }
        for (let j = 0; j < cfg.soups; j++) {
          slots.push({ date, mealSlot, dishType: 'soup', slotIndex: j });
        }
      }
    }
    return slots;
  }

  private async callChat(context: RecommendContext) {
    const baseUrl = this.config
      .get<string>('LLM_BASE_URL', 'https://api.openai.com/v1')
      .replace(/\/$/, '');
    const model = this.config.get<string>('LLM_MODEL', 'gpt-4o-mini');
    const apiKey = this.config.get<string>('LLM_API_KEY', '');
    const timeout = Number(this.config.get('LLM_TIMEOUT_MS', '90000'));
    const mealConfig = context.mealConfig ?? DEFAULT_MEAL_CONFIG;
    const expectedCount = context.target
      ? 1
      : totalItemsForWeek(context.days, mealConfig);

    const system = `你是家庭周菜单助手。按中式家庭餐桌习惯推荐午餐和晚餐，每餐可包含多道菜和多道汤。必须输出严格 JSON，不要 markdown。
规则：
1. 不要推荐 blockedRecipeNames 中的菜
2. 同一周内菜名不能重复
3. recipeName 必须是具体的中式菜名（如「番茄炒蛋」「冬瓜排骨汤」），禁止用「家常菜1」「时令菜」等占位名
4. 结合家庭人数、口味备注、likes/dislikes/constraints
5. 有儿童时适当清淡少辣；有老人时避免过硬难嚼
6. dishType 为 dish 表示主菜/配菜，soup 表示汤品；汤品 tags 应含「汤品」
7. ingredients 每条格式必须为「食材名 数量单位」，按 familyComposition 总人数估算份量，例如「排骨 500g」「番茄 2个」「姜 3片」，禁止只写食材名
8. items 数量必须严格等于要求数量
9. JSON schema:
{"weekStart":"YYYY-MM-DD","items":[{"date":"YYYY-MM-DD","mealSlot":"lunch|dinner","dishType":"dish|soup","slotIndex":0,"recipeName":"string","reason":"string","description":"string","ingredients":["string"],"tags":["string"],"cookMinutes":30,"difficulty":"简单|中等|困难"}]}`;

    const userPayload = {
      ...context,
      instruction: context.target
        ? `只生成 1 道${context.target.dishType === 'soup' ? '汤' : '菜'}，替换 ${context.target.date} 的 ${context.target.mealSlot}（slotIndex=${context.target.slotIndex}）。不要使用 avoidNames。`
        : `生成 ${context.days} 天菜单。每天午餐 ${mealConfig.lunch.dishes} 道菜 + ${mealConfig.lunch.soups} 道汤，晚餐 ${mealConfig.dinner.dishes} 道菜 + ${mealConfig.dinner.soups} 道汤，共 ${expectedCount} 条 items，每条必须有具体菜名。`,
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
    parsed.weekStart = parsed.weekStart || context.weekStart;
    parsed.items = parsed.items.map((item, index) => ({
      ...item,
      mealSlot: item.mealSlot === 'lunch' ? 'lunch' : 'dinner',
      dishType: item.dishType === 'soup' ? 'soup' : 'dish',
      slotIndex: typeof item.slotIndex === 'number' ? item.slotIndex : index,
      recipeName: String(item.recipeName).trim(),
    }));
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

    const dishPool = [
      ...MOCK_DISHES,
      ...context.knownRecipes
        .filter((r) => !(r.tags ?? []).includes('汤品'))
        .map((r) => ({
          name: r.name,
          tags: r.tags ?? [],
          ingredients: [] as string[],
          cookMinutes: r.cookMinutes ?? 30,
          difficulty: '中等',
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

    const shuffledDishes = [...dishPool].sort(() => Math.random() - 0.5);
    const shuffledSoups = [...soupPool].sort(() => Math.random() - 0.5);
    const picked: LlmMenuItem[] = [];
    const used = new Set<string>();

    const pickFromPool = (
      pool: typeof MOCK_DISHES,
      dishType: DishType,
    ) => {
      const dish = pool.find((d) => !used.has(d.name) && !blocked.has(d.name));
      if (dish) {
        used.add(dish.name);
        return dish;
      }
      const invented = inventRecipeName(dishType, used, blocked);
      used.add(invented.name);
      return invented;
    };

    for (const slot of this.buildSlots(context)) {
      const pool = slot.dishType === 'soup' ? shuffledSoups : shuffledDishes;
      const dish = pickFromPool(pool, slot.dishType);

      picked.push({
        date: slot.date,
        mealSlot: slot.mealSlot,
        dishType: slot.dishType,
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
