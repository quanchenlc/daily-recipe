<script setup lang="ts">
import type { PlanItem } from '../types'

defineProps<{
  item: PlanItem
  busy: boolean
  compact?: boolean
}>()

const emit = defineEmits<{
  reroll: []
  feedback: []
  detail: []
}>()
</script>

<template>
  <article
    class="meal-item"
    :class="{
      'meal-item--soup': item.dishType === 'soup',
      'meal-item--compact': compact !== false,
    }"
  >
    <button type="button" class="meal-main meal-main--clickable" @click="emit('detail')">
      <span class="meal-kind">{{ item.dishType === 'soup' ? '汤' : '菜' }}</span>
      <div class="meal-body">
        <h3 class="meal-name">{{ item.recipe.name }}</h3>
        <p v-if="item.recipe.tags?.length" class="meal-tags-inline">
          {{ item.recipe.tags.slice(0, 2).join(' · ') }}
          <span v-if="item.recipe.cookMinutes" class="meal-time">{{ item.recipe.cookMinutes }}分</span>
        </p>
      </div>
    </button>

    <div class="meal-actions">
      <button
        type="button"
        class="btn btn-soft btn-tiny btn-icon"
        :disabled="busy"
        :title="busy ? '更换中' : '换一道'"
        @click.stop="emit('reroll')"
      >
        {{ busy ? '…' : '换' }}
      </button>
      <button
        type="button"
        class="btn btn-soft btn-tiny btn-icon"
        :disabled="busy"
        title="点评"
        @click.stop="emit('feedback')"
      >
        评
      </button>
    </div>
  </article>
</template>
