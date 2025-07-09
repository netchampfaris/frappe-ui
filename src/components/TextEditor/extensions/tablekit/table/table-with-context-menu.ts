import { Table } from './table.js'
import { EnhancedTableView } from './EnhancedTableView.js'

export const TableWithContextMenu = Table.extend({
  name: 'tableWithContextMenu',

  addOptions() {
    return { ...this.parent?.(), View: EnhancedTableView }
  },

  addStorage() {
    return { contextMenuVisible: false, selectedCell: null }
  },

  addCommands() {
    return {
      ...this.parent?.(),
      showTableContextMenu:
        () =>
        ({ commands }) => {
          // Custom command to show context menu
          return true
        },
      hideTableContextMenu:
        () =>
        ({ commands }) => {
          // Custom command to hide context menu
          return true
        },
    }
  },

  onDestroy() {
    // Clean up any context menus when the extension is destroyed
    const contextMenus = document.querySelectorAll('.table-context-menu')
    contextMenus.forEach((menu) => menu.remove())
  },
})
