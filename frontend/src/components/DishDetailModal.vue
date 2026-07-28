<script setup lang="ts">
import { computed } from 'vue'
import type { PlanItem } from '../types'
import { dishTypeLabel, mealLabel } from '../utils/date'
import { getDishIngredients } from '../utils/ingredients'

const props = defineProps<{
  item: PlanItem | null
  familySize: number
}>()

defineEmits<{
  close: []
}>()

const ingredients = computed(() =>
  props.item ? getDishIngredients(props.item, props.familySize) : [],
)
</script>

<template>
  <div v-if="item" class="modal-mask" @click.self="$emit('close')">
    <div class="modal modal--detail" role="dialog" aria-modal="true">
      <div class="modal-detail-head">
        <div>
          <p class="modal-detail-meta">
            {{ item.serveDate }} · {{ mealLabel(item.mealSlot) }} ·
            {{ dishTypeLabel(item.dishType) }}
          </p>
          <h3>{{ item.recipe.name }}</h3>
        </div>
        <button type="button" class="btn btn-soft btn-tiny" @click="$emit('close')">关闭</button>
      </div>

      <p v-if="item.recipe.description" class="modal-detail-desc">
        {{ item.recipe.description }}
      </p>
      <p v-else-if="item.reason" class="modal-detail-desc">{{ item.reason }}</p>

      <div class="modal-detail-meta-row">
        <span v-if="item.recipe.cookMinutes">⏱ {{ item.recipe.cookMinutes }} 分钟</span>
        <span v-if="item.recipe.difficulty">难度 {{ item.recipe.difficulty }}</span>
        <span v-if="item.recipe.tags?.length">{{ item.recipe.tags.join(' · ') }}</span>
      </div>

      <section class="shopping-section">
        <h4>采购清单（{{ familySize }} 人份）</h4>
        <ul class="ingredient-list">
          <li v-for="(ing, i) in ingredients" :key="i" class="ingredient-row">
            <span class="ingredient-name">{{ ing.name }}</span>
            <span class="ingredient-amount">{{ ing.amount || '适量' }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
