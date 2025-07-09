<template>
  <div v-if="shouldShow" ref="menuRef" class="table-control-menu">
    <div class="menu-section">
      <span class="menu-label">Columns</span>
      <div class="menu-buttons">
        <button
          @click="addColumnBefore"
          class="menu-btn"
          title="Add column before"
        >
          <LucideChevronLeft class="w-4 h-4" />
        </button>
        <button
          @click="addColumnAfter"
          class="menu-btn"
          title="Add column after"
        >
          <LucideChevronRight class="w-4 h-4" />
        </button>
        <button
          @click="deleteColumn"
          class="menu-btn danger"
          title="Delete column"
        >
          <LucideTrash2 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="menu-divider"></div>

    <div class="menu-section">
      <span class="menu-label">Rows</span>
      <div class="menu-buttons">
        <button @click="addRowBefore" class="menu-btn" title="Add row before">
          <LucideChevronUp class="w-4 h-4" />
        </button>
        <button @click="addRowAfter" class="menu-btn" title="Add row after">
          <LucideChevronDown class="w-4 h-4" />
        </button>
        <button @click="deleteRow" class="menu-btn danger" title="Delete row">
          <LucideTrash2 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="menu-divider"></div>

    <div class="menu-section">
      <span class="menu-label">Headers</span>
      <div class="menu-buttons">
        <button
          @click="toggleHeaderRow"
          class="menu-btn"
          :class="{ active: hasHeaderRow }"
          title="Toggle header row"
        >
          <LucideTable class="w-4 h-4" />
        </button>
        <button
          @click="toggleHeaderColumn"
          class="menu-btn"
          :class="{ active: hasHeaderColumn }"
          title="Toggle header column"
        >
          <LucideColumns3 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="menu-divider"></div>

    <div class="menu-section">
      <span class="menu-label">Table</span>
      <div class="menu-buttons">
        <button
          @click="deleteTable"
          class="menu-btn danger"
          title="Delete table"
        >
          <LucideX class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { Editor } from '@tiptap/core'

// Lucide icons
import LucideChevronLeft from '~icons/lucide/chevron-left'
import LucideChevronRight from '~icons/lucide/chevron-right'
import LucideChevronUp from '~icons/lucide/chevron-up'
import LucideChevronDown from '~icons/lucide/chevron-down'
import LucideTrash2 from '~icons/lucide/trash-2'
import LucideTable from '~icons/lucide/table'
import LucideColumns3 from '~icons/lucide/columns-3'
import LucideX from '~icons/lucide/x'

interface Props {
  shouldShow?: boolean
}

const props = withDefaults(defineProps<Props>(), { shouldShow: false })

const editor = inject<Editor>('editor')
const menuRef = ref<HTMLDivElement>()

// Check if table has header row/column
const hasHeaderRow = computed(() => {
  if (!editor) return false
  // Logic to detect if current table has header row
  // This would need to be implemented based on the current selection
  return false
})

const hasHeaderColumn = computed(() => {
  if (!editor) return false
  // Logic to detect if current table has header column
  return false
})

// Table operation commands
const addColumnBefore = () => {
  editor?.commands.addColumnBefore()
}

const addColumnAfter = () => {
  editor?.commands.addColumnAfter()
}

const deleteColumn = () => {
  editor?.commands.deleteColumn()
}

const addRowBefore = () => {
  editor?.commands.addRowBefore()
}

const addRowAfter = () => {
  editor?.commands.addRowAfter()
}

const deleteRow = () => {
  editor?.commands.deleteRow()
}

const toggleHeaderRow = () => {
  editor?.commands.toggleHeaderRow()
}

const toggleHeaderColumn = () => {
  editor?.commands.toggleHeaderColumn()
}

const deleteTable = () => {
  editor?.commands.deleteTable()
}
</script>

<style scoped>
.table-control-menu {
  @apply absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3;
  @apply flex flex-wrap gap-3 min-w-max;
  pointer-events: auto;
}

.menu-section {
  @apply flex flex-col gap-2;
}

.menu-label {
  @apply text-xs font-medium text-gray-600 uppercase tracking-wide;
}

.menu-buttons {
  @apply flex gap-1;
}

.menu-btn {
  @apply flex items-center justify-center w-8 h-8 rounded-md;
  @apply border border-gray-200 bg-white text-gray-700;
  @apply hover:bg-gray-50 hover:border-gray-300;
  @apply transition-colors duration-150;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1;
}

.menu-btn.active {
  @apply bg-blue-50 border-blue-200 text-blue-700;
}

.menu-btn.danger {
  @apply text-red-600 hover:bg-red-50 hover:border-red-200;
}

.menu-divider {
  @apply w-px bg-gray-200 self-stretch;
}

@media (max-width: 768px) {
  .table-control-menu {
    @apply p-2 gap-2;
  }

  .menu-btn {
    @apply w-7 h-7;
  }
}
</style>
