<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DayShoppingModal from './components/DayShoppingModal.vue'
import DishDetailModal from './components/DishDetailModal.vue'
import FeedbackModal from './components/FeedbackModal.vue'
import PreferencesForm from './components/PreferencesForm.vue'
import WeekBoard from './components/WeekBoard.vue'
import { useWeekPlan } from './composables/useWeekPlan'
import type { DayMeals, PlanItem } from './types'

const {
  plan,
  preference,
  days,
  loading,
  savingPrefs,
  busyKey,
  error,
  notice,
  loadCurrent,
  generate,
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
  void loadCurrent()
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
      <p class="hero-copy">点菜看详情，点日期看当天要买什么。</p>
      <div class="hero-actions">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="loading"
          @click="generate"
        >
          {{ loading ? '生成中…' : plan ? '重新生成本周' : '生成本周菜单' }}
        </button>
        <button
          type="button"
          class="btn btn-ghost"
          :disabled="loading"
          @click="loadCurrent"
        >
          刷新本周
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
    </section>

    <section v-if="!plan && !loading" class="empty">
      <h2>这周吃什么？</h2>
      <p>先设置家庭人数和每餐几菜几汤，再点「生成本周菜单」。点击菜品看采购明细，点击日期汇总当天食材。</p>
    </section>

    <WeekBoard
      v-if="plan"
      :days="days"
      :busy-key="busyKey"
      @reroll="reroll"
      @feedback="activeItem = $event"
      @detail="detailItem = $event"
      @day-shop="shoppingDay = $event"
    />

    <p class="footer-note">
      {{ plan ? `周起始 ${plan.weekStart} · 共 ${plan.items.length} 道` : 'Daily Recipe' }}
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
