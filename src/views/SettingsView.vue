<script setup lang="ts">
import SettingsPage from '@/pages/SettingsPage.vue'
import AppHeader from '../components/AppHeader.vue'
import MainStructure from '../components/MainStructure.vue'
import LogoPage from '../pages/LogoPage.vue'
</script>

<template>
  <AppHeader />
  <MainStructure>
    <template #left>
      <LogoPage />
    </template>
    <template #right>
      <SettingsPage />
    </template>
  </MainStructure>
</template>
