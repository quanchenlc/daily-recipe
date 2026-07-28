<script setup lang="ts">
import type { DayMeals, PlanItem } from '../types'
import { formatMonthDay } from '../utils/date'
import MealItem from './MealItem.vue'

defineProps<{
  days: DayMeals[]
  busyKey: string | null
  readonly?: boolean
}>()

const emit = defineEmits<{
  reroll: [item: PlanItem]
  feedback: [item: PlanItem]
  detail: [item: PlanItem]
  dayShop: [day: DayMeals]
}>()

function isBusy(item: PlanItem, busyKey: string | null) {
  return busyKey === `reroll-${item.id}` || busyKey === `feedback-${item.id}`
}

function slotItems(day: DayMeals, slot: 'lunch' | 'dinner') {
  return [...day[slot].dishes, ...day[slot].soups]
}
</script>

<template>
  <section class="day-list day-list--compact">
    <article
      v-for="(day, index) in days"
      :key="day.date"
      class="day-block day-block--compact"
      :style="{ animationDelay: `${0.03 * index}s` }"
    >
      <header class="day-head day-head--compact">
        <button type="button" class="day-head-btn" :disabled="readonly" @click="!readonly && emit('dayShop', day)">
          <h2 class="day-title">{{ day.weekday }}</h2>
          <span class="day-date">{{ formatMonthDay(day.date) }}</span>
        </button>
        <button
          v-if="!readonly"
          type="button"
          class="btn btn-soft btn-tiny day-shop-btn"
          title="查看今日采购清单"
          @click="emit('dayShop', day)"
        >
          买菜
        </button>
      </header>

      <div class="day-meals-grid">
        <div v-for="slot in (['lunch', 'dinner'] as const)" :key="slot" class="meal-slot-block meal-slot-block--compact">
          <h3 class="meal-slot-title">{{ slot === 'lunch' ? '午' : '晚' }}</h3>
          <div class="meal-row meal-row--compact">
            <MealItem
              v-for="item in slotItems(day, slot)"
              :key="item.id"
              :item="item"
              :busy="isBusy(item, busyKey)"
              :readonly="readonly"
              @reroll="emit('reroll', item)"
              @feedback="emit('feedback', item)"
              @detail="emit('detail', item)"
            />
            <p v-if="!slotItems(day, slot).length" class="meal-empty">—</p>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>
