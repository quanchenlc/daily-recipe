import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
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
    name: '冬瓜排骨汤',
    tags: ['汤品', '清淡'],
    ingredients: ['排骨', '冬瓜'],
    cookMinutes: 60,
    difficulty: '简单',
  },
  {
    name: '蚝油生菜',
    tags: ['蔬菜', '快手'],
    ingredients: ['生菜', '蚝油'],
    cookMinutes: 10,
    difficulty: '简单',
  },
];

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

  private async callChat(context: RecommendContext) {
    const baseUrl = this.config
      .get<string>('LLM_BASE_URL', 'https://api.openai.com/v1')
      .replace(/\/$/, '');
    const model = this.config.get<string>('LLM_MODEL', 'gpt-4o-mini');
    const apiKey = this.config.get<string>('LLM_API_KEY', '');
    const timeout = Number(this.config.get('LLM_TIMEOUT_MS', '60000'));

    const system = `你是家庭周菜单助手。只推荐午餐和晚餐。必须输出严格 JSON，不要 markdown。
规则：
1. 不要推荐 blockedRecipeNames 中的菜
2. 同一周内菜名不能重复
3. 可以发明新菜（家常中式为主）
4. 结合用户偏好 likes/dislikes/constraints
5. JSON schema:
{"weekStart":"YYYY-MM-DD","items":[{"date":"YYYY-MM-DD","mealSlot":"lunch|dinner","recipeName":"string","reason":"string","description":"string","ingredients":["string"],"tags":["string"],"cookMinutes":30,"difficulty":"简单|中等|困难"}]}`;

    const userPayload = {
      ...context,
      instruction: context.target
        ? `只生成 1 道菜，替换 ${context.target.date} 的 ${context.target.mealSlot}。不要使用 avoidNames。`
        : `生成 ${context.days} 天，每天 lunch + dinner，共 ${context.days * 2} 道菜。`,
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

    // DeepSeek V4 defaults thinking on; disable for cheaper structured JSON.
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
    parsed.items = parsed.items.map((item) => ({
      ...item,
      mealSlot: item.mealSlot === 'lunch' ? 'lunch' : 'dinner',
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

    const pool = [
      ...MOCK_DISHES,
      ...context.knownRecipes.map((r) => ({
        name: r.name,
        tags: r.tags ?? [],
        ingredients: [] as string[],
        cookMinutes: r.cookMinutes ?? 30,
        difficulty: '中等',
      })),
    ].filter((d) => !blocked.has(d.name));

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const picked: LlmMenuItem[] = [];
    const used = new Set<string>();

    const slots: Array<{ date: string; mealSlot: MealSlot }> = [];
    if (context.target) {
      slots.push({
        date: context.target.date,
        mealSlot: context.target.mealSlot,
      });
    } else {
      for (let i = 0; i < context.days; i++) {
        const date = this.addDays(context.weekStart, i);
        for (const mealSlot of context.mealSlots) {
          slots.push({ date, mealSlot });
        }
      }
    }

    let inventIndex = 1;
    for (const slot of slots) {
      let dish = shuffled.find((d) => !used.has(d.name) && !blocked.has(d.name));
      if (!dish) {
        let name = `时令家常菜${inventIndex}`;
        while (blocked.has(name) || used.has(name)) {
          inventIndex += 1;
          name = `时令家常菜${inventIndex}`;
        }
        dish = {
          name,
          tags: ['家常', '新菜'],
          ingredients: ['时令蔬菜', '鸡蛋'],
          cookMinutes: 25,
          difficulty: '简单',
        };
        inventIndex += 1;
      }
      used.add(dish.name);
      picked.push({
        date: slot.date,
        mealSlot: slot.mealSlot,
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
