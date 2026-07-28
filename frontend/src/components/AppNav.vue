<script setup lang="ts">
defineProps<{
  current: 'home' | 'history'
}>()

defineEmits<{
  navigate: [page: 'home' | 'history']
}>()
</script>

<template>
  <nav class="app-nav" aria-label="主导航">
    <button
      type="button"
      class="app-nav-btn"
      :class="{ 'app-nav-btn--active': current === 'home' }"
      @click="$emit('navigate', 'home')"
    >
      首页
    </button>
    <button
      type="button"
      class="app-nav-btn"
      :class="{ 'app-nav-btn--active': current === 'history' }"
      @click="$emit('navigate', 'history')"
    >
      历史菜单
    </button>
  </nav>
</template>
