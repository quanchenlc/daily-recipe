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
  viewMode,
  plan,
  preference,
  days,
  weekStart,
  hasMenu,
  hasWeekPlan,
  isDayConfirmed,
  isWeekDraft,
  isWeekConfirmed,
  loading,
  confirming,
  confirmingWeek,
  savingPrefs,
  busyKey,
  error,
  notice,
  loadForDate,
  generate,
  confirmDay,
  confirmWeek,
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

const showBoard = computed(
  () =>
    (viewMode.value === 'week' && hasWeekPlan.value) ||
    (viewMode.value === 'day' && hasMenu.value),
)

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
        先生成本周预设菜单，确认后正式启用；确认前后都可以随时换菜。
      </p>

      <DatePicker v-model="selectedDate" />

      <div class="view-toggle" role="tablist" aria-label="查看范围">
        <button
          type="button"
          class="view-toggle-btn"
          :class="{ 'view-toggle-btn--active': viewMode === 'day' }"
          @click="viewMode = 'day'"
        >
          看当天
        </button>
        <button
          type="button"
          class="view-toggle-btn"
          :class="{ 'view-toggle-btn--active': viewMode === 'week' }"
          :disabled="!hasWeekPlan"
          @click="viewMode = 'week'"
        >
          看整周
        </button>
      </div>

      <div class="hero-actions">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="loading"
          @click="generate"
        >
          {{
            loading
              ? '生成中…'
              : hasWeekPlan
                ? '重新生成预设'
                : '生成本周预设菜单'
          }}
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
          v-if="hasWeekPlan && isWeekDraft"
          type="button"
          class="btn btn-accent"
          :disabled="confirmingWeek"
          @click="confirmWeek"
        >
          {{ confirmingWeek ? '确认中…' : '确认设为本周菜单' }}
        </button>
        <button
          v-if="hasMenu && !isDayConfirmed"
          type="button"
          class="btn btn-accent"
          :disabled="confirming"
          @click="confirmDay"
        >
          {{ confirming ? '确认中…' : '确认当天菜单' }}
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
      <div v-if="hasWeekPlan && isWeekDraft" class="banner banner-warn">
        本周菜单为预设状态，确认后正式启用（仍可换菜）
      </div>
      <div v-if="hasWeekPlan && isWeekConfirmed" class="banner banner-ok">
        本周菜单已确认 · 周起始 {{ weekStart }}
      </div>
      <div v-if="hasMenu && isDayConfirmed" class="banner banner-ok">
        {{ selectedDate }} 当天菜单已确认
      </div>
    </section>

    <section v-if="!showBoard && !loading" class="empty">
      <h2>这一天还没有菜单</h2>
      <p>可以换一天查看，或点「生成本周预设菜单」先安排一周午晚餐。</p>
    </section>

    <WeekBoard
      v-if="showBoard"
      :days="days"
      :busy-key="busyKey"
      @reroll="reroll"
      @feedback="activeItem = $event"
      @detail="detailItem = $event"
      @day-shop="shoppingDay = $event"
    />

    <p class="footer-note">
      {{
        hasWeekPlan
          ? `${weekStart} 周 · ${plan?.items.length ?? 0} 道 · ${
              isWeekDraft ? '预设中' : '已确认'
            }`
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
