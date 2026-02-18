<script setup lang="ts">
interface Props {
  text?: string
  variant?: 'default' | 'delete'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  text: 'Modify',
  variant: 'default',
  disabled: false,
})

const emit = defineEmits(['click'])

const handleClick = (event: any) => {
  if (!props.disabled) {
    emit('click', event)
  }
}
</script>

<template>
  <button
    ref="buttonRef"
    type="button"
    class="px-4 py-3 rounded-lg inline-flex justify-center items-center gap-2 overflow-hidden ease-in-out delay-75 transition-all duration-200"
    :class="{
      'bg-darkslateblue-100 text-white focus:ring-indigo-500 hover:-translate-y-1 hover:scale-110 active:scale-95':
        variant === 'default' && !disabled,
      'bg-orangered-200 text-white focus:ring-red-500 hover:-translate-y-1 hover:scale-110 active:scale-95':
        variant === 'delete' && !disabled,
      'bg-gray-300 text-gray-500 cursor-not-allowed': disabled,
    }"
    :disabled="disabled"
    :text="text"
    :variant="variant"
    @click="handleClick"
  >
    {{ text }}
  </button>
</template>
