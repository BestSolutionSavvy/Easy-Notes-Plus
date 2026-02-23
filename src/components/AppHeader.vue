<script setup lang="ts">
import { onMounted, ref, toRaw } from 'vue'
import Menu from '../pages/Menu.vue'
import HeaderButton from './HeaderButton.vue'
import ShortcutsList from './ShortcutsList.vue'
import openNotebookIcon from '../assets/open-notebook.svg'
import createSimpleNotebookIcon from '../assets/new-notebook.svg'
import saveIcon from '../assets/save.svg'
import closeIcon from '../assets/close.svg'
import shortcutIcon from '../assets/shortcut.svg'
import type { Notebook } from '../types/notebook'
import {
  loadNotebooks,
  saveNotebook as saveNotebookUtil,
  getNotebookFileName,
} from '../lib/notebookUtils'

const isMenuOpen = ref(false)
const notebooks = ref<Notebook[]>([])
const isSaving = ref(false)
const saveSuccess = ref(false)
const newNotebookName = ref('')
const newNotebookSubject = ref('')
const searchQuery = ref('')
const searchResults = ref<number[]>([])
const currentSearchIndex = ref(0)
const openNotebookButtonRef = ref<InstanceType<typeof HeaderButton> | null>(null)
const createSimpleNotebookRef = ref<InstanceType<typeof HeaderButton> | null>(null)
const saveButtonRef = ref<InstanceType<typeof HeaderButton> | null>(null)
const closeButtonRef = ref<InstanceType<typeof HeaderButton> | null>(null)

interface Props {
  variant?: 'default' | 'tools'
  currentNotebook?: Notebook | null
  currentNotebookPage?: number
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  currentNotebook: null,
  currentNotebookPage: 0,
})

const toggleMenu = async () => {
  if (props.variant === 'tools' && props.currentNotebook && !isMenuOpen.value) {
    await saveNotebook()
  }
  isMenuOpen.value = !isMenuOpen.value
}

// Saves the current notebook to local filesystem
const saveNotebook = async () => {
  if (props.currentNotebook && !isSaving.value) {
    isSaving.value = true
    saveSuccess.value = false
    props.currentNotebook.date = new Date().toISOString()
    props.currentNotebook.last_page = props.currentNotebookPage

    try {
      const fileName = getNotebookFileName(props.currentNotebook)
      const plainNotebook = toRaw(props.currentNotebook)
      const result = await saveNotebookUtil(plainNotebook, fileName)
      if (result.success) {
        saveSuccess.value = true
        setTimeout(() => {
          saveSuccess.value = false
          saveButtonRef.value?.closeOverlay()
        }, 2000)
      } else {
        console.error('Error saving notebook')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      isSaving.value = false
    }
  }
}

const toggleSave = () => {
  if (!isSaving.value) {
    saveButtonRef.value?.openOverlay()
  }
}

const createSimpleNotebook = async () => {
  if (newNotebookSubject.value.trim() && newNotebookName.value.trim()) {
    createSimpleNotebookRef.value?.closeOverlay()
    const newNotebook: Notebook = {
      name: newNotebookName.value.trim(),
      subject: newNotebookSubject.value.trim(),
      date: new Date().toISOString(),
      num_notebook_pages: 100,
      pages: [],
      last_page: 1,
    }
    newNotebookName.value = ''
    newNotebookSubject.value = ''
    emit('open-notebook', newNotebook)
  }
}

// Search functionality
const performSearch = () => {
  if (!props.currentNotebook || !searchQuery.value.trim()) {
    searchResults.value = []
    currentSearchIndex.value = 0
    return
  }
  const query = searchQuery.value.toLowerCase()
  const results: number[] = []
  props.currentNotebook.pages.forEach((page) => {
    if (page.note_content && page.note_content.toLowerCase().includes(query)) {
      results.push(page.page_number)
    }
  })
  searchResults.value = results
  currentSearchIndex.value = 0
  if (results.length > 0 && results[0] !== undefined) {
    emit('navigate-to-page', results[0])
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
  currentSearchIndex.value = 0
}

const nextResult = () => {
  if (searchResults.value.length === 0) return
  currentSearchIndex.value = (currentSearchIndex.value + 1) % searchResults.value.length
  const page = searchResults.value[currentSearchIndex.value]
  if (page !== undefined) {
    emit('navigate-to-page', page)
  }
}

const previousResult = () => {
  if (searchResults.value.length === 0) return
  currentSearchIndex.value =
    (currentSearchIndex.value - 1 + searchResults.value.length) % searchResults.value.length
  const page = searchResults.value[currentSearchIndex.value]
  if (page !== undefined) {
    emit('navigate-to-page', page)
  }
}

const emit = defineEmits<{
  (e: 'open-notebook', notebook: Notebook): void
  (e: 'close-notebook'): void
  (e: 'navigate-to-page', page: number): void
}>()

defineExpose({
  toggleSave,
})

onMounted(async () => {
  try {
    notebooks.value = await loadNotebooks()
  } catch (error) {
    console.error('Error loading notebooks:', error)
    notebooks.value = []
  }
})
</script>

<template>
  <div>
    <div v-if="isMenuOpen" class="fixed inset-0 z-40" @click="isMenuOpen = false"></div>

    <Transition name="slide">
      <div
        v-if="isMenuOpen"
        class="fixed w-80 bg-white shadow-xl z-50 overflow-hidden rounded-xl"
        style="top: 5rem; left: 10px; height: calc(100vh - 5.6rem)"
      >
        <Menu @close-menu="isMenuOpen = false" />
      </div>
    </Transition>

    <header
      class="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-300 rounded-[10px] flex items-center overflow-hidden"
    >
      <div class="flex-1 flex items-center justify-start gap-2">
        <img
          src="../assets/menu.svg"
          class="w-6 h-5 cursor-pointer menu-icon transition-transform duration-300 hover:scale-125"
          :class="{ 'rotate-180': isMenuOpen }"
          @click="toggleMenu"
        />
        <h1 class="text-white text-[1.563rem] font-semibold font-['Inter'] px-2">Easy Notes</h1>
      </div>

      <div
        v-if="variant === 'tools' && props.currentNotebook"
        class="flex-1 flex items-center justify-center px-4 animate-fade-in"
      >
        <div class="relative max-w-md w-full">
          <input
            v-model="searchQuery"
            @keydown.enter="performSearch"
            @input="performSearch"
            type="text"
            placeholder="Search in notes..."
            class="w-full pl-10 pr-20 py-1 text-sm bg-white/90 backdrop-blur-sm border border-white/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent placeholder-gray-500"
          />
          <svg
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            ></path>
          </svg>
          <div
            v-if="searchQuery"
            class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1"
          >
            <span v-if="searchResults.length > 0" class="text-xs text-gray-600 mr-1">
              {{ currentSearchIndex + 1 }}/{{ searchResults.length }}
            </span>
            <button
              v-if="searchResults.length > 0"
              @click="previousResult"
              class="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Previous"
            >
              <svg
                class="w-3 h-3 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                ></path>
              </svg>
            </button>
            <button
              v-if="searchResults.length > 0"
              @click="nextResult"
              class="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Next"
            >
              <svg
                class="w-3 h-3 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                ></path>
              </svg>
            </button>
            <button
              @click="clearSearch"
              class="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Clear"
            >
              <svg
                class="w-3 h-3 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="flex-1 flex items-center justify-end gap-2">
        <HeaderButton
          ref="openNotebookButtonRef"
          v-if="variant === 'tools'"
          :text="'Open Notebook'"
          :direction="'left'"
          :icon="openNotebookIcon"
        >
          <div class="max-h-96 overflow-y-auto">
            <div
              v-for="notebook in notebooks"
              :key="getNotebookFileName(notebook)"
              class="p-2 hover:bg-gainsboro-100 rounded-md cursor-pointer"
              @click="
                () => {
                  $emit('open-notebook', notebook)
                  openNotebookButtonRef?.closeOverlay()
                }
              "
            >
              <div class="font-medium text-darkslateblue">
                {{ notebook.name }}
              </div>
              <div class="text-sm text-gray-500">{{ notebook.subject }}</div>
            </div>
          </div>
        </HeaderButton>
        <HeaderButton
          ref="createSimpleNotebookRef"
          v-if="variant === 'tools' && !currentNotebook"
          :text="'Create Notebook'"
          :direction="'left'"
          :icon="createSimpleNotebookIcon"
        >
          <div class="flex flex-col gap-3 p-3 min-w-[16rem]">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-medium text-gray-600">Notebook Name</label>
              <input
                v-model="newNotebookName"
                @keydown.enter="createSimpleNotebook"
                type="text"
                placeholder="My Notebook"
                class="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-medium text-gray-600">Subject/Folder</label>
              <input
                v-model="newNotebookSubject"
                @keydown.enter="createSimpleNotebook"
                type="text"
                placeholder="General"
                class="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              @click="createSimpleNotebook"
              :disabled="!newNotebookName.trim() || !newNotebookSubject.trim()"
              class="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-150"
            >
              Create Notebook
            </button>
          </div>
        </HeaderButton>
        <HeaderButton
          v-if="variant === 'tools' && props.currentNotebook"
          :icon="shortcutIcon"
          :direction="'left'"
        >
          <ShortcutsList />
        </HeaderButton>
        <HeaderButton
          ref="saveButtonRef"
          v-if="variant === 'tools' && props.currentNotebook"
          :text="'Save'"
          :icon="saveIcon"
          @open-overlay="saveNotebook"
        >
          <div class="flex flex-col items-center justify-center p-4 min-w-[8rem]">
            <div v-if="isSaving" class="flex flex-col items-center gap-2">
              <div
                class="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"
              ></div>
              <span class="text-sm text-gray-600">Salvataggio...</span>
            </div>

            <div v-else-if="saveSuccess" class="flex flex-col items-center gap-2 animate-fade-in">
              <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <svg
                  class="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="3"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
              <span class="text-sm text-green-600 font-medium">Salvato!</span>
            </div>
          </div>
        </HeaderButton>
        <HeaderButton
          ref="closeButtonRef"
          v-if="variant === 'tools' && props.currentNotebook"
          :text="'Close'"
          :icon="closeIcon"
          :direction="'left'"
        >
          <div class="flex flex-col gap-3 p-3 min-w-[14rem] max-w-sm">
            <p class="text-xs text-gray-600">
              Are you sure you want to close the notebook? All unsaved changes will be lost.
            </p>
            <button
              @click="
                () => {
                  $emit('close-notebook')
                  closeButtonRef?.closeOverlay()
                }
              "
              class="px-3 py-1.5 text-sm bg-gray-800 text-white rounded cursor-pointer hover:bg-gray-700 active:bg-gray-900 transition-colors duration-150"
            >
              Close Notebook
            </button>
          </div>
        </HeaderButton>
      </div>
    </header>
  </div>
</template>
