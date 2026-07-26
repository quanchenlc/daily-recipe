import type { DayMeals, PlanItem } from '../types'

export interface ParsedIngredient {
  raw: string
  name: string
  amount: string
}

export interface ShoppingLine {
  name: string
  displayAmount: string
  usedIn: string[]
}

export interface ShoppingSection {
  id: 'produce' | 'protein' | 'staple' | 'seasoning'
  title: string
  lines: ShoppingLine[]
}

const AMOUNT_PATTERN =
  /^(.+?)\s+([\d.]+)\s*(g|kg|克|千克|斤|两|ml|毫升|升|L|个|只|根|片|条|块|瓣|勺|汤匙|茶匙)$/i

const GENERIC_SKIP =
  /^(主料|配菜|蔬菜|时令食材|主要食材|配菜蔬菜|时令蔬菜|肉类)$/i

const SEASONING_NAMES =
  /^(盐|油|食用油|植物油|生抽|老抽|料酒|蚝油|淀粉|胡椒粉|白糖|冰糖|豆瓣酱|花椒|干辣椒|姜|蒜|葱|香菜|味精|鸡精|香油|醋)$/i

const PRODUCE_KEYWORDS = [
  '冬瓜', '白萝卜', '萝卜', '番茄', '西红柿', '鸡蛋', '芦笋', '西兰花', '菜花',
  '茄子', '土豆', '生菜', '豆芽', '青菜', '菠菜', '芹菜', '黄瓜', '青椒', '辣椒',
  '玉米', '莲藕', '山药', '薏米', '银耳', '莲子', '海带', '紫菜', '香菇', '木耳',
  '空心菜', '荷兰豆', '秋葵', '豆角', '洋葱', '南瓜', '白菜', '娃娃菜', '西葫芦',
]

const PROTEIN_KEYWORDS = [
  '排骨', '牛肉', '牛腩', '猪肉', '五花肉', '里脊', '鸡肉', '鸡腿', '鸡翅', '鸡',
  '鸭', '羊肉', '鱼', '鲈鱼', '带鱼', '虾', '虾仁', '蟹', '扇贝', '猪肝',
  '猪蹄', '香肠', '腊肉', '火腿',
]

const STAPLE_KEYWORDS = ['米饭', '面条', '粉丝', '豆腐', '豆干', '香干', '皮蛋']

/** Parse "排骨 500g" or plain "番茄" */
export function parseIngredient(raw: string): ParsedIngredient {
  const text = raw.trim()
  const match = text.match(AMOUNT_PATTERN)
  if (match) {
    return {
      raw: text,
      name: match[1].trim(),
      amount: `${match[2]}${match[3]}`,
    }
  }
  if (text.endsWith('适量')) {
    const name = text.replace(/\s*适量$/, '').trim()
    return { raw: text, name, amount: '适量' }
  }
  return { raw: text, name: text, amount: '' }
}

export function enrichIngredient(raw: string, familySize: number): string {
  const parsed = parseIngredient(raw)
  if (parsed.amount) return parsed.raw

  const name = parsed.name
  const n = Math.max(1, familySize)

  if (/[肉排骨鸡鸭鱼虾蟹贝猪牛羊]|里脊|鸡翅|鸡腿/.test(name)) {
    return `${name} ${n * 100}g`
  }
  if (/[菜叶豆芽菠菜生菜青菜白菜芹菜]|西兰花|豆角|茄子|土豆|番茄|冬瓜|萝卜|藕|菌|菇|芦笋/.test(name)) {
    return `${name} ${n * 80}g`
  }
  if (/[蛋豆腐]|豆干|香干/.test(name)) {
    return `${name} ${Math.max(1, Math.ceil(n / 2))}个`
  }
  if (/[米面粉丝面条]/.test(name)) {
    return `${name} ${n * 80}g`
  }
  if (SEASONING_NAMES.test(name)) {
    return `${name} 适量`
  }
  return `${name} ${n * 80}g`
}

export function categoryLabel(
  category: PlanItem['dishCategory'] | undefined,
  dishType: PlanItem['dishType'],
): string {
  if (dishType === 'soup' || category === 'soup') return '汤'
  if (category === 'vegetable') return '素'
  if (category === 'meat') return '荤'
  return '菜'
}

function shoppingCategory(name: string): ShoppingSection['id'] {
  if (SEASONING_NAMES.test(name)) return 'seasoning'
  if (PROTEIN_KEYWORDS.some((k) => name.includes(k))) return 'protein'
  if (STAPLE_KEYWORDS.some((k) => name.includes(k))) return 'staple'
  return 'produce'
}

function estimateAmount(name: string, familySize: number): string {
  const n = Math.max(1, familySize)
  if (SEASONING_NAMES.test(name)) return '适量'
  if (/[蛋]/.test(name)) return `${Math.max(2, n)}个`
  if (/[排骨|肉|鸡|鸭|鱼|虾]/.test(name)) return `${n * 120}g`
  if (/[米|面|粉丝]/.test(name)) return `${n * 80}g`
  return `${n * 100}g`
}

/** Pull real buyable items from dish name when DB data is too generic */
function inferFromDishName(dishName: string, familySize: number): ParsedIngredient[] {
  const found = new Map<string, ParsedIngredient>()
  const allKeywords = [...PROTEIN_KEYWORDS, ...PRODUCE_KEYWORDS, ...STAPLE_KEYWORDS]

  for (const kw of allKeywords) {
    if (dishName.includes(kw) && !found.has(kw)) {
      found.set(kw, {
        name: kw,
        amount: estimateAmount(kw, familySize),
        raw: kw,
      })
    }
  }

  return [...found.values()]
}

function ensureDetailedIngredients(
  dishName: string,
  ingredients: string[],
  familySize: number,
): string[] {
  const cleaned = ingredients
    .map((s) => s.trim())
    .filter((s) => s && !GENERIC_SKIP.test(parseIngredient(s).name))

  if (cleaned.length >= 4) return cleaned

  const inferred = inferFromDishName(dishName, familySize).map(
    (i) => `${i.name} ${i.amount}`,
  )

  const merged = [...cleaned]
  for (const line of inferred) {
    const key = parseIngredient(line).name
    if (!merged.some((m) => parseIngredient(m).name === key)) {
      merged.push(line)
    }
  }

  if (merged.length < 3) {
    for (const extra of ['姜 3片', '蒜 3瓣', '盐 适量', '食用油 适量']) {
      const key = parseIngredient(extra).name
      if (!merged.some((m) => parseIngredient(m).name === key)) {
        merged.push(extra)
      }
    }
  }

  return merged
}

export function getDishIngredients(item: PlanItem, familySize: number): ParsedIngredient[] {
  const raw = item.recipe.ingredients?.length
    ? item.recipe.ingredients
    : []

  const detailed = ensureDetailedIngredients(
    item.recipe.name,
    raw,
    familySize,
  )

  if (!detailed.length) {
    return inferFromDishName(item.recipe.name, familySize)
  }

  return detailed.map((line) => parseIngredient(enrichIngredient(line, familySize)))
}

function parseAmountValue(amount: string): { value: number; unit: string } | null {
  const m = amount.trim().match(/^([\d.]+)\s*(g|kg|克|千克|斤|两|ml|毫升|升|L|个|只|根|片|条|块|瓣)$/i)
  if (!m) return null
  let value = Number(m[1])
  let unit = m[2].toLowerCase()
  if (unit === '千克') unit = 'kg'
  if (unit === '克') unit = 'g'
  if (unit === '毫升') unit = 'ml'
  if (unit === '斤') value *= 500
  if (unit === '两') value *= 50
  if (unit === 'kg') value *= 1000
  return { value, unit: unit === 'kg' ? 'g' : unit }
}

function formatAmount(value: number, unit: string): string {
  if (unit === 'g' && value >= 1000) {
    const kg = value / 1000
    return Number.isInteger(kg) ? `${kg}kg` : `${kg.toFixed(1)}kg`
  }
  if (unit === 'g') return `${Math.round(value)}g`
  return `${Math.round(value)}${unit}`
}

function mergeAmounts(amounts: string[]): string {
  const normalized = amounts.filter(Boolean).map((a) => (a === '适量' ? a : a.trim()))
  if (!normalized.length) return '适量'
  if (normalized.every((a) => a === '适量')) return '适量'

  const byUnit = new Map<string, number>()
  let hasPinch = false

  for (const amount of normalized) {
    if (amount === '适量') {
      hasPinch = true
      continue
    }
    const parsed = parseAmountValue(amount)
    if (!parsed) continue
    byUnit.set(parsed.unit, (byUnit.get(parsed.unit) ?? 0) + parsed.value)
  }

  const parts = [...byUnit.entries()].map(([unit, value]) => formatAmount(value, unit))
  if (hasPinch && parts.length === 0) return '适量'
  if (hasPinch && parts.length > 0) return parts.join(' + ')
  return parts.join(' + ') || '适量'
}

export function collectDayItems(day: DayMeals): PlanItem[] {
  return [
    ...day.lunch.dishes,
    ...day.lunch.soups,
    ...day.dinner.dishes,
    ...day.dinner.soups,
  ]
}

function addToMap(
  map: Map<string, ShoppingLine>,
  ing: ParsedIngredient,
  dishName: string,
) {
  if (GENERIC_SKIP.test(ing.name)) return

  const key = ing.name
  if (!map.has(key)) {
    map.set(key, { name: key, displayAmount: '', usedIn: [] })
  }
  const line = map.get(key)!
  if (ing.amount) {
    const prev =
      line.displayAmount && line.displayAmount !== '适量'
        ? [line.displayAmount]
        : line.displayAmount === '适量'
          ? ['适量']
          : []
    line.displayAmount = mergeAmounts([...prev, ing.amount])
  } else if (!line.displayAmount) {
    line.displayAmount = '适量'
  }
  if (!line.usedIn.includes(dishName)) {
    line.usedIn.push(dishName)
  }
}

const SECTION_META: Record<ShoppingSection['id'], string> = {
  produce: '蔬菜水果',
  protein: '肉禽海鲜',
  staple: '豆面蛋类',
  seasoning: '调味料',
}

export function buildDayShoppingList(
  items: PlanItem[],
  familySize: number,
): ShoppingSection[] {
  const buckets = new Map<ShoppingSection['id'], Map<string, ShoppingLine>>()
  for (const id of Object.keys(SECTION_META) as ShoppingSection['id'][]) {
    buckets.set(id, new Map())
  }

  for (const item of items) {
    const ings = getDishIngredients(item, familySize)
    for (const ing of ings) {
      const section = shoppingCategory(ing.name)
      addToMap(buckets.get(section)!, ing, item.recipe.name)
    }
  }

  const order: ShoppingSection['id'][] = ['produce', 'protein', 'staple', 'seasoning']

  return order
    .map((id) => {
      const lines = [...(buckets.get(id)?.values() ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, 'zh-CN'),
      )
      if (id === 'seasoning' && lines.length > 0) {
        const names = lines.map((l) => l.name).join('、')
        return {
          id,
          title: SECTION_META[id],
          lines: [
            {
              name: names,
              displayAmount: '按需',
              usedIn: [...new Set(lines.flatMap((l) => l.usedIn))],
            },
          ],
        }
      }
      return { id, title: SECTION_META[id], lines }
    })
    .filter((s) => s.lines.length > 0)
}
