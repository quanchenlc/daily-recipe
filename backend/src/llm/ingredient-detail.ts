/** Ensure shopping list has enough detail (主料/配菜/调味) */
export function ensureDetailedIngredients(
  name: string,
  ingredients: string[] | undefined | null,
  familySize: number,
): string[] {
  const base = (ingredients ?? []).map((s) => s.trim()).filter(Boolean);
  if (base.length >= 5) return base;

  const n = Math.max(1, familySize);
  const extras = defaultExtrasForDish(name, n);
  const merged = [...base];
  for (const item of extras) {
    if (!merged.some((m) => m.startsWith(item.split(' ')[0]))) {
      merged.push(item);
    }
    if (merged.length >= 8) break;
  }
  return merged;
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
      `主料 ${n * 120}g`,
      `配菜蔬菜 ${n * 100}g`,
      ...common,
      '料酒 1勺',
      '胡椒粉 少许',
    ];
  }
  return [
    `主料蔬菜 ${n * 150}g`,
    `蒜 ${Math.max(2, n)}瓣`,
    '盐 适量',
    '食用油 适量',
    '蚝油 1勺',
  ];
}
