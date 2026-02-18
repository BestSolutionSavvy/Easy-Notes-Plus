<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
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
const isEditingName = ref(false)
const editedNotebookName = ref('')
const router = useRouter()
const selectedSubject = ref('')
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

const toggleMenu = () => {
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
      const result = await saveNotebookUtil(props.currentNotebook, fileName)
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

const startEditingName = () => {
  if (props.currentNotebook) {
    editedNotebookName.value = props.currentNotebook.name
    isEditingName.value = true
  }
}

const saveNotebookName = () => {
  if (props.currentNotebook && editedNotebookName.value.trim()) {
    props.currentNotebook.name = editedNotebookName.value.trim()
  }
  isEditingName.value = false
}

const cancelEditingName = () => {
  isEditingName.value = false
  editedNotebookName.value = ''
}

const toggleSave = () => {
  if (!isSaving.value) {
    saveButtonRef.value?.openOverlay()
  }
}

const createSimpleNotebook = async () => {
  if (selectedSubject.value) {
    createSimpleNotebookRef.value?.closeOverlay()
    await router.replace({
      path: '/',
      query: { subject: selectedSubject.value },
    })
    router.go(0)
    selectedSubject.value = ''
  }
}

const emit = defineEmits<{
  (e: 'open-notebook', notebook: Notebook): void
  (e: 'close-notebook'): void
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
          src="../assets/menuIcon.svg"
          class="w-6 h-5 cursor-pointer menu-icon transition-transform duration-300 hover:scale-125"
          :class="{ 'rotate-180': isMenuOpen }"
          @click="toggleMenu"
        />
        <h1 class="text-white text-[1.563rem] font-semibold font-['Inter'] px-2">Easy Notes</h1>
      </div>

      <div
        v-if="variant === 'tools' && props.currentNotebook"
        class="flex-1 animate-fade-in overflow-hidden flex items-center justify-center text-[1rem] gap-3"
      >
        <div class="flex items-center max-w-[500px]">
          <div
            v-if="!isEditingName"
            @click="startEditingName"
            class="animate-fade-in h-[1.875rem] rounded-[5px] bg-gray-100 overflow-hidden flex items-center justify-center py-[0rem] px-[0.625rem] box-border gap-[0.625rem] cursor-pointer hover:bg-gray-200 transition-all max-w-full"
          >
            <span class="font-medium truncate">{{ props.currentNotebook.name }}</span>
            <svg
              class="w-4 h-4 text-gray-500 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              ></path>
            </svg>
          </div>
          <div v-else class="flex items-center gap-2">
            <input
              v-model="editedNotebookName"
              @keydown.enter="saveNotebookName"
              @keydown.esc="cancelEditingName"
              @blur="saveNotebookName"
              type="text"
              class="h-[1.875rem] px-[0.625rem] rounded-[5px] bg-gray-100 border-blue-400 border-solid border-2 focus:outline-none focus:border-blue-500 font-medium min-w-[250px] max-w-[450px]"
              autofocus
            />
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
              Sei sicuro di voler chiudere il notebook? Le modifiche non salvate andranno perse.
            </p>
            <button
              @click="
                () => {
                  $emit('close-notebook')
                  closeButtonRef?.closeOverlay()
                }
              "
              class="px-3 py-1.5 text-sm bg-gray-800 text-white rounded hover:bg-gray-700 active:bg-gray-900 transition-colors duration-150"
            >
              Chiudi Notebook
            </button>
          </div>
        </HeaderButton>
      </div>
    </header>
  </div>
</template>
