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
</script>

<template>
  <section class="day-list">
    <article
      v-for="(day, index) in days"
      :key="day.date"
      class="day-block"
      :style="{ animationDelay: `${0.05 * index}s` }"
    >
      <header class="day-head">
        <h2 class="day-title">{{ day.weekday }}</h2>
        <span class="day-date">{{ formatMonthDay(day.date) }}</span>
      </header>

      <div v-for="slot in (['lunch', 'dinner'] as const)" :key="slot" class="meal-slot-block">
        <h3 class="meal-slot-title">{{ slot === 'lunch' ? '午餐' : '晚餐' }}</h3>

        <div v-if="day[slot].dishes.length" class="meal-subsection">
          <p class="meal-subtitle">菜</p>
          <div class="meal-row">
            <MealItem
              v-for="item in day[slot].dishes"
              :key="item.id"
              :item="item"
              :busy="isBusy(item, busyKey)"
              @reroll="emit('reroll', item)"
              @feedback="emit('feedback', item)"
            />
          </div>
        </div>

        <div v-if="day[slot].soups.length" class="meal-subsection">
          <p class="meal-subtitle">汤</p>
          <div class="meal-row">
            <MealItem
              v-for="item in day[slot].soups"
              :key="item.id"
              :item="item"
              :busy="isBusy(item, busyKey)"
              @reroll="emit('reroll', item)"
              @feedback="emit('feedback', item)"
            />
          </div>
        </div>
      </div>
    </article>
  </section>
</template>
