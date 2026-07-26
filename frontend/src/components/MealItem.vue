<script setup lang="ts">
import type { PlanItem } from '../types'
import { mealLabel } from '../utils/date'

defineProps<{
  item: PlanItem
  busy: boolean
}>()

defineEmits<{
  reroll: []
  feedback: []
}>()
</script>

<template>
  <article class="meal-item">
    <div class="meal-meta">
      <span class="meal-slot">{{ mealLabel(item.mealSlot) }}</span>
      <span v-if="item.recipe.cookMinutes" style="color: var(--ink-soft); font-size: 0.8rem">
        {{ item.recipe.cookMinutes }} 分钟
      </span>
    </div>

    <h3 class="meal-name">{{ item.recipe.name }}</h3>

    <ul v-if="item.recipe.tags?.length" class="meal-tags">
      <li v-for="tag in item.recipe.tags.slice(0, 3)" :key="tag">{{ tag }}</li>
    </ul>

    <p v-if="item.reason" style="margin: 0; color: var(--ink-soft); font-size: 0.84rem; line-height: 1.5">
      {{ item.reason }}
    </p>

    <div class="meal-actions">
      <button
        type="button"
        class="btn btn-soft btn-tiny"
        :disabled="busy"
        @click="$emit('reroll')"
      >
        {{ busy ? '更换中…' : '换一道' }}
      </button>
      <button
        type="button"
        class="btn btn-soft btn-tiny"
        :disabled="busy"
        @click="$emit('feedback')"
      >
        点评
      </button>
    </div>
  </article>
</template>
