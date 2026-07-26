<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { MealConfig, UserPreference } from '../types'
import CounterStepper from './CounterStepper.vue'

const props = defineProps<{
  preference: UserPreference | null
  saving: boolean
}>()

const emit = defineEmits<{
  save: [payload: {
    adultsCount: number
    elderlyCount: number
    childrenCount: number
    flavorNotes: string
    mealConfig: MealConfig
  }]
}>()

const open = ref(false)

const form = reactive({
  adultsCount: 2,
  elderlyCount: 0,
  childrenCount: 0,
  flavorNotes: '',
  lunchDishes: 2,
  lunchSoups: 1,
  dinnerDishes: 3,
  dinnerSoups: 1,
})

watch(
  () => props.preference,
  (pref) => {
    if (!pref) return
    form.adultsCount = pref.adultsCount ?? 2
    form.elderlyCount = pref.elderlyCount ?? 0
    form.childrenCount = pref.childrenCount ?? 0
    form.flavorNotes = pref.flavorNotes ?? ''
    form.lunchDishes = pref.mealConfig?.lunch.dishes ?? 2
    form.lunchSoups = pref.mealConfig?.lunch.soups ?? 1
    form.dinnerDishes = pref.mealConfig?.dinner.dishes ?? 3
    form.dinnerSoups = pref.mealConfig?.dinner.soups ?? 1
  },
  { immediate: true },
)

const familyTotal = () => form.adultsCount + form.elderlyCount + form.childrenCount

function submit() {
  emit('save', {
    adultsCount: form.adultsCount,
    elderlyCount: form.elderlyCount,
    childrenCount: form.childrenCount,
    flavorNotes: form.flavorNotes.trim(),
    mealConfig: {
      lunch: { dishes: form.lunchDishes, soups: form.lunchSoups },
      dinner: { dishes: form.dinnerDishes, soups: form.dinnerSoups },
    },
  })
}
</script>

<template>
  <section class="panel pref-panel">
    <button type="button" class="pref-toggle" @click="open = !open">
      <span class="pref-label">家庭与口味设置</span>
      <span class="pref-toggle-hint">{{ open ? '收起' : '展开' }}</span>
    </button>

    <p v-if="!open" class="pref-text pref-text--compact">
      {{ preference?.summaryText || '设置人数、口味和每餐几菜几汤。' }}
    </p>

    <form v-else class="pref-form" @submit.prevent="submit">
      <fieldset class="pref-fieldset">
        <legend>家庭人数 <span class="pref-hint-inline">共 {{ familyTotal() }} 人</span></legend>
        <div class="stepper-grid">
          <CounterStepper v-model="form.adultsCount" label="成人" :min="0" :max="20" />
          <CounterStepper v-model="form.elderlyCount" label="老人" :min="0" :max="10" />
          <CounterStepper v-model="form.childrenCount" label="儿童" :min="0" :max="10" />
        </div>
      </fieldset>

      <label class="pref-textarea">
        <span>口味偏好</span>
        <textarea
          v-model="form.flavorNotes"
          rows="2"
          placeholder="偏清淡、少辣、不吃香菜…"
        />
      </label>

      <fieldset class="pref-fieldset">
        <legend>每餐结构</legend>
        <div class="meal-config-row">
          <span class="meal-config-title">午餐</span>
          <CounterStepper v-model="form.lunchDishes" label="菜" :min="0" :max="6" />
          <CounterStepper v-model="form.lunchSoups" label="汤" :min="0" :max="4" />
        </div>
        <div class="meal-config-row">
          <span class="meal-config-title">晚餐</span>
          <CounterStepper v-model="form.dinnerDishes" label="菜" :min="0" :max="6" />
          <CounterStepper v-model="form.dinnerSoups" label="汤" :min="0" :max="4" />
        </div>
      </fieldset>

      <button type="submit" class="btn btn-primary btn-block btn-compact" :disabled="saving || familyTotal() < 1">
        {{ saving ? '保存中…' : '保存设置' }}
      </button>
    </form>
  </section>
</template>
