<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getApiBase, getPreferences, updatePreferences } from '../../api/client'
import { useAuth } from '../../composables/useAuth'
import type { MealConfig, UserPreference } from '../../types'

const { ensureLogin, user } = useAuth()

const pref = ref<UserPreference | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const notice = ref('')

const adults = ref(2)
const elderly = ref(0)
const children = ref(0)
const flavorNotes = ref('')
const lunchMeat = ref(1)
const lunchVeg = ref(1)
const lunchSoup = ref(1)
const dinnerMeat = ref(1)
const dinnerVeg = ref(1)
const dinnerSoup = ref(1)

const apiBase = computed(() => getApiBase())

function applyPref(p: UserPreference) {
  adults.value = p.adultsCount
  elderly.value = p.elderlyCount
  children.value = p.childrenCount
  flavorNotes.value = p.flavorNotes ?? ''
  const mc = p.mealConfig
  lunchMeat.value = mc?.lunch.meatDishes ?? 1
  lunchVeg.value = mc?.lunch.vegetableDishes ?? 1
  lunchSoup.value = mc?.lunch.soups ?? 1
  dinnerMeat.value = mc?.dinner.meatDishes ?? 1
  dinnerVeg.value = mc?.dinner.vegetableDishes ?? 1
  dinnerSoup.value = mc?.dinner.soups ?? 1
}

function buildMealConfig(): MealConfig {
  return {
    lunch: {
      meatDishes: lunchMeat.value,
      vegetableDishes: lunchVeg.value,
      soups: lunchSoup.value,
    },
    dinner: {
      meatDishes: dinnerMeat.value,
      vegetableDishes: dinnerVeg.value,
      soups: dinnerSoup.value,
    },
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    await ensureLogin()
    pref.value = await getPreferences()
    if (pref.value) applyPref(pref.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  error.value = ''
  notice.value = ''
  try {
    await ensureLogin()
    pref.value = await updatePreferences({
      adultsCount: adults.value,
      elderlyCount: elderly.value,
      childrenCount: children.value,
      flavorNotes: flavorNotes.value,
      mealConfig: buildMealConfig(),
    })
    notice.value = '偏好已保存'
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

function step(field: 'adults' | 'elderly' | 'children', delta: number) {
  const map = { adults, elderly, children } as const
  const next = Math.max(0, map[field].value + delta)
  if (adults.value + elderly.value + children.value + delta < 1 && delta < 0) return
  map[field].value = next
}

onShow(() => {
  void load()
})
</script>

<template>
  <view class="page">
    <view class="card">
      <text class="label">当前用户</text>
      <text class="value">{{ user?.nickname || user?.id || '—' }}</text>
      <text class="sub">API：{{ apiBase }}</text>
    </view>

    <view v-if="error" class="banner error">{{ error }}</view>
    <view v-if="notice" class="banner ok">{{ notice }}</view>
    <view v-if="loading" class="hint">加载中…</view>

    <view v-else class="card form">
      <text class="section-title">家庭人数</text>
      <view class="stepper-row">
        <text>成人</text>
        <view class="stepper">
          <button size="mini" @tap="step('adults', -1)">-</button>
          <text>{{ adults }}</text>
          <button size="mini" @tap="step('adults', 1)">+</button>
        </view>
      </view>
      <view class="stepper-row">
        <text>老人</text>
        <view class="stepper">
          <button size="mini" @tap="step('elderly', -1)">-</button>
          <text>{{ elderly }}</text>
          <button size="mini" @tap="step('elderly', 1)">+</button>
        </view>
      </view>
      <view class="stepper-row">
        <text>儿童</text>
        <view class="stepper">
          <button size="mini" @tap="step('children', -1)">-</button>
          <text>{{ children }}</text>
          <button size="mini" @tap="step('children', 1)">+</button>
        </view>
      </view>

      <text class="section-title">午餐（荤/素/汤）</text>
      <view class="triple">
        <input v-model.number="lunchMeat" type="number" />
        <input v-model.number="lunchVeg" type="number" />
        <input v-model.number="lunchSoup" type="number" />
      </view>

      <text class="section-title">晚餐（荤/素/汤）</text>
      <view class="triple">
        <input v-model.number="dinnerMeat" type="number" />
        <input v-model.number="dinnerVeg" type="number" />
        <input v-model.number="dinnerSoup" type="number" />
      </view>

      <text class="section-title">口味备注</text>
      <textarea v-model="flavorNotes" placeholder="例如：偏清淡、少辣" />

      <button class="primary" :loading="saving" @tap="save">保存偏好</button>
    </view>
  </view>
</template>

<style scoped>
.page {
  padding: 24rpx;
}
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.label {
  display: block;
  color: #666;
  font-size: 24rpx;
}
.value {
  display: block;
  font-weight: 600;
  margin: 8rpx 0;
}
.sub {
  display: block;
  color: #999;
  font-size: 22rpx;
  word-break: break-all;
}
.banner {
  padding: 16rpx;
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
.hint {
  text-align: center;
  color: #666;
  padding: 40rpx 0;
}
.section-title {
  display: block;
  font-weight: 600;
  margin: 20rpx 0 12rpx;
}
.stepper-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10rpx 0;
}
.stepper {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.triple {
  display: flex;
  gap: 12rpx;
}
.triple input {
  flex: 1;
  background: #f6f8f4;
  padding: 12rpx;
  border-radius: 8rpx;
}
textarea {
  width: 100%;
  min-height: 120rpx;
  background: #f6f8f4;
  padding: 16rpx;
  border-radius: 8rpx;
  box-sizing: border-box;
}
.primary {
  margin-top: 24rpx;
  background: #2d6a4f;
  color: #fff;
}
</style>
