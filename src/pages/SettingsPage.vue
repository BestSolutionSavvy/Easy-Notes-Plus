<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SimpleButton from '../components/SimpleButton.vue'

const rootFolder = ref<string>('')
const isLoading = ref(false)
const theme = ref<string>('light')

// Load current root folder on mount
onMounted(async () => {
  try {
    const folder = await window.api.getNotebooksFolder()
    rootFolder.value = folder || 'Not configured'
  } catch (error) {
    console.error('Error loading root folder:', error)
    rootFolder.value = 'Error loading folder'
  }

  // Load theme preference
  const savedTheme = localStorage.getItem('theme') || 'light'
  theme.value = savedTheme
  applyTheme(savedTheme)
})

// Change root folder
const handleChangeFolder = async () => {
  try {
    isLoading.value = true
    const result = await window.api.selectNotebooksFolder()
    if (result.success && result.path) {
      rootFolder.value = result.path
    }
  } catch (error) {
    console.error('Error changing folder:', error)
  } finally {
    isLoading.value = false
  }
}

// Apply theme
const applyTheme = (selectedTheme: string) => {
  const body = document.body
  if (selectedTheme === 'dark') {
    body.style.filter = 'grayscale(1) invert(1) sepia(1) contrast(75%)'
    body.style.overflow = 'hidden'
  } else {
    body.style.filter = ''
    body.style.overflow = ''
  }
}

// Change theme
const handleThemeChange = () => {
  const newTheme = theme.value === 'light' ? 'dark' : 'light'
  theme.value = newTheme
  localStorage.setItem('theme', newTheme)
  applyTheme(newTheme)
}
</script>

<template>
  <div
    class="animate-fade-in self-stretch h-full px-5 bg-white rounded-tr-[10px] rounded-br-[10px] flex flex-col justify-center items-center overflow-hidden"
  >
    <div class="flex flex-col justify-center items-center gap-6 max-w-2xl">
      <div class="text-zinc-700 text-[3rem] font-semibold mb-1">Settings</div>
      <div class="w-full flex flex-col gap-4 p-6 bg-gray-50 rounded-lg">
        <div class="text-xl font-semibold text-gray-800">Notebooks Root Folder</div>
        <div class="flex items-center gap-4">
          <div
            class="flex-1 px-4 py-3 bg-white rounded-md border border-gray-300 text-gray-700 font-mono text-sm break-all"
          >
            {{ rootFolder }}
          </div>
          <SimpleButton
            text="Change Folder"
            variant="default"
            @click="handleChangeFolder"
            :disabled="isLoading"
          />
        </div>
      </div>

      <!-- Theme Section -->
      <div class="w-full flex flex-col gap-4 p-6 bg-gray-50 rounded-lg">
        <div class="text-xl font-semibold text-gray-800">Theme</div>
        <div class="flex items-center gap-4">
          <span class="text-base text-gray-700">☀️</span>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              :checked="theme === 'dark'"
              @change="handleThemeChange"
              class="sr-only peer"
            />
            <div
              class="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-darkslateblue-100"
            ></div>
          </label>
          <span class="text-base text-gray-700">🌙</span>
        </div>
      </div>

      <div class="w-full flex flex-col gap-3 p-6 bg-blue-50 rounded-lg border border-blue-200">
        <div class="text-lg font-semibold text-blue-800">🛈 About Easy Notes</div>
        <div class="text-sm text-blue-700">
          <p class="mb-2">Easy Notes organizes your study materials as follows:</p>
          <ul class="list-disc list-inside space-y-1 ml-2">
            <li>The root folder contains subject folders (e.g., Math, Physics)</li>
            <li>Each subject can have PDFs and notebooks in any subfolder structure</li>
            <li>PDF and notebook files with the same name are automatically linked</li>
            <li>File names must be unique within each subject</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
