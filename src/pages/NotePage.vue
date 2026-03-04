<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import type { Notebook } from '../types/notebook'
import SmartTextArea from '../components/SmartTextArea.vue'

interface Props {
  notebook?: Notebook | null
  currentPage?: number
}

const props = withDefaults(defineProps<Props>(), {
  notebook: null,
  currentPage: 0,
})

const noteContent = ref<string>('')
const smartTextAreaRef = ref<InstanceType<typeof SmartTextArea> | null>(null)

const currentPageData = computed(() => {
  if (props.notebook?.pages) {
    return props.notebook.pages.find((p) => p.page_number === props.currentPage)
  }
  return null
})

const saveNote = () => {
  if (props.notebook && props.notebook.pages) {
    const pageIndex = props.notebook.pages.findIndex((p) => p.page_number === props.currentPage)
    if (pageIndex !== -1) {
      const page = props.notebook.pages[pageIndex]
      if (page) page.note_content = noteContent.value
    } else if (noteContent.value.trim()) {
      props.notebook.pages.push({
        page_number: props.currentPage,
        slide_number: props.currentPage,
        note_content: noteContent.value,
        text_boxes: [],
        highlights: [],
      })
    }
  }
}

watch(
  () => props.currentPage,
  () => {
    noteContent.value = currentPageData.value?.note_content || ''
    smartTextAreaRef.value?.clearErrors()
  },
)

watch(
  () => props.notebook,
  () => {
    noteContent.value = currentPageData.value?.note_content || ''
  },
)

watch(noteContent, saveNote)

const startEditing = () => smartTextAreaRef.value?.startEditing()
const stopEditing = () => smartTextAreaRef.value?.stopEditing()

defineExpose({ startEditing, stopEditing })

onMounted(() => {
  noteContent.value = currentPageData.value?.note_content || ''
})
</script>

<template>
  <div
    class="h-full flex-1 w-full relative rounded-tl-none rounded-tr-[10px] rounded-br-[10px] rounded-bl-none bg-gray-100 overflow-hidden shrink-0 flex flex-col items-center py-[1.875rem] px-[1.25rem] box-border gap-[0.625rem] text-center text-[1.25rem] text-darkslategray font-inter"
  >
    <div class="self-stretch overflow-hidden flex items-center py-[0rem] px-[0.625rem]">
      <div class="overflow-hidden flex items-center justify-center gap-[0.312rem]">
        <img src="../assets/notes.svg" class="w-[1rem] relative max-h-full" alt="" />
        <b class="relative">Notes for page {{ props.currentPage }}</b>
        <div class="h-[1.125rem] w-[0.313rem] relative overflow-hidden shrink-0" />
      </div>
    </div>
    <SmartTextArea ref="smartTextAreaRef" v-model="noteContent" />
  </div>
</template>
