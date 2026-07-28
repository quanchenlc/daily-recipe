<script setup lang="ts">
import type { DayMeals, PlanItem } from '../types'
import { categoryLabel } from '../utils/ingredients'

defineProps<{
  day: DayMeals
}>()

function slotItems(day: DayMeals, slot: 'lunch' | 'dinner') {
  return [...day[slot].dishes, ...day[slot].soups]
}

function dishMeta(item: PlanItem) {
  const parts: string[] = []
  if (item.dishType === 'soup') parts.push('汤品')
  else if (item.dishCategory === 'vegetable') parts.push('素菜')
  else parts.push('荤菜')
  if (item.recipe.tags?.length) parts.push(item.recipe.tags[0])
  if (item.recipe.cookMinutes) parts.push(`${item.recipe.cookMinutes}分`)
  return parts.join(' · ')
}
</script>

<template>
  <div class="history-detail-menu">
    <section
      v-for="slot in (['lunch', 'dinner'] as const)"
      :key="slot"
      class="history-meal-section"
    >
      <h4 class="history-meal-title">{{ slot === 'lunch' ? '午餐' : '晚餐' }}</h4>

      <ul v-if="slotItems(day, slot).length" class="history-dish-list">
        <li
          v-for="item in slotItems(day, slot)"
          :key="item.id"
          class="history-dish-row"
        >
          <span
            class="history-dish-badge"
            :class="`history-dish-badge--${item.dishCategory || 'meat'}`"
          >
            {{ categoryLabel(item.dishCategory, item.dishType) }}
          </span>
          <div class="history-dish-body">
            <p class="history-dish-name">{{ item.recipe.name }}</p>
            <p v-if="dishMeta(item)" class="history-dish-meta">{{ dishMeta(item) }}</p>
          </div>
        </li>
      </ul>

      <p v-else class="history-dish-empty">暂无菜品</p>
    </section>
  </div>
</template>
