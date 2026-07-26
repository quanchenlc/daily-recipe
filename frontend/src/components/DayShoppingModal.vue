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

const sections = computed(() => {
  if (!props.day) return []
  return buildDayShoppingList(collectDayItems(props.day), props.familySize)
})

const dishCount = computed(() => (props.day ? collectDayItems(props.day).length : 0))

const totalItems = computed(() =>
  sections.value.reduce((sum, s) => sum + s.lines.length, 0),
)
</script>

<template>
  <div v-if="day" class="modal-mask" @click.self="$emit('close')">
    <div class="modal modal--detail modal--shopping" role="dialog" aria-modal="true">
      <div class="modal-detail-head">
        <div>
          <p class="modal-detail-meta">今日买菜清单</p>
          <h3>{{ day.weekday }} · {{ formatMonthDay(day.date) }}</h3>
        </div>
        <button type="button" class="btn btn-soft btn-tiny" @click="$emit('close')">关闭</button>
      </div>

      <p class="modal-detail-desc">
        按菜场分区汇总 {{ dishCount }} 道菜，共 {{ totalItems }} 项。蔬菜水果区照着买就行。
      </p>

      <div v-if="sections.length" class="shopping-sections">
        <section
          v-for="section in sections"
          :key="section.id"
          class="shopping-section shopping-section--group"
        >
          <h4 class="shopping-section-title">{{ section.title }}</h4>
          <ul class="ingredient-list ingredient-list--shopping">
            <li
              v-for="line in section.lines"
              :key="`${section.id}-${line.name}`"
              class="ingredient-row ingredient-row--shopping"
            >
              <div class="ingredient-main">
                <span class="ingredient-name">{{ line.name }}</span>
                <span class="ingredient-amount">{{ line.displayAmount }}</span>
              </div>
              <p v-if="section.id !== 'seasoning'" class="ingredient-from">
                {{ line.usedIn.join('、') }}
              </p>
            </li>
          </ul>
        </section>
      </div>
      <p v-else class="modal-detail-desc">暂无食材，请重新生成菜单。</p>
    </div>
  </div>
</template>
