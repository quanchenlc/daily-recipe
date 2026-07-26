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
    <article v-for="(day, index) in days" :key="day.date" class="day-block" :style="{ animationDelay: `${0.05 * index}s` }">
      <header class="day-head">
        <h2 class="day-title">{{ day.weekday }}</h2>
        <span class="day-date">{{ formatMonthDay(day.date) }}</span>
      </header>

      <div class="meal-row">
        <MealItem
          v-if="day.lunch"
          :item="day.lunch"
          :busy="isBusy(day.lunch, busyKey)"
          @reroll="emit('reroll', day.lunch)"
          @feedback="emit('feedback', day.lunch)"
        />
        <MealItem
          v-if="day.dinner"
          :item="day.dinner"
          :busy="isBusy(day.dinner, busyKey)"
          @reroll="emit('reroll', day.dinner)"
          @feedback="emit('feedback', day.dinner)"
        />
      </div>
    </article>
  </section>
</template>
