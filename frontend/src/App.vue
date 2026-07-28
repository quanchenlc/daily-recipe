<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import DatePicker from './components/DatePicker.vue'
import DayShoppingModal from './components/DayShoppingModal.vue'
import DishDetailModal from './components/DishDetailModal.vue'
import FeedbackModal from './components/FeedbackModal.vue'
import PreferencesForm from './components/PreferencesForm.vue'
import WeekBoard from './components/WeekBoard.vue'
import { useWeekPlan } from './composables/useWeekPlan'
import type { DayMeals, PlanItem } from './types'

const {
  selectedDate,
  plan,
  preference,
  days,
  hasMenu,
  isSelectedToday,
  isConfirmed,
  loading,
  confirming,
  savingPrefs,
  busyKey,
  error,
  notice,
  loadForDate,
  generate,
  confirmMenu,
  savePreferences,
  reroll,
  feedback,
} = useWeekPlan()

const activeItem = ref<PlanItem | null>(null)
const detailItem = ref<PlanItem | null>(null)
const shoppingDay = ref<DayMeals | null>(null)

const familySize = computed(() => {
  const p = preference.value
  if (!p) return 2
  return (p.adultsCount ?? 0) + (p.elderlyCount ?? 0) + (p.childrenCount ?? 0) || 2
})

onMounted(() => {
  void loadForDate()
})

watch(selectedDate, (date, prev) => {
  if (date !== prev) void loadForDate(date)
})

async function onFeedbackSubmit(payload: { rating: number; comment: string }) {
  if (!activeItem.value) return
  try {
    await feedback(activeItem.value, payload.rating, payload.comment)
    activeItem.value = null
  } catch {
    // error already stored
  }
}
</script>

<template>
  <div class="app-shell">
    <header class="hero">
      <p class="brand">每日菜谱</p>
      <p class="hero-copy">
        先选日期看当天菜单；点菜品看采购明细，点「买菜」汇总当天食材。选今天时可确认设为今日菜单。
      </p>

      <DatePicker v-model="selectedDate" />

      <div class="hero-actions">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="loading"
          @click="generate"
        >
          {{ loading ? '生成中…' : hasMenu ? '重新生成本周' : '生成本周菜单' }}
        </button>
        <button
          type="button"
          class="btn btn-ghost"
          :disabled="loading"
          @click="loadForDate()"
        >
          刷新
        </button>
        <button
          v-if="isSelectedToday && hasMenu && !isConfirmed"
          type="button"
          class="btn btn-accent"
          :disabled="confirming"
          @click="confirmMenu"
        >
          {{ confirming ? '确认中…' : '确认设为今日菜单' }}
        </button>
      </div>
    </header>

    <PreferencesForm
      :preference="preference"
      :saving="savingPrefs"
      @save="savePreferences"
    />

    <section class="panel">
      <div v-if="notice" class="banner banner-ok">{{ notice }}</div>
      <div v-if="error" class="banner banner-err">{{ error }}</div>
      <div v-if="isSelectedToday && isConfirmed" class="banner banner-ok">
        今日菜单已确认
      </div>
    </section>

    <section v-if="!hasMenu && !loading" class="empty">
      <h2>这一天还没有菜单</h2>
      <p>可以换一天查看，或点「生成本周菜单」为这一周安排午晚餐。</p>
    </section>

    <WeekBoard
      v-if="hasMenu"
      :days="days"
      :busy-key="busyKey"
      @reroll="reroll"
      @feedback="activeItem = $event"
      @detail="detailItem = $event"
      @day-shop="shoppingDay = $event"
    />

    <p class="footer-note">
      {{
        hasMenu
          ? `${selectedDate} · ${plan?.items.length ?? 0} 道（本周）`
          : 'Daily Recipe'
      }}
    </p>

    <FeedbackModal
      :item="activeItem"
      :submitting="busyKey?.startsWith('feedback-') ?? false"
      @close="activeItem = null"
      @submit="onFeedbackSubmit"
    />

    <DishDetailModal
      :item="detailItem"
      :family-size="familySize"
      @close="detailItem = null"
    />

    <DayShoppingModal
      :day="shoppingDay"
      :family-size="familySize"
      @close="shoppingDay = null"
    />
  </div>
</template>
