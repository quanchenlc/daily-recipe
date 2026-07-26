<script setup lang="ts">
import { computed } from 'vue'
import type { DayMeals } from '../types'
import { formatMonthDay } from '../utils/date'
import { buildDayShoppingList, collectDayItems } from '../utils/ingredients'

const props = defineProps<{
  day: DayMeals | null
  familySize: number
}>()

defineEmits<{
  close: []
}>()

const lines = computed(() => {
  if (!props.day) return []
  return buildDayShoppingList(collectDayItems(props.day), props.familySize)
})

const dishCount = computed(() => (props.day ? collectDayItems(props.day).length : 0))
</script>

<template>
  <div v-if="day" class="modal-mask" @click.self="$emit('close')">
    <div class="modal modal--detail" role="dialog" aria-modal="true">
      <div class="modal-detail-head">
        <div>
          <p class="modal-detail-meta">今日采购汇总</p>
          <h3>{{ day.weekday }} · {{ formatMonthDay(day.date) }}</h3>
        </div>
        <button type="button" class="btn btn-soft btn-tiny" @click="$emit('close')">关闭</button>
      </div>

      <p class="modal-detail-desc">
        合并今日 {{ dishCount }} 道菜的食材，去重后方便你一次性买菜。
      </p>

      <section class="shopping-section">
        <h4>要买什么</h4>
        <ul v-if="lines.length" class="ingredient-list ingredient-list--shopping">
          <li v-for="line in lines" :key="line.name" class="ingredient-row ingredient-row--shopping">
            <div class="ingredient-main">
              <span class="ingredient-name">{{ line.name }}</span>
              <span class="ingredient-amount">{{ line.displayAmount }}</span>
            </div>
            <p class="ingredient-from">用于：{{ line.usedIn.join('、') }}</p>
          </li>
        </ul>
        <p v-else class="modal-detail-desc">暂无食材数据，请重新生成菜单。</p>
      </section>
    </div>
  </div>
</template>
