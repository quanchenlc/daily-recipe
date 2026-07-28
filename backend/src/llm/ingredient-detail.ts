/** Ensure shopping list has enough buyable detail — no generic 主料/蔬菜 placeholders */
export function ensureDetailedIngredients(
  name: string,
  ingredients: string[] | undefined | null,
  familySize: number,
): string[] {
  const n = Math.max(1, familySize);
  const cleaned = dedupeLines(
    (ingredients ?? [])
      .map((s) => s.trim())
      .filter((s) => s && !isGenericName(parseName(s))),
  );

  if (cleaned.length >= 5) return cleaned;

  const inferred = inferFromDishName(name, n).filter(
    (line) => !cleaned.some((c) => parseName(c) === parseName(line)),
  );
  const merged = dedupeLines([...cleaned, ...inferred]);

  if (merged.length >= 5) return merged;

  const fallback = defaultExtrasForDish(name, n).filter(
    (line) => !merged.some((m) => parseName(m) === parseName(line)),
  );

  return dedupeLines([...merged, ...fallback]).slice(0, 10);
}

const GENERIC_NAMES = new Set([
  '主料',
  '配菜',
  '配菜蔬菜',
  '蔬菜',
  '主料蔬菜',
  '时令食材',
  '主要食材',
  '时令蔬菜',
  '肉类',
  '辅料',
  '调料',
  '调味料',
  '配料',
  '食材',
]);

const SEASONING_NAMES =
  /^(盐|油|食用油|植物油|生抽|老抽|料酒|蚝油|淀粉|胡椒粉|白糖|冰糖|豆瓣酱|花椒|干辣椒|姜|蒜|葱|香菜|味精|鸡精|香油|醋)$/;

function parseName(line: string): string {
  const text = line.trim();
  if (text.endsWith('适量')) return text.replace(/\s*适量$/, '').trim();
  const m = text.match(/^(.+?)\s+[\d.]+\s*(g|kg|克|千克|斤|两|ml|毫升|个|只|根|片|条|块|瓣|勺)/i);
  return m ? m[1].trim() : text;
}

function isGenericName(name: string): boolean {
  const n = name.trim();
  return !n || GENERIC_NAMES.has(n) || /^主?配菜/.test(n);
}

function dedupeLines(lines: string[]): string[] {
  const map = new Map<string, string>();
  for (const line of lines) {
    const key = parseName(line);
    if (!key || isGenericName(key)) continue;
    if (!map.has(key)) map.set(key, line);
  }
  return [...map.values()];
}

function inferFromDishName(dishName: string, n: number): string[] {
  const hints: Array<{ pattern: RegExp; items: string[] }> = [
    { pattern: /冬瓜/, items: [`冬瓜 ${n * 200}g`] },
    { pattern: /排骨/, items: [`排骨 ${n * 200}g`] },
    { pattern: /芦笋/, items: [`芦笋 ${n * 150}g`] },
    { pattern: /银耳/, items: [`银耳 20g`] },
    { pattern: /莲子/, items: [`莲子 30g`] },
    { pattern: /薏米/, items: [`薏米 50g`] },
    { pattern: /粉蒸肉|五花肉/, items: [`五花肉 ${n * 200}g`] },
    { pattern: /盐焗鸡|豉油鸡|白切鸡/, items: [`鸡 1只`] },
    { pattern: /虾仁|扬州炒饭/, items: [`虾仁 ${n * 80}g`, `鸡蛋 ${n * 2}个`] },
    { pattern: /担担面|面条/, items: [`面条 ${n * 100}g`] },
    { pattern: /牛肉|水煮/, items: [`牛肉 ${n * 150}g`] },
    { pattern: /鱼香|木耳/, items: [`木耳 50g`] },
    { pattern: /麻婆|豆腐/, items: [`豆腐 1块`] },
    { pattern: /番茄|西红柿/, items: [`番茄 ${n * 2}个`] },
    { pattern: /土豆/, items: [`土豆 ${n * 2}个`] },
    { pattern: /茄子/, items: [`茄子 ${n * 2}根`] },
    { pattern: /白菜/, items: [`大白菜 半颗`] },
    { pattern: /菠菜/, items: [`菠菜 ${n * 150}g`] },
    { pattern: /西兰花/, items: [`西兰花 1颗`] },
    { pattern: /玉米/, items: [`玉米 ${n}根`] },
    { pattern: /胡萝卜/, items: [`胡萝卜 ${n}根`] },
  ];

  const found: string[] = [];
  for (const { pattern, items } of hints) {
    if (pattern.test(dishName)) found.push(...items);
  }
  return found;
}

function defaultExtrasForDish(name: string, n: number): string[] {
  const common = [
    `姜 ${Math.max(2, n)}片`,
    `蒜 ${Math.max(2, n)}瓣`,
    '食用油 适量',
    '盐 适量',
    '生抽 1勺',
  ];

  if (/水煮|麻辣|毛血旺/.test(name)) {
    return [
      `牛肉 ${n * 120}g`,
      `豆芽 ${n * 80}g`,
      `生菜 ${n * 60}g`,
      `干辣椒 ${n * 5}g`,
      `花椒 ${n * 2}g`,
      '豆瓣酱 2勺',
      `姜 ${Math.max(3, n)}片`,
      `蒜 ${Math.max(3, n)}瓣`,
      '料酒 1勺',
      '淀粉 1勺',
      '食用油 适量',
    ];
  }
  if (/汤/.test(name)) {
    return [
      `排骨 ${n * 150}g`,
      `玉米 ${n}根`,
      `胡萝卜 ${n * 80}g`,
      `姜 ${Math.max(3, n)}片`,
      '料酒 1勺',
      '盐 适量',
    ];
  }
  if (/炒蛋|番茄蛋/.test(name)) {
    return [
      `鸡蛋 ${n * 2}个`,
      `番茄 ${n * 2}个`,
      `葱 ${n * 2}根`,
      '白糖 半勺',
      '盐 适量',
      '食用油 适量',
    ];
  }
  if (/[肉排骨鸡鸭鱼虾蟹贝鱼牛猪羊]/.test(name)) {
    return [
      `猪肉 ${n * 120}g`,
      `青菜 ${n * 100}g`,
      ...common,
      '料酒 1勺',
      '胡椒粉 少许',
    ];
  }
  return [
    `青菜 ${n * 150}g`,
    `蒜 ${Math.max(2, n)}瓣`,
    '盐 适量',
    '食用油 适量',
    '蚝油 1勺',
    ...common.slice(0, 2),
  ];
}

export function ingredientsSummary(ingredients: string[]): string {
  const buyable = ingredients.filter(
    (line) => !isGenericName(parseName(line)) && !SEASONING_NAMES.test(parseName(line)),
  );
  const names = buyable.map(parseName).slice(0, 6);
  if (names.length === 0) {
    return ingredients.map(parseName).join('、');
  }
  return names.join('、');
}
