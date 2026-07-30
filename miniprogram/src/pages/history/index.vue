<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMenuHistory, getMenuHistoryDetail } from '../../api/client'
import { useAuth } from '../../composables/useAuth'
import type { MenuHistoryDetail, MenuHistoryEntry } from '../../types'
import { formatMonthDay, weekdayLabel } from '../../utils/date'

const { ensureLogin } = useAuth()

const list = ref<MenuHistoryEntry[]>([])
const loading = ref(false)
const error = ref('')
const detail = ref<MenuHistoryDetail | null>(null)
const showDetail = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    await ensureLogin()
    list.value = await getMenuHistory(30)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function openDetail(date: string) {
  try {
    await ensureLogin()
    detail.value = await getMenuHistoryDetail(date)
    showDetail.value = true
  } catch (e) {
    uni.showToast({
      title: e instanceof Error ? e.message : '加载详情失败',
      icon: 'none',
    })
  }
}

function closeDetail() {
  showDetail.value = false
  detail.value = null
}

onShow(() => {
  void load()
})
</script>

<template>
  <view class="page">
    <view v-if="error" class="banner error">{{ error }}</view>
    <view v-if="loading" class="hint">加载中…</view>
    <view v-else-if="!list.length" class="hint">暂无已确认的历史菜单</view>

    <view v-else class="list">
      <view
        v-for="item in list"
        :key="item.date"
        class="card"
        @tap="openDetail(item.date)"
      >
        <view class="row">
          <text class="date">{{ formatMonthDay(item.date) }} {{ weekdayLabel(item.date) }}</text>
          <text class="count">{{ item.dishCount }} 道菜</text>
        </view>
        <text class="preview">{{ item.preview.join('、') }}</text>
      </view>
    </view>

    <view v-if="showDetail && detail" class="modal-mask" @tap="closeDetail">
      <view class="modal" @tap.stop>
        <text class="modal-title">
          {{ formatMonthDay(detail.date) }} {{ weekdayLabel(detail.date) }}
        </text>
        <view v-for="(item, idx) in detail.items" :key="idx" class="detail-row">
          <text class="slot">{{ item.mealSlot === 'lunch' ? '午' : '晚' }}</text>
          <text class="name">{{ item.recipeName }}</text>
        </view>
        <button class="primary" @tap="closeDetail">关闭</button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  padding: 24rpx;
}
.banner.error {
  background: #fdecea;
  color: #b42318;
  padding: 16rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}
.hint {
  text-align: center;
  color: #666;
  padding: 80rpx 0;
}
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.date {
  font-weight: 600;
}
.count {
  color: #666;
  font-size: 24rpx;
}
.preview {
  color: #444;
  font-size: 26rpx;
}
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
}
.modal {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx 24rpx calc(32rpx + env(safe-area-inset-bottom));
  max-height: 70vh;
  overflow: auto;
}
.modal-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
}
.detail-row {
  display: flex;
  gap: 12rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.slot {
  color: #2d6a4f;
  width: 40rpx;
}
.name {
  flex: 1;
}
.primary {
  margin-top: 24rpx;
  background: #2d6a4f;
  color: #fff;
}
</style>
