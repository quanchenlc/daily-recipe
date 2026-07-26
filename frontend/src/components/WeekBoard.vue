<script setup lang="ts">
import type { DayMeals, PlanItem } from '../types'
import { formatMonthDay } from '../utils/date'
import MealItem from './MealItem.vue'

defineProps<{
  days: DayMeals[]
  busyKey: string | null
}>()

const emit = defineEmits<{
  reroll: [item: PlanItem]
  feedback: [item: PlanItem]
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
        <h2 class="day-title">{{ day.weekday }}</h2>
        <span class="day-date">{{ formatMonthDay(day.date) }}</span>
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
              @reroll="emit('reroll', item)"
              @feedback="emit('feedback', item)"
            />
            <p v-if="!slotItems(day, slot).length" class="meal-empty">—</p>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>
