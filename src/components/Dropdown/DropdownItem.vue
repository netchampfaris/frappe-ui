<template>
  <button :disabled="disabled" :class="[cssClasses.itemButton, backgroundClass]">
    <span v-if="$slots.prefix" :class="[cssClasses.itemIcon, iconColor]">
      <slot name="prefix" />
    </span>
    <div v-else-if="hasIcon" :class="cssClasses.itemIconPlaceholder" />

    <span :class="[cssClasses.itemLabel, textColor]">
      <slot />
    </span>

    <span v-if="$slots.suffix" class="ml-auto flex-shrink-0">
      <slot name="suffix" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    theme?: 'gray' | 'red'
    disabled?: boolean
    hasIcon?: boolean
  }>(),
  {
    theme: 'gray',
    disabled: false,
    hasIcon: false,
  },
)

const iconColor = computed(() => {
  if (props.disabled) return 'text-ink-gray-4'
  return props.theme === 'red' ? 'text-ink-red-3' : 'text-ink-gray-6'
})

const textColor = computed(() => {
  if (props.disabled) return 'text-ink-gray-4'
  return props.theme === 'red' ? 'text-ink-red-3' : 'text-ink-gray-7'
})

const backgroundClass = computed(() => {
  return props.theme === 'red'
    ? 'focus:bg-surface-red-3 data-[highlighted]:bg-surface-red-3 data-[state=open]:bg-surface-red-3'
    : 'focus:bg-surface-gray-3 data-[highlighted]:bg-surface-gray-3 data-[state=open]:bg-surface-gray-3'
})

const cssClasses = {
  itemLabel: 'whitespace-nowrap',
  itemIcon: 'mr-2 h-4 w-4 flex-shrink-0',
  itemIconPlaceholder: 'mr-2 h-4 w-4 flex-shrink-0',
  itemButton: 'group flex h-7 w-full items-center rounded px-2 text-base focus:outline-none',
}
</script>
