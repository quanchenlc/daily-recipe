<script setup lang="ts">
import { formatMonthDay, isToday } from '../utils/date'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onChange(event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (value) emit('update:modelValue', value)
}

function pickToday() {
  const now = new Date()
  const y = now.getFullYear()
  const m = `${now.getMonth() + 1}`.padStart(2, '0')
  const d = `${now.getDate()}`.padStart(2, '0')
  emit('update:modelValue', `${y}-${m}-${d}`)
}
</script>

<template>
  <div class="date-picker">
    <label class="date-picker-label" for="menu-date">选择日期</label>
    <div class="date-picker-row">
      <input
        id="menu-date"
        class="date-picker-input"
        type="date"
        :value="modelValue"
        @change="onChange"
      />
      <button
        v-if="!isToday(modelValue)"
        type="button"
        class="btn btn-soft btn-tiny"
        @click="pickToday"
      >
        今天
      </button>
    </div>
    <p class="date-picker-hint">
      {{ formatMonthDay(modelValue) }} 的菜单
      <span v-if="isToday(modelValue)" class="date-picker-tag">今天</span>
    </p>
  </div>
</template>
