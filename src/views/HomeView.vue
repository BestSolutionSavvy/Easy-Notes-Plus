<script setup lang="ts">
import AppHeader from '../components/AppHeader.vue'
import MainStructure from '../components/MainStructure.vue'
import PdfPage from '../pages/PdfPage.vue'
import NotePage from '../pages/NotePage.vue'
import { onMounted, onUnmounted, ref } from 'vue'
import type { Notebook } from '../types/notebook'
import { loadNotebook } from '../lib/notebookUtils'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  fileName?: string
  subject?: string
  pdfFileName?: string
}>()

const openedNotebook = ref<Notebook | null>(null)
const currentNotebookPage = ref<number>(0)
const currentPdfPage = ref<number>(0)
const headerRef = ref<InstanceType<typeof AppHeader> | null>(null)
const notePageRightRef = ref<InstanceType<typeof NotePage> | null>(null)

const STORAGE_KEY = 'easy-notes-current-notebook'

const saveNotebookToSession = (notebook: Notebook) => {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        fileName: notebook.name,
        subject: notebook.subject,
        pdfFileName: notebook.pdf ? notebook.name : undefined,
      }),
    )
  } catch (error) {
    console.error('Error saving to session storage:', error)
  }
}

const loadNotebookFromSession = (): {
  fileName?: string
  subject?: string
  pdfFileName?: string
} | null => {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('Error loading from session storage:', error)
    return null
  }
}

const clearNotebookSession = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Error clearing session storage:', error)
  }
}

const handleOpenNotebook = (notebook: Notebook) => {
  handleCloseNotebook()
  openedNotebook.value = notebook
  const pageIndex = notebook.last_page || 1
  currentNotebookPage.value = pageIndex
  currentPdfPage.value =
    notebook.pages.find((p) => p.page_number === currentNotebookPage.value)?.page_number ||
    pageIndex
  saveNotebookToSession(notebook)
}

const handleCloseNotebook = () => {
  openedNotebook.value = null
  currentNotebookPage.value = 0
  currentPdfPage.value = 0
  clearNotebookSession()
}

const handleNavigateToPage = (pageNumber: number) => {
  if (openedNotebook.value && openedNotebook.value.pages) {
    currentNotebookPage.value = pageNumber
    const page = openedNotebook.value.pages.find((p) => p.page_number === pageNumber)
    if (page) {
      currentPdfPage.value = page.page_number
    } else {
      currentPdfPage.value = pageNumber
    }
  }
}

const handlePageNext = () => {
  if (openedNotebook.value && openedNotebook.value.pages) {
    const maxPage = openedNotebook.value.num_notebook_pages
    if (currentNotebookPage.value < maxPage) {
      currentNotebookPage.value++
      const page = openedNotebook.value.pages.find(
        (p) => p.page_number === currentNotebookPage.value,
      )
      if (page) {
        currentPdfPage.value = page.page_number
      } else {
        currentPdfPage.value = currentPdfPage.value + 1
      }
    }
  }
}

const handlePagePrev = () => {
  if (currentNotebookPage.value > 1) {
    currentNotebookPage.value--
    if (openedNotebook.value && openedNotebook.value.pages) {
      const page = openedNotebook.value.pages.find(
        (p) => p.page_number === currentNotebookPage.value,
      )
      if (page) {
        currentPdfPage.value = page.page_number
      } else {
        currentPdfPage.value = Math.max(1, currentPdfPage.value - 1)
      }
    }
  }
}

const handlePageGoto = (pageNumber: number) => {
  if (openedNotebook.value && openedNotebook.value.num_notebook_pages) {
    const maxPage = openedNotebook.value.num_notebook_pages
    if (pageNumber >= 1 && pageNumber <= maxPage) {
      currentPdfPage.value = pageNumber
      if (openedNotebook.value.pages) {
        const page = openedNotebook.value.pages.find((p) => p.page_number === pageNumber)
        if (page) {
          currentNotebookPage.value = page.page_number
        } else {
          currentNotebookPage.value = pageNumber
        }
      } else {
        currentNotebookPage.value = pageNumber
      }
    }
  }
}

const isTyping = (): boolean => {
  const activeElement = document.activeElement
  let isTyping = false
  if (activeElement) {
    const tagName = activeElement.tagName.toLowerCase()
    const isEditable = activeElement.getAttribute('contenteditable') === 'true'
    isTyping = tagName === 'input' || tagName === 'textarea' || isEditable
  }
  return isTyping
}

// Keyboard shortcuts handling for notebook navigation and actions
const handleKeydown = (event: KeyboardEvent) => {
  const isTypingNow = isTyping()
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault()
    headerRef.value?.toggleSave()
  } else if (event.ctrlKey && isTypingNow && event.key === 'ArrowRight') {
    event.preventDefault()
    handlePageNext()
    notePageRightRef.value?.startEditing()
  } else if (event.ctrlKey && isTypingNow && event.key === 'ArrowLeft') {
    event.preventDefault()
    handlePagePrev()
    notePageRightRef.value?.startEditing()
  } else if (!isTypingNow && event.key === 'ArrowRight') {
    event.preventDefault()
    handlePageNext()
  } else if (!isTypingNow && event.key === 'ArrowLeft') {
    event.preventDefault()
    handlePagePrev()
  } else if (!isTypingNow && event.key === 'Enter' && openedNotebook.value?.pdf) {
    event.preventDefault()
    notePageRightRef.value?.startEditing()
  } else if (isTypingNow && event.key === 'Escape' && openedNotebook.value?.pdf) {
    event.preventDefault()
    notePageRightRef.value?.stopEditing()
  }
}

onMounted(async () => {
  let fileName = props.fileName
  let subject = props.subject
  let pdfFileName = props.pdfFileName

  if (!fileName && !subject) {
    const sessionData = loadNotebookFromSession()
    if (sessionData) {
      fileName = sessionData.fileName
      subject = sessionData.subject
      pdfFileName = sessionData.pdfFileName
    }
  }

  if (fileName && subject) {
    try {
      const notebook = await loadNotebook(fileName, subject)
      handleOpenNotebook(notebook)
    } catch (error) {
      console.error('Error loading notebook:', error)
      clearNotebookSession()
    }
  } else if (subject && pdfFileName) {
    const newNotebook: Notebook = {
      name: pdfFileName,
      subject: subject || 'General',
      date: new Date().toISOString(),
      num_notebook_pages: 100,
      pages: [],
      last_page: 1,
    }
    handleOpenNotebook(newNotebook)
  } else if (subject) {
    const newNotebook: Notebook = {
      name: subject + ' notes',
      subject: subject,
      date: new Date().toISOString(),
      num_notebook_pages: 100,
      pages: [],
      last_page: 1,
    }
    handleOpenNotebook(newNotebook)
  }
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <AppHeader
    ref="headerRef"
    @open-notebook="handleOpenNotebook"
    @close-notebook="handleCloseNotebook"
    @navigate-to-page="handleNavigateToPage"
    :variant="'tools'"
    :currentNotebook="openedNotebook"
    :currentNotebookPage="currentNotebookPage"
  />
  <MainStructure>
    <template #left>
      <PdfPage
        v-if="openedNotebook?.pdf"
        :notebook="openedNotebook"
        :currentPage="currentPdfPage"
        @page-next="handlePageNext"
        @page-prev="handlePagePrev"
        @page-goto="handlePageGoto"
      />
      <NotePage
        ref="notePageLeftRef"
        v-else-if="openedNotebook && !openedNotebook.pdf"
        :notebook="openedNotebook"
        :currentPage="currentNotebookPage"
      />
      <div
        v-else
        class="h-full flex-1 w-full rounded-tl-[10px] rounded-bl-[10px] flex flex-col items-center justify-center gap-4 p-8"
      >
        <img src="../assets/pdf.svg" class="w-24 h-24 opacity-30" alt="" />
        <h2 class="text-2xl font-bold text-gray-400">No PDF opened</h2>
        <p class="text-gray-500 text-center max-w-md">
          Open a notebook with PDF from the header options to view slides
        </p>
      </div>
    </template>
    <template #right>
      <NotePage
        ref="notePageRightRef"
        v-if="openedNotebook?.pdf"
        :notebook="openedNotebook"
        :currentPage="currentNotebookPage"
      />
      <NotePage
        ref="notePageRightRef"
        v-else-if="openedNotebook && !openedNotebook.pdf"
        :notebook="openedNotebook"
        :currentPage="currentNotebookPage + 1"
      />
      <div
        v-else
        class="h-full flex-1 w-full rounded-tr-[10px] rounded-br-[10px] flex flex-col items-center justify-center gap-4 p-8"
      >
        <img src="../assets/notes.svg" class="w-24 h-24 opacity-30" alt="" />
        <h2 class="text-2xl font-bold text-gray-400">No notebook opened</h2>
        <p class="text-gray-500 text-center max-w-md">
          Create a new notebook or open an existing one to start taking notes
        </p>
      </div>
    </template>
  </MainStructure>
</template>
