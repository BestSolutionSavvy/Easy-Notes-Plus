<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { loadNotebooks, deleteNotebook, getNotebookFileName } from '../lib/notebookUtils'
import loadIcon from '../assets/load.svg'
import trashIcon from '../assets/trash.svg'
import ListElement from '../components/ListElement.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import type { Notebook } from '../types/notebook'

const router = useRouter()

const notebooks = ref<Notebook[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const showDeleteModal = ref(false)
const showErrorModal = ref(false)
const modalMessage = ref('')
const modalTitle = ref('')
const notebookToDelete = ref<Notebook | null>(null)

const subjects = computed(() => {
  const uniqueSubjects = new Set<string>()
  notebooks.value.forEach((notebook) => {
    uniqueSubjects.add(notebook.subject)
  })
  return Array.from(uniqueSubjects)
})

const notebooksPerSubject = computed(() => {
  const map: Record<string, Notebook[]> = {}
  subjects.value.forEach((subject) => {
    map[subject] = notebooks.value
      .filter((notebook) => notebook.subject === subject)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  })
  return map
})

const emit = defineEmits<{
  (e: 'select-notebook', notebook: Notebook): void
}>()

// Loads the list of notebooks from local filesystem
const handleLoadNotebooks = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const loadedNotebooks = await loadNotebooks()
    notebooks.value = Array.isArray(loadedNotebooks) ? loadedNotebooks : []
  } catch (error: any) {
    notebooks.value = []
    errorMessage.value = error.message || 'Failed to load notebooks'
    console.error('Error loading notebooks:', error)
  } finally {
    isLoading.value = false
  }
}

// Navigates to the home page with the selected notebook loaded
const onLoadNotebook = (subject: string, notebook?: Notebook) => {
  router.push({
    name: 'Home',
    query: {
      subject,
      fileName: notebook ? getNotebookFileName(notebook) : undefined,
    },
  })
}

// Emits the selected notebook to the parent component
const onSelectNotebook = (notebook: Notebook) => {
  emit('select-notebook', notebook)
}

// Shows the delete confirmation modal for the selected notebook
const handleDeleteNotebook = async (notebook: Notebook) => {
  notebookToDelete.value = notebook
  showDeleteModal.value = true
}

// Confirms the deletion of the selected notebook
const onConfirmDeleteNotebook = async () => {
  showDeleteModal.value = false
  const notebook = notebookToDelete.value
  if (!notebook || !notebook.subject) return
  try {
    const fileName = getNotebookFileName(notebook)
    await deleteNotebook(fileName, notebook.subject)
    notebooks.value = notebooks.value.filter((n) => getNotebookFileName(n) !== fileName)
  } catch (error: any) {
    modalTitle.value = 'Delete Error'
    modalMessage.value = error.message || 'Failed to delete notebook'
    showErrorModal.value = true
    console.error('Error deleting notebook:', error)
  } finally {
    notebookToDelete.value = null
  }
}

// Cancels the deletion of the selected notebook
const onCancelDelete = () => {
  showDeleteModal.value = false
  notebookToDelete.value = null
}

// Closes the error modal
const onCloseErrorModal = () => {
  showErrorModal.value = false
  modalMessage.value = ''
  modalTitle.value = ''
}

onMounted(() => {
  handleLoadNotebooks()
})
</script>

<template>
  <div
    class="h-full flex-1 w-full relative overflow-hidden shrink-0 flex flex-col items-start text-left text-[1rem] text-darkslateblue font-inter"
  >
    <div
      class="self-stretch flex-1 rounded-tl-none rounded-tr-num-8 rounded-br-num-8 rounded-bl-none bg-white overflow-hidden flex flex-col items-center justify-center p-[0.625rem] gap-[1.875rem]"
    >
      <div v-if="isLoading" class="flex flex-col items-center justify-center gap-4">
        <div
          class="animate-spin rounded-full h-12 w-12 border-4 border-gainsboro-200 border-t-darkslateblue-100"
        ></div>
        <div class="text-gray-500">Loading notebooks...</div>
      </div>
      <div v-else-if="errorMessage" class="text-red-500">
        {{ errorMessage }}
      </div>
      <div
        v-else-if="notebooks.length === 0"
        class="animate-fade-in flex flex-col items-center justify-center gap-4 p-8 max-w-md"
      >
        <div class="text-6xl">📒</div>
        <div class="text-xl font-semibold text-gray-700">No notebooks yet</div>
        <div class="text-center text-gray-500 leading-relaxed">
          Create your first notebook by using the
          <RouterLink to="/" class="text-blue-500 hover:underline font-medium"
            >home screen</RouterLink
          >
          or starting from a PDF of a class!
        </div>
      </div>

      <ul v-else>
        <li
          v-for="subject in subjects"
          :key="subject"
          class="w-[31.25rem] overflow-hidden flex flex-col items-center p-[0.312rem] box-border gap-[0.625rem]"
        >
          <div class="animate-fade-in">
            <div
              class="self-stretch flex items-center gap-[0.625rem] text-[1.875rem] text-darkslategray"
            >
              <div class="relative font-semibold">{{ subject }}</div>
            </div>
            <div
              class="w-[30.063rem] h-[0.063rem] relative border-black border-solid border-t-[1px] box-border opacity-[0.5]"
            />
          </div>
          <ul class="w-full flex flex-col gap-[0.625rem]">
            <ListElement
              v-for="(notebook, index) in notebooksPerSubject[subject]"
              :key="notebook.name"
              :title="notebook.name"
              :date="notebook.date"
              :index="index"
              :gradient="'[background:linear-gradient(90deg,_#fff0ca,_#fff8e6_65.38%,_#fffcf5)]'"
              @click="onSelectNotebook(notebook)"
              :buttons="[
                {
                  icon: loadIcon,
                  alt: 'Edit Notebook',
                  background: 'bg-orangered-100',
                  onClick: () => onLoadNotebook(subject, notebook),
                },
                {
                  icon: trashIcon,
                  alt: 'Delete Note',
                  background: 'bg-orangered-100',
                  onClick: () => handleDeleteNotebook(notebook),
                },
              ]"
            />
          </ul>
        </li>
      </ul>
    </div>
    <ConfirmModal
      :isOpen="showDeleteModal"
      title="Delete Notebook"
      :message="`Are you sure you want to delete &quot;${notebookToDelete?.name}&quot;? This action cannot be undone.`"
      confirmText="Delete"
      cancelText="Cancel"
      variant="delete"
      @confirm="onConfirmDeleteNotebook"
      @cancel="onCancelDelete"
    />
    <ConfirmModal
      :isOpen="showErrorModal"
      :title="modalTitle"
      :message="modalMessage"
      confirmText="OK"
      variant="default"
      @confirm="onCloseErrorModal"
      @cancel="onCloseErrorModal"
    />
  </div>
</template>
