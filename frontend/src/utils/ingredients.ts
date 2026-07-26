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

const AMOUNT_PATTERN =
  /^(.+?)\s+([\d.]+\s*(?:g|kg|克|千克|斤|两|ml|毫升|升|L|个|只|根|片|条|块|勺|汤匙|茶匙|适量).*)$/i

/** Parse "排骨 500g" or plain "番茄" */
export function parseIngredient(raw: string): ParsedIngredient {
  const text = raw.trim()
  const match = text.match(AMOUNT_PATTERN)
  if (match) {
    return { raw: text, name: match[1].trim(), amount: match[2].trim() }
  }
  return { raw: text, name: text, amount: '' }
}

/** Add estimated amount when LLM only returned ingredient names */
export function enrichIngredient(raw: string, familySize: number): string {
  const parsed = parseIngredient(raw)
  if (parsed.amount) return parsed.raw

  const name = parsed.name
  const n = Math.max(1, familySize)

  if (/[肉排骨鸡鸭鱼虾蟹贝猪牛羊]|里脊|鸡翅|鸡腿/.test(name)) {
    return `${name} ${n * 100}g`
  }
  if (/[菜叶豆芽菠菜生菜青菜白菜芹菜]|西兰花|豆角|茄子|土豆|番茄|冬瓜|萝卜|藕|菌|菇/.test(name)) {
    return `${name} ${n * 80}g`
  }
  if (/[蛋豆腐]|豆干|香干/.test(name)) {
    return `${name} ${Math.max(1, Math.ceil(n / 2))}块`
  }
  if (/[米面粉丝面条]/.test(name)) {
    return `${name} ${n * 80}g`
  }
  if (/[姜葱蒜椒]|香菜|调料|盐|油|酱|蚝油|料酒/.test(name)) {
    return `${name} 适量`
  }
  return `${name} ${n * 50}g`
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

/** Expand sparse ingredient lists for display */
function ensureDetailedIngredients(
  name: string,
  ingredients: string[],
  familySize: number,
): string[] {
  if (ingredients.length >= 5) return ingredients
  const n = Math.max(1, familySize)
  const extras: string[] = []

  if (/水煮|麻辣/.test(name)) {
    extras.push(
      `牛肉 ${n * 120}g`,
      `豆芽 ${n * 80}g`,
      `干辣椒 ${n * 5}g`,
      `花椒 ${n * 2}g`,
      '豆瓣酱 2勺',
      `姜 ${Math.max(3, n)}片`,
      `蒜 ${Math.max(3, n)}瓣`,
      '料酒 1勺',
      '淀粉 1勺',
      '食用油 适量',
      '盐 适量',
    )
  } else if (/汤/.test(name)) {
    extras.push(
      `排骨 ${n * 150}g`,
      `玉米 ${n}根`,
      `姜 ${Math.max(3, n)}片`,
      '料酒 1勺',
      '盐 适量',
    )
  } else if (/[肉排骨鸡鸭鱼虾]/.test(name)) {
    extras.push(
      `主料 ${n * 120}g`,
      `配菜蔬菜 ${n * 100}g`,
      `姜 ${Math.max(2, n)}片`,
      `蒜 ${Math.max(2, n)}瓣`,
      '生抽 1勺',
      '料酒 1勺',
      '盐 适量',
      '食用油 适量',
    )
  } else {
    extras.push(
      `蔬菜 ${n * 150}g`,
      `蒜 ${Math.max(2, n)}瓣`,
      '盐 适量',
      '蚝油 1勺',
      '食用油 适量',
    )
  }

  const merged = [...ingredients]
  for (const item of extras) {
    const key = item.split(' ')[0]
    if (!merged.some((m) => m.startsWith(key))) merged.push(item)
    if (merged.length >= 8) break
  }
  return merged
}

export function getDishIngredients(item: PlanItem, familySize: number): ParsedIngredient[] {
  const raw = item.recipe.ingredients?.length
    ? item.recipe.ingredients
    : ['主要食材']

  const detailed = ensureDetailedIngredients(
    item.recipe.name,
    raw,
    familySize,
  )

  return detailed.map((line) => parseIngredient(enrichIngredient(line, familySize)))
}

function parseAmountValue(amount: string): { value: number; unit: string } | null {
  const m = amount.trim().match(/^([\d.]+)\s*(g|kg|克|千克|斤|两|ml|毫升|升|L|个|只|根|片|条|块)$/i)
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
  const valid = amounts.filter(Boolean)
  if (!valid.length) return '适量'
  if (valid.every((a) => a.includes('适量'))) return '适量'

  const byUnit = new Map<string, number>()
  const rest: string[] = []

  for (const amount of valid) {
    const parsed = parseAmountValue(amount)
    if (!parsed) {
      rest.push(amount)
      continue
    }
    byUnit.set(parsed.unit, (byUnit.get(parsed.unit) ?? 0) + parsed.value)
  }

  const parts = [...byUnit.entries()].map(([unit, value]) => formatAmount(value, unit))
  return [...parts, ...rest].join(' + ') || '适量'
}

export function collectDayItems(day: DayMeals): PlanItem[] {
  return [
    ...day.lunch.dishes,
    ...day.lunch.soups,
    ...day.dinner.dishes,
    ...day.dinner.soups,
  ]
}

export function buildDayShoppingList(
  items: PlanItem[],
  familySize: number,
): ShoppingLine[] {
  const map = new Map<string, ShoppingLine>()

  for (const item of items) {
    for (const ing of getDishIngredients(item, familySize)) {
      const key = ing.name
      if (!map.has(key)) {
        map.set(key, { name: key, displayAmount: '', usedIn: [] })
      }
      const line = map.get(key)!
      if (ing.amount) {
        line.displayAmount = mergeAmounts([
          ...(line.displayAmount && line.displayAmount !== '适量'
            ? line.displayAmount.split(' + ')
            : []),
          ing.amount,
        ])
      } else if (!line.displayAmount) {
        line.displayAmount = '适量'
      }
      if (!line.usedIn.includes(item.recipe.name)) {
        line.usedIn.push(item.recipe.name)
      }
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
}
