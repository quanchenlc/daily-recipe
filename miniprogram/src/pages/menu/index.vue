<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  confirmDayPlan,
  generatePlan,
  getDayPlan,
  regenerateDayPlan,
  rerollItem,
} from '../../api/client'
import { useAuth } from '../../composables/useAuth'
import type { DayPlanView, PlanItem } from '../../types'
import {
  formatMonthDay,
  mondayOfWeek,
  shiftDate,
  todayDate,
  weekdayLabel,
} from '../../utils/date'

const { ensureLogin } = useAuth()

const selectedDate = ref(todayDate())
const dayPlan = ref<DayPlanView | null>(null)
const loading = ref(false)
const busy = ref('')
const error = ref('')
const notice = ref('')

const title = computed(() => {
  const w = weekdayLabel(selectedDate.value)
  return `${formatMonthDay(selectedDate.value)} ${w}`
})

const lunchItems = computed(() =>
  (dayPlan.value?.items ?? []).filter((i) => i.mealSlot === 'lunch'),
)
const dinnerItems = computed(() =>
  (dayPlan.value?.items ?? []).filter((i) => i.mealSlot === 'dinner'),
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    await ensureLogin()
    dayPlan.value = await getDayPlan(selectedDate.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function onGenerateWeek() {
  busy.value = 'generate'
  error.value = ''
  notice.value = ''
  try {
    await ensureLogin()
    await generatePlan(mondayOfWeek(selectedDate.value))
    notice.value = '本周菜单已生成'
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '生成失败'
  } finally {
    busy.value = ''
  }
}

async function onRegenerateDay() {
  busy.value = 'regenerate'
  error.value = ''
  notice.value = ''
  try {
    await ensureLogin()
    await regenerateDayPlan(selectedDate.value)
    notice.value = '当天菜单已重新生成'
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '重新生成失败'
  } finally {
    busy.value = ''
  }
}

async function onConfirmDay() {
  busy.value = 'confirm'
  error.value = ''
  notice.value = ''
  try {
    await ensureLogin()
    dayPlan.value = await confirmDayPlan(selectedDate.value)
    notice.value = '已确认当天菜单'
  } catch (e) {
    error.value = e instanceof Error ? e.message : '确认失败'
  } finally {
    busy.value = ''
  }
}

async function onReroll(item: PlanItem) {
  if (!dayPlan.value?.planId) return
  busy.value = item.id
  error.value = ''
  try {
    await ensureLogin()
    await rerollItem(dayPlan.value.planId, item.id)
    await load()
    notice.value = '已换一道菜'
  } catch (e) {
    error.value = e instanceof Error ? e.message : '换菜失败'
  } finally {
    busy.value = ''
  }
}

function prevDay() {
  selectedDate.value = shiftDate(selectedDate.value, -1)
  void load()
}

function nextDay() {
  selectedDate.value = shiftDate(selectedDate.value, 1)
  void load()
}

function dishLabel(item: PlanItem) {
  if (item.dishType === 'soup') return '汤'
  if (item.dishCategory === 'vegetable') return '素'
  return '荤'
}

onShow(() => {
  void load()
})
</script>

<template>
  <view class="page">
    <view class="date-bar">
      <button class="nav-btn" size="mini" @tap="prevDay">‹</button>
      <text class="date-title">{{ title }}</text>
      <button class="nav-btn" size="mini" @tap="nextDay">›</button>
    </view>

    <view v-if="error" class="banner error">{{ error }}</view>
    <view v-if="notice" class="banner ok">{{ notice }}</view>

    <view v-if="loading" class="hint">加载中…</view>

    <view v-else-if="!dayPlan?.hasMenu" class="empty">
      <text class="empty-title">这一天还没有菜单</text>
      <text class="empty-desc">可先生成本周菜单，再查看当天安排</text>
      <button
        class="primary"
        :loading="busy === 'generate'"
        :disabled="Boolean(busy)"
        @tap="onGenerateWeek"
      >
        生成本周菜单
      </button>
    </view>

    <view v-else class="menu-card">
      <view class="status-row">
        <text v-if="dayPlan?.confirmed" class="badge confirmed">已确认</text>
        <text v-else class="badge draft">待确认</text>
      </view>

      <view class="meal-block">
        <text class="meal-title">午餐</text>
        <view v-for="item in lunchItems" :key="item.id" class="dish-row">
          <view class="dish-main">
            <text class="tag">{{ dishLabel(item) }}</text>
            <text class="name">{{ item.recipe.name }}</text>
          </view>
          <button
            class="link-btn"
            size="mini"
            :loading="busy === item.id"
            :disabled="Boolean(busy) || dayPlan?.confirmed"
            @tap="onReroll(item)"
          >
            换菜
          </button>
        </view>
      </view>

      <view class="meal-block">
        <text class="meal-title">晚餐</text>
        <view v-for="item in dinnerItems" :key="item.id" class="dish-row">
          <view class="dish-main">
            <text class="tag">{{ dishLabel(item) }}</text>
            <text class="name">{{ item.recipe.name }}</text>
          </view>
          <button
            class="link-btn"
            size="mini"
            :loading="busy === item.id"
            :disabled="Boolean(busy) || dayPlan?.confirmed"
            @tap="onReroll(item)"
          >
            换菜
          </button>
        </view>
      </view>

      <view class="actions">
        <button
          class="secondary"
          :loading="busy === 'regenerate'"
          :disabled="Boolean(busy) || dayPlan?.confirmed"
          @tap="onRegenerateDay"
        >
          重新生成当天
        </button>
        <button
          class="primary"
          :loading="busy === 'confirm'"
          :disabled="Boolean(busy) || dayPlan?.confirmed"
          @tap="onConfirmDay"
        >
          确认当天菜单
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  padding: 24rpx;
}
.date-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.date-title {
  font-size: 34rpx;
  font-weight: 600;
}
.nav-btn {
  min-width: 72rpx;
}
.banner {
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}
.banner.error {
  background: #fdecea;
  color: #b42318;
}
.banner.ok {
  background: #e8f5e9;
  color: #2d6a4f;
}
.hint,
.empty {
  text-align: center;
  padding: 80rpx 24rpx;
}
.empty-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
}
.empty-desc {
  display: block;
  color: #666;
  margin-bottom: 32rpx;
}
.menu-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
}
.status-row {
  margin-bottom: 16rpx;
}
.badge {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
}
.badge.confirmed {
  background: #e8f5e9;
  color: #2d6a4f;
}
.badge.draft {
  background: #fff4e5;
  color: #b54708;
}
.meal-block {
  margin-bottom: 24rpx;
}
.meal-title {
  display: block;
  font-weight: 600;
  margin-bottom: 12rpx;
}
.dish-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.dish-main {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}
.tag {
  font-size: 20rpx;
  background: #f0f4ef;
  color: #2d6a4f;
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
}
.name {
  flex: 1;
}
.link-btn {
  margin: 0;
}
.actions {
  display: flex;
  gap: 16rpx;
  margin-top: 8rpx;
}
.primary,
.secondary {
  flex: 1;
}
.primary {
  background: #2d6a4f;
  color: #fff;
}
.secondary {
  background: #fff;
  color: #2d6a4f;
  border: 1rpx solid #2d6a4f;
}
</style>
