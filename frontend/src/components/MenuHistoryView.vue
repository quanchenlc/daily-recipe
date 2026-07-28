<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getMenuHistory, getMenuHistoryDetail } from '../api/client'
import type { MenuHistoryEntry } from '../types'
import { formatMonthDay } from '../utils/date'
import { formatConfirmedAt, snapshotToDayMeals } from '../utils/history'
import WeekBoard from './WeekBoard.vue'

const emit = defineEmits<{
  openDate: [date: string]
}>()

const entries = ref<MenuHistoryEntry[]>([])
const loading = ref(false)
const error = ref('')
const selectedDate = ref<string | null>(null)
const detailLoading = ref(false)
const detailDays = ref<ReturnType<typeof snapshotToDayMeals>[]>([])
const detailConfirmedAt = ref('')

const hasEntries = computed(() => entries.value.length > 0)

async function loadHistory() {
  loading.value = true
  error.value = ''
  try {
    entries.value = await getMenuHistory(50)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载历史失败'
  } finally {
    loading.value = false
  }
}

async function openDetail(date: string) {
  selectedDate.value = date
  detailLoading.value = true
  error.value = ''
  try {
    const detail = await getMenuHistoryDetail(date)
    detailConfirmedAt.value = detail.confirmedAt
    detailDays.value = [snapshotToDayMeals(detail.date, detail.items)]
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载详情失败'
    detailDays.value = []
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  selectedDate.value = null
  detailDays.value = []
}

onMounted(() => {
  void loadHistory()
})

defineExpose({ reload: loadHistory })
</script>

<template>
  <div class="history-page">
    <header class="history-head">
      <h2 class="history-title">历史菜单</h2>
      <p class="history-desc">这里只显示你确认过的菜单，重新生成周计划不会删掉记录。</p>
    </header>

    <div v-if="error" class="banner banner-err">{{ error }}</div>

    <section v-if="loading" class="empty empty--compact">
      <p>加载中…</p>
    </section>

    <section v-else-if="!hasEntries" class="empty">
      <h2>还没有确认过的菜单</h2>
      <p>在首页生成菜单并点「确认当天菜单」或「确认设为本周菜单」后，会出现在这里。</p>
    </section>

    <ul v-else class="history-list">
      <li v-for="entry in entries" :key="entry.date">
        <button type="button" class="history-card" @click="openDetail(entry.date)">
          <div class="history-card-head">
            <span class="history-card-date">{{ formatMonthDay(entry.date) }}</span>
            <span class="history-card-meta">{{ entry.dishCount }} 道菜</span>
          </div>
          <p class="history-card-preview">{{ entry.preview.join('、') }}</p>
          <p class="history-card-time">确认于 {{ formatConfirmedAt(entry.confirmedAt) }}</p>
        </button>
      </li>
    </ul>

    <div v-if="selectedDate" class="modal-mask" @click.self="closeDetail">
      <div class="modal modal--detail modal--history" role="dialog" aria-modal="true">
        <div class="modal-detail-head">
          <div>
            <p class="modal-detail-meta">历史菜单详情</p>
            <h3>{{ formatMonthDay(selectedDate) }} · {{ selectedDate }}</h3>
            <p v-if="detailConfirmedAt" class="modal-detail-desc">
              确认于 {{ formatConfirmedAt(detailConfirmedAt) }}
            </p>
          </div>
          <button type="button" class="btn btn-soft btn-tiny" @click="closeDetail">关闭</button>
        </div>

        <div v-if="detailLoading" class="empty empty--compact">
          <p>加载中…</p>
        </div>

        <WeekBoard
          v-else-if="detailDays.length"
          :days="detailDays"
          :busy-key="null"
          readonly
        />

        <div class="history-detail-actions">
          <button
            type="button"
            class="btn btn-soft btn-tiny"
            @click="emit('openDate', selectedDate!)"
          >
            在首页查看该日
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
