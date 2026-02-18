<script setup lang="ts">
import { onMounted } from 'vue'

// Apply saved theme on app start
onMounted(() => {
  const savedTheme = localStorage.getItem('theme') || 'light'
  const body = document.body
  if (savedTheme === 'dark') {
    body.style.filter = 'grayscale(1) invert(1) sepia(1) contrast(75%)'
    body.style.overflow = 'hidden'
  } else {
    body.style.filter = ''
    body.style.overflow = ''
  }
})
</script>

<template>
  <div class="h-screen bg-whitesmoke-200 flex flex-col p-2.5 gap-2.5 overflow-hidden">
    <RouterView />
  </div>
</template>
