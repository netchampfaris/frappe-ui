<template>
  <div
    v-if="visible"
    class="table-context-menu fixed z-50 min-w-48 rounded-lg border border-outline-gray-2 bg-surface-white py-2 shadow-lg"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @click.stop
  >
    <div class="px-3 py-2">
      <input
        type="text"
        placeholder="Search actions..."
        class="w-full rounded border border-outline-gray-2 px-3 py-1 text-sm"
        v-model="searchQuery"
        ref="searchInput"
      />
    </div>

    <div
      class="text-xs font-medium px-3 py-1 text-ink-gray-6 uppercase tracking-wide"
    >
      Table row
    </div>

    <div
      class="flex items-center justify-between px-3 py-2 hover:bg-surface-gray-1 cursor-pointer"
      @click="toggleHeader"
    >
      <div class="flex items-center space-x-2">
        <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="3" width="12" height="2" />
          <rect x="2" y="6" width="12" height="2" />
          <rect x="2" y="9" width="12" height="2" />
        </svg>
        <span class="text-sm">Header row</span>
      </div>
      <div class="flex items-center">
        <div class="w-8 h-4 bg-blue-500 rounded-full p-1">
          <div class="w-2 h-2 bg-white rounded-full ml-auto"></div>
        </div>
      </div>
    </div>

    <button
      v-for="action in filteredActions"
      :key="action.key"
      class="w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-surface-gray-1 text-sm"
      :class="{ 'text-ink-gray-4': action.disabled }"
      :disabled="action.disabled"
      @click="executeAction(action)"
    >
      <component :is="action.icon" class="w-4 h-4" />
      <span>{{ action.label }}</span>
      <span v-if="action.shortcut" class="ml-auto text-xs text-ink-gray-4">{{
        action.shortcut
      }}</span>
    </button>

    <div
      class="text-xs text-ink-gray-4 px-3 py-2 border-t border-outline-gray-2 mt-1"
    >
      Last edited by {{ lastEditor }}<br />
      {{ lastEditTime }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount, h } from 'vue'

// Icons using h() function
const ColorIcon = () =>
  h('svg', { class: 'w-4 h-4', viewBox: '0 0 16 16', fill: 'currentColor' }, [
    h('circle', {
      cx: '8',
      cy: '8',
      r: '6',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
    }),
  ])

const ArrowUpIcon = () =>
  h('svg', { class: 'w-4 h-4', viewBox: '0 0 16 16', fill: 'currentColor' }, [
    h('path', { d: 'M8 3l-4 4h3v6h2V7h3l-4-4z' }),
  ])

const ArrowDownIcon = () =>
  h('svg', { class: 'w-4 h-4', viewBox: '0 0 16 16', fill: 'currentColor' }, [
    h('path', { d: 'M8 13l4-4h-3V3H7v6H4l4 4z' }),
  ])

const CopyIcon = () =>
  h('svg', { class: 'w-4 h-4', viewBox: '0 0 16 16', fill: 'currentColor' }, [
    h('rect', {
      x: '2',
      y: '2',
      width: '8',
      height: '8',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
    }),
    h('rect', {
      x: '6',
      y: '6',
      width: '8',
      height: '8',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
    }),
  ])

const ClearIcon = () =>
  h('svg', { class: 'w-4 h-4', viewBox: '0 0 16 16', fill: 'currentColor' }, [
    h('path', {
      d: 'M8 1l-7 7 7 7 7-7-7-7zM10.5 10.5L8 8l-2.5 2.5L4 9l2.5-2.5L4 4l1.5-1.5L8 5l2.5-2.5L12 4l-2.5 2.5L12 9l-1.5 1.5z',
    }),
  ])

const DeleteIcon = () =>
  h('svg', { class: 'w-4 h-4', viewBox: '0 0 16 16', fill: 'currentColor' }, [
    h('path', {
      d: 'M3 6v8a1 1 0 001 1h8a1 1 0 001-1V6M5 6V4a1 1 0 011-1h4a1 1 0 011 1v2M7 9v4M9 9v4',
    }),
  ])

interface TableAction {
  key: string
  label: string
  icon: any
  action: () => void
  disabled?: boolean
  shortcut?: string
}

interface Props {
  visible: boolean
  position: { x: number; y: number }
  lastEditor?: string
  lastEditTime?: string
}

const props = withDefaults(defineProps<Props>(), {
  lastEditor: 'Faris Ansari',
  lastEditTime: 'Today at 8:39 PM',
})

const emit = defineEmits<{ close: []; action: [actionKey: string] }>()

const searchQuery = ref('')
const searchInput = ref<HTMLInputElement>()

const actions = computed<TableAction[]>(() => [
  {
    key: 'color',
    label: 'Color',
    icon: ColorIcon,
    action: () => {
      emit('action', 'color')
      emit('close')
    },
  },
  {
    key: 'insert-above',
    label: 'Insert Above',
    icon: ArrowUpIcon,
    action: () => {
      emit('action', 'insert-above')
      emit('close')
    },
  },
  {
    key: 'insert-below',
    label: 'Insert Below',
    icon: ArrowDownIcon,
    action: () => {
      emit('action', 'insert-below')
      emit('close')
    },
  },
  {
    key: 'duplicate',
    label: 'Duplicate',
    icon: CopyIcon,
    action: () => {
      emit('action', 'duplicate')
      emit('close')
    },
    shortcut: '⌘D',
  },
  {
    key: 'clear-contents',
    label: 'Clear Contents',
    icon: ClearIcon,
    action: () => {
      emit('action', 'clear-contents')
      emit('close')
    },
  },
  {
    key: 'delete',
    label: 'Delete',
    icon: DeleteIcon,
    action: () => {
      emit('action', 'delete')
      emit('close')
    },
    shortcut: 'Del',
  },
])

const filteredActions = computed(() => {
  if (!searchQuery.value) return actions.value

  return actions.value.filter((action) =>
    action.label.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

const executeAction = (action: TableAction) => {
  if (!action.disabled) {
    action.action()
  }
}

const toggleHeader = () => {
  emit('action', 'toggle-header')
  emit('close')
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Element
  if (!target.closest('.table-context-menu')) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  nextTick(() => {
    searchInput.value?.focus()
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.table-context-menu {
  min-width: 200px;
  animation: fadeIn 0.1s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
