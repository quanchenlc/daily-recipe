<script setup lang="ts">
import { onMounted, ref } from 'vue'
import FeedbackModal from './components/FeedbackModal.vue'
import WeekBoard from './components/WeekBoard.vue'
import { useWeekPlan } from './composables/useWeekPlan'
import type { PlanItem } from './types'

const {
  plan,
  preference,
  days,
  loading,
  busyKey,
  error,
  notice,
  loadCurrent,
  generate,
  reroll,
  feedback,
} = useWeekPlan()

const activeItem = ref<PlanItem | null>(null)

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
      <p class="hero-copy">一周午晚餐一次想好，少重复，还记得你爱吃什么。</p>
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

    <section class="panel">
      <div class="pref-bar">
        <span class="pref-label">口味</span>
        <p class="pref-text">
          {{ preference?.summaryText || '还没有点评，吃完记一笔，下周更懂你。' }}
        </p>
      </div>

      <div v-if="notice" class="banner banner-ok">{{ notice }}</div>
      <div v-if="error" class="banner banner-err">{{ error }}</div>
    </section>

    <section v-if="!plan && !loading" class="empty">
      <h2>这周吃什么？</h2>
      <p>点上面的「生成本周菜单」，我会安排 7 天午餐和晚餐，并尽量 30 天内不重复。</p>
    </section>

    <WeekBoard
      v-if="plan"
      :days="days"
      :busy-key="busyKey"
      @reroll="reroll"
      @feedback="activeItem = $event"
    />

    <p class="footer-note">
      {{ plan ? `周起始 ${plan.weekStart} · 共 ${plan.items.length} 餐` : 'Daily Recipe' }}
    </p>

    <FeedbackModal
      :item="activeItem"
      :submitting="busyKey?.startsWith('feedback-') ?? false"
      @close="activeItem = null"
      @submit="onFeedbackSubmit"
    />
  </div>
</template>
