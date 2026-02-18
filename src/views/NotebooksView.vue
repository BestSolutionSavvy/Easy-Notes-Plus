<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import MainStructure from '../components/MainStructure.vue'
import NotebooksPage from '../pages/NotebooksPage.vue'
import PdfPreviewPage from '../pages/PdfPreviewPage.vue'
import type { Notebook } from '../types/notebook'

const selectedNotebook = ref<Notebook | undefined>(undefined)
const handleSelectNotebook = (notebook: Notebook) => {
  selectedNotebook.value = notebook
}
</script>

<template>
  <AppHeader />
  <MainStructure>
    <template #left>
      <NotebooksPage @select-notebook="handleSelectNotebook" />
    </template>
    <template #right>
      <PdfPreviewPage :notebook="selectedNotebook" />
    </template>
  </MainStructure>
</template>
