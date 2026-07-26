<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    max?: number
    label: string
  }>(),
  { min: 0, max: 20 },
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function dec() {
  if (props.modelValue > props.min) {
    emit('update:modelValue', props.modelValue - 1)
  }
}

function inc() {
  if (props.modelValue < props.max) {
    emit('update:modelValue', props.modelValue + 1)
  }
}
</script>

<template>
  <div class="stepper">
    <span class="stepper-label">{{ label }}</span>
    <div class="stepper-controls">
      <button type="button" class="stepper-btn" :disabled="modelValue <= min" @click="dec">−</button>
      <span class="stepper-value">{{ modelValue }}</span>
      <button type="button" class="stepper-btn" :disabled="modelValue >= max" @click="inc">+</button>
    </div>
  </div>
</template>
