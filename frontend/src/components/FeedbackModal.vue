<script setup lang="ts">
import { ref, watch } from 'vue'
import type { PlanItem } from '../types'
import { mealLabel } from '../utils/date'

const props = defineProps<{
  item: PlanItem | null
  submitting: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: { rating: number; comment: string }]
}>()

const rating = ref(5)
const comment = ref('')

watch(
  () => props.item,
  () => {
    rating.value = 5
    comment.value = ''
  },
)

function onSubmit() {
  emit('submit', { rating: rating.value, comment: comment.value })
}
</script>

<template>
  <div v-if="item" class="modal-mask" @click.self="emit('close')">
    <div class="modal" role="dialog" aria-modal="true">
      <h3>点评这道菜</h3>
      <p>
        {{ item.serveDate }} · {{ mealLabel(item.mealSlot) }} ·
        {{ item.recipe.name }}
      </p>

      <div class="stars" aria-label="评分">
        <button
          v-for="n in 5"
          :key="n"
          type="button"
          class="star"
          :class="{ active: rating >= n }"
          @click="rating = n"
        >
          {{ n }}
        </button>
      </div>

      <textarea
        v-model="comment"
        maxlength="200"
        placeholder="例如：好吃家常 / 太油 / 下次少辣"
      />

      <div class="modal-actions">
        <button type="button" class="btn btn-soft btn-tiny" @click="emit('close')">
          取消
        </button>
        <button
          type="button"
          class="btn btn-primary btn-tiny"
          :disabled="submitting"
          @click="onSubmit"
        >
          {{ submitting ? '提交中…' : '记住我的口味' }}
        </button>
      </div>
    </div>
  </div>
</template>
