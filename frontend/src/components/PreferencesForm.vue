<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { MealConfig, UserPreference } from '../types'

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

    <p v-if="!open" class="pref-text">
      {{ preference?.summaryText || '设置人数、口味和每餐几菜几汤，生成更贴合你家的菜单。' }}
    </p>

    <form v-else class="pref-form" @submit.prevent="submit">
      <fieldset class="pref-fieldset">
        <legend>家庭人数</legend>
        <div class="pref-grid">
          <label class="pref-input">
            <span>成人</span>
            <input v-model.number="form.adultsCount" type="number" min="0" max="20" />
          </label>
          <label class="pref-input">
            <span>老人</span>
            <input v-model.number="form.elderlyCount" type="number" min="0" max="10" />
          </label>
          <label class="pref-input">
            <span>儿童</span>
            <input v-model.number="form.childrenCount" type="number" min="0" max="10" />
          </label>
        </div>
        <p class="pref-hint">共 {{ familyTotal() }} 人用餐</p>
      </fieldset>

      <label class="pref-textarea">
        <span>口味偏好</span>
        <textarea
          v-model="form.flavorNotes"
          rows="3"
          placeholder="例如：偏清淡、少辣、不吃香菜、喜欢粤菜…"
        />
      </label>

      <fieldset class="pref-fieldset">
        <legend>每餐结构</legend>
        <div class="meal-config-block">
          <p class="meal-config-title">午餐</p>
          <div class="pref-grid">
            <label class="pref-input">
              <span>菜</span>
              <input v-model.number="form.lunchDishes" type="number" min="0" max="6" />
            </label>
            <label class="pref-input">
              <span>汤</span>
              <input v-model.number="form.lunchSoups" type="number" min="0" max="4" />
            </label>
          </div>
        </div>
        <div class="meal-config-block">
          <p class="meal-config-title">晚餐</p>
          <div class="pref-grid">
            <label class="pref-input">
              <span>菜</span>
              <input v-model.number="form.dinnerDishes" type="number" min="0" max="6" />
            </label>
            <label class="pref-input">
              <span>汤</span>
              <input v-model.number="form.dinnerSoups" type="number" min="0" max="4" />
            </label>
          </div>
        </div>
      </fieldset>

      <button type="submit" class="btn btn-primary btn-block" :disabled="saving || familyTotal() < 1">
        {{ saving ? '保存中…' : '保存设置' }}
      </button>
    </form>
  </section>
</template>
