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
  itemsPerDay,
  totalItemsForWeek,
} from '../preferences/preference.types';
import {
  DishType,
  LlmMenuItem,
  LlmMenuResult,
  MealSlot,
  RecommendContext,
} from './llm.types';

const MOCK_DISHES = [
  {
    name: '番茄牛腩',
    tags: ['家常', '下饭'],
    ingredients: ['牛腩', '番茄', '洋葱'],
    cookMinutes: 60,
    difficulty: '中等',
  },
  {
    name: '蒜蓉西兰花',
    tags: ['清淡', '蔬菜'],
    ingredients: ['西兰花', '大蒜'],
    cookMinutes: 15,
    difficulty: '简单',
  },
  {
    name: '宫保鸡丁',
    tags: ['微辣', '下饭'],
    ingredients: ['鸡胸肉', '花生', '干辣椒'],
    cookMinutes: 30,
    difficulty: '中等',
  },
  {
    name: '清蒸鲈鱼',
    tags: ['清淡', '海鲜'],
    ingredients: ['鲈鱼', '姜', '葱'],
    cookMinutes: 25,
    difficulty: '中等',
  },
  {
    name: '土豆烧排骨',
    tags: ['家常', '硬菜'],
    ingredients: ['排骨', '土豆'],
    cookMinutes: 50,
    difficulty: '中等',
  },
  {
    name: '茄子豆角',
    tags: ['素菜', '家常'],
    ingredients: ['茄子', '豆角'],
    cookMinutes: 25,
    difficulty: '简单',
  },
  {
    name: '酸辣土豆丝',
    tags: ['快手', '开胃'],
    ingredients: ['土豆', '干辣椒', '醋'],
    cookMinutes: 15,
    difficulty: '简单',
  },
  {
    name: '香菇青菜',
    tags: ['清淡', '蔬菜'],
    ingredients: ['香菇', '青菜'],
    cookMinutes: 15,
    difficulty: '简单',
  },
  {
    name: '红烧茄子',
    tags: ['下饭', '素菜'],
    ingredients: ['茄子', '蒜'],
    cookMinutes: 20,
    difficulty: '简单',
  },
  {
    name: '可乐鸡翅',
    tags: ['甜咸', '孩子爱吃'],
    ingredients: ['鸡翅', '可乐'],
    cookMinutes: 35,
    difficulty: '简单',
  },
  {
    name: '鱼香肉丝',
    tags: ['微辣', '下饭'],
    ingredients: ['猪里脊', '木耳', '胡萝卜'],
    cookMinutes: 25,
    difficulty: '中等',
  },
  {
    name: '虾仁滑蛋',
    tags: ['快手', '蛋白'],
    ingredients: ['虾仁', '鸡蛋'],
    cookMinutes: 15,
    difficulty: '简单',
  },
  {
    name: '青椒肉丝',
    tags: ['家常', '快手'],
    ingredients: ['青椒', '猪肉丝'],
    cookMinutes: 20,
    difficulty: '简单',
  },
  {
    name: '西红柿鸡蛋面',
    tags: ['面食', '快手'],
    ingredients: ['面条', '番茄', '鸡蛋'],
    cookMinutes: 20,
    difficulty: '简单',
  },
  {
    name: '麻婆豆腐',
    tags: ['微辣', '下饭'],
    ingredients: ['豆腐', '牛肉末'],
    cookMinutes: 20,
    difficulty: '简单',
  },
  {
    name: '洋葱炒鸡蛋',
    tags: ['家常', '快手'],
    ingredients: ['洋葱', '鸡蛋'],
    cookMinutes: 15,
    difficulty: '简单',
  },
  {
    name: '芹菜炒香干',
    tags: ['素菜', '清淡'],
    ingredients: ['芹菜', '香干'],
    cookMinutes: 15,
    difficulty: '简单',
  },
  {
    name: '糖醋里脊',
    tags: ['酸甜', '硬菜'],
    ingredients: ['里脊', '淀粉', '番茄酱'],
    cookMinutes: 35,
    difficulty: '中等',
  },
  {
    name: '蚝油生菜',
    tags: ['蔬菜', '快手'],
    ingredients: ['生菜', '蚝油'],
    cookMinutes: 10,
    difficulty: '简单',
  },
];

const MOCK_SOUPS = [
  {
    name: '冬瓜排骨汤',
    tags: ['汤品', '清淡'],
    ingredients: ['排骨', '冬瓜'],
    cookMinutes: 60,
    difficulty: '简单',
  },
  {
    name: '番茄蛋花汤',
    tags: ['汤品', '快手'],
    ingredients: ['番茄', '鸡蛋'],
    cookMinutes: 15,
    difficulty: '简单',
  },
  {
    name: '紫菜虾皮汤',
    tags: ['汤品', '清淡'],
    ingredients: ['紫菜', '虾皮'],
    cookMinutes: 10,
    difficulty: '简单',
  },
  {
    name: '玉米排骨汤',
    tags: ['汤品', '家常'],
    ingredients: ['排骨', '玉米'],
    cookMinutes: 55,
    difficulty: '简单',
  },
  {
    name: '山药鸡汤',
    tags: ['汤品', '滋补'],
    ingredients: ['鸡肉', '山药'],
    cookMinutes: 70,
    difficulty: '中等',
  },
  {
    name: '萝卜牛腩汤',
    tags: ['汤品', '暖胃'],
    ingredients: ['牛腩', '白萝卜'],
    cookMinutes: 80,
    difficulty: '中等',
  },
];

interface MenuSlot {
  date: string;
  mealSlot: MealSlot;
  dishType: DishType;
  slotIndex: number;
}

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

    const maxRetries = Number(this.config.get('LLM_MAX_RETRIES', '2'));
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const content = await this.callChat(context);
        return this.parseMenu(content, context);
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
    const timeout = Number(this.config.get('LLM_TIMEOUT_MS', '60000'));
    const mealConfig = context.mealConfig ?? DEFAULT_MEAL_CONFIG;
    const expectedCount = context.target
      ? 1
      : totalItemsForWeek(context.days, mealConfig);

    const system = `你是家庭周菜单助手。按中式家庭餐桌习惯推荐午餐和晚餐，每餐可包含多道菜和多道汤。必须输出严格 JSON，不要 markdown。
规则：
1. 不要推荐 blockedRecipeNames 中的菜
2. 同一周内菜名不能重复
3. 可以发明新菜（家常中式为主）
4. 结合家庭人数、口味备注、likes/dislikes/constraints
5. 有儿童时适当清淡少辣；有老人时避免过硬难嚼
6. dishType 为 dish 表示主菜/配菜，soup 表示汤品；汤品 tags 应含「汤品」
7. JSON schema:
{"weekStart":"YYYY-MM-DD","items":[{"date":"YYYY-MM-DD","mealSlot":"lunch|dinner","dishType":"dish|soup","slotIndex":0,"recipeName":"string","reason":"string","description":"string","ingredients":["string"],"tags":["string"],"cookMinutes":30,"difficulty":"简单|中等|困难"}]}`;

    const userPayload = {
      ...context,
      instruction: context.target
        ? `只生成 1 道${context.target.dishType === 'soup' ? '汤' : '菜'}，替换 ${context.target.date} 的 ${context.target.mealSlot}（slotIndex=${context.target.slotIndex}）。不要使用 avoidNames。`
        : `生成 ${context.days} 天菜单。每天午餐 ${mealConfig.lunch.dishes} 道菜 + ${mealConfig.lunch.soups} 道汤，晚餐 ${mealConfig.dinner.dishes} 道菜 + ${mealConfig.dinner.soups} 道汤，共 ${expectedCount} 条 items。`,
    };

    const payload: Record<string, unknown> = {
      model,
      temperature: 0.8,
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

    let inventDish = 1;
    let inventSoup = 1;

    const pickFromPool = (
      pool: typeof MOCK_DISHES,
      dishType: DishType,
      inventRef: { value: number },
    ) => {
      let dish = pool.find((d) => !used.has(d.name) && !blocked.has(d.name));
      if (!dish) {
        const prefix = dishType === 'soup' ? '家常汤' : '时令家常菜';
        let name = `${prefix}${inventRef.value}`;
        while (blocked.has(name) || used.has(name)) {
          inventRef.value += 1;
          name = `${prefix}${inventRef.value}`;
        }
        dish = {
          name,
          tags: dishType === 'soup' ? ['汤品', '家常'] : ['家常', '新菜'],
          ingredients: dishType === 'soup' ? ['时令蔬菜', '姜片'] : ['时令蔬菜', '鸡蛋'],
          cookMinutes: dishType === 'soup' ? 40 : 25,
          difficulty: '简单',
        };
        inventRef.value += 1;
      }
      used.add(dish.name);
      return dish;
    };

    for (const slot of this.buildSlots(context)) {
      const pool = slot.dishType === 'soup' ? shuffledSoups : shuffledDishes;
      const inventRef = slot.dishType === 'soup' ? { value: inventSoup } : { value: inventDish };
      const dish = pickFromPool(pool, slot.dishType, inventRef);
      if (slot.dishType === 'soup') inventSoup = inventRef.value;
      else inventDish = inventRef.value;

      picked.push({
        date: slot.date,
        mealSlot: slot.mealSlot,
        dishType: slot.dishType,
        slotIndex: slot.slotIndex,
        recipeName: dish.name,
        reason: '本地 mock 推荐（未配置 LLM_API_KEY）',
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
