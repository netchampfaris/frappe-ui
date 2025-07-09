import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { NodeView, ViewMutationRecord, EditorView } from '@tiptap/pm/view'
import { createApp, type App } from 'vue'
import { TableView, updateColumns } from './TableView.js'
import TableContextMenu from './TableContextMenu.vue'

export class EnhancedTableView extends TableView implements NodeView {
  node: ProseMirrorNode
  cellMinWidth: number
  dom: HTMLDivElement
  table: HTMLTableElement
  colgroup: HTMLTableColElement
  contentDOM: HTMLTableSectionElement
  view: EditorView
  contextMenuApp: App | null = null
  contextMenuVisible = false

  constructor(node: ProseMirrorNode, cellMinWidth: number, view: EditorView) {
    super(node, cellMinWidth)
    this.view = view
    this.setupContextMenu()
  }

  private setupContextMenu() {
    // Add right-click event listeners to cells
    this.table.addEventListener(
      'contextmenu',
      this.handleContextMenu.bind(this),
    )
    this.table.addEventListener('click', this.handleCellClick.bind(this))
  }

  private handleContextMenu(event: MouseEvent) {
    event.preventDefault()
    const cell = this.findCell(event.target as Element)
    if (cell) {
      this.showContextMenu(event.clientX, event.clientY, cell)
    }
  }

  private handleCellClick(event: MouseEvent) {
    // Show a small button on cell hover/click that can trigger context menu
    const cell = this.findCell(event.target as Element)
    if (cell && event.detail === 1) {
      // Single click
      this.addCellButton(cell, event)
    }
  }

  private findCell(target: Element): HTMLTableCellElement | null {
    let element = target
    while (element && element !== this.table) {
      if (element.tagName === 'TD' || element.tagName === 'TH') {
        return element as HTMLTableCellElement
      }
      element = element.parentElement!
    }
    return null
  }

  private addCellButton(cell: HTMLTableCellElement, event: MouseEvent) {
    // Remove any existing buttons
    this.removeCellButtons()

    const button = document.createElement('button')
    button.className =
      'table-cell-context-button absolute top-1 right-1 w-6 h-6 bg-surface-white border border-outline-gray-2 rounded shadow-sm hover:bg-surface-gray-1 flex items-center justify-center z-10'
    button.innerHTML = `
      <svg class="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="8" cy="2" r="1.5"/>
        <circle cx="8" cy="8" r="1.5"/>
        <circle cx="8" cy="14" r="1.5"/>
      </svg>
    `

    button.addEventListener('click', (e) => {
      e.stopPropagation()
      const rect = button.getBoundingClientRect()
      this.showContextMenu(rect.right, rect.top, cell)
    })

    // Position relative to cell
    cell.style.position = 'relative'
    cell.appendChild(button)

    // Auto-remove button after a delay
    setTimeout(() => {
      this.removeCellButtons()
    }, 3000)
  }

  private removeCellButtons() {
    const buttons = this.table.querySelectorAll('.table-cell-context-button')
    buttons.forEach((button) => button.remove())
  }

  private showContextMenu(x: number, y: number, cell: HTMLTableCellElement) {
    this.hideContextMenu()

    // Create a container for the context menu
    const container = document.createElement('div')
    document.body.appendChild(container)

    this.contextMenuApp = createApp(TableContextMenu, {
      visible: true,
      position: { x, y },
      onClose: () => {
        this.hideContextMenu()
      },
      onAction: (actionKey: string) => {
        this.handleAction(actionKey, cell)
      },
    })

    this.contextMenuApp.mount(container)
    this.contextMenuVisible = true
  }

  private hideContextMenu() {
    if (this.contextMenuApp) {
      this.contextMenuApp.unmount()
      // Remove the container from DOM
      const containers = document.querySelectorAll('div[data-v-app]')
      containers.forEach((container) => {
        if (!container.innerHTML.trim()) {
          container.remove()
        }
      })
      this.contextMenuApp = null
      this.contextMenuVisible = false
    }
  }

  private handleAction(actionKey: string, cell: HTMLTableCellElement) {
    const { state, dispatch } = this.view
    const pos = this.view.posAtDOM(cell, 0)

    switch (actionKey) {
      case 'insert-above':
        this.view.dispatch(
          state.tr.setSelection(
            state.selection.constructor.create(state.doc, pos),
          ),
        )
        // Use the editor commands
        setTimeout(() => {
          const commands = (this.view as any).editor?.commands
          if (commands?.addRowBefore) {
            commands.addRowBefore()
          }
        }, 0)
        break

      case 'insert-below':
        this.view.dispatch(
          state.tr.setSelection(
            state.selection.constructor.create(state.doc, pos),
          ),
        )
        setTimeout(() => {
          const commands = (this.view as any).editor?.commands
          if (commands?.addRowAfter) {
            commands.addRowAfter()
          }
        }, 0)
        break

      case 'delete':
        this.view.dispatch(
          state.tr.setSelection(
            state.selection.constructor.create(state.doc, pos),
          ),
        )
        setTimeout(() => {
          const commands = (this.view as any).editor?.commands
          if (commands?.deleteRow) {
            commands.deleteRow()
          }
        }, 0)
        break

      case 'toggle-header':
        this.view.dispatch(
          state.tr.setSelection(
            state.selection.constructor.create(state.doc, pos),
          ),
        )
        setTimeout(() => {
          const commands = (this.view as any).editor?.commands
          if (commands?.toggleHeaderRow) {
            commands.toggleHeaderRow()
          }
        }, 0)
        break

      case 'duplicate':
        // Custom duplicate logic
        this.duplicateRow(cell)
        break

      case 'clear-contents':
        this.clearRowContents(cell)
        break

      case 'color':
        // Handle color change
        this.showColorPicker(cell)
        break

      default:
        console.log('Unhandled action:', actionKey)
    }
  }

  private duplicateRow(cell: HTMLTableCellElement) {
    // Find the row containing this cell
    const row = cell.closest('tr')
    if (row) {
      // First add a new row
      const { state } = this.view
      const pos = this.view.posAtDOM(cell, 0)
      this.view.dispatch(
        state.tr.setSelection(
          state.selection.constructor.create(state.doc, pos),
        ),
      )

      setTimeout(() => {
        const commands = (this.view as any).editor?.commands
        if (commands?.addRowAfter) {
          commands.addRowAfter()
          // TODO: Copy content from original row to new row
        }
      }, 0)
    }
  }

  private clearRowContents(cell: HTMLTableCellElement) {
    const row = cell.closest('tr')
    if (row) {
      const cells = row.querySelectorAll('td, th')
      cells.forEach((cell) => {
        const pos = this.view.posAtDOM(cell, 0)
        if (pos !== -1) {
          // Clear cell content
          const node = this.view.state.doc.nodeAt(pos)
          if (node) {
            const tr = this.view.state.tr.deleteRange(pos, pos + node.nodeSize)
            this.view.dispatch(tr)
          }
        }
      })
    }
  }

  private showColorPicker(cell: HTMLTableCellElement) {
    // TODO: Implement color picker
    console.log('Show color picker for cell:', cell)
  }

  update(node: ProseMirrorNode) {
    if (node.type !== this.node.type) {
      return false
    }

    this.node = node
    updateColumns(node, this.colgroup, this.table, this.cellMinWidth)

    return true
  }

  ignoreMutation(mutation: ViewMutationRecord) {
    return (
      mutation.type === 'attributes' &&
      (mutation.target === this.table ||
        this.colgroup.contains(mutation.target) ||
        (mutation.target as Element).classList?.contains(
          'table-cell-context-button',
        ))
    )
  }

  destroy() {
    this.hideContextMenu()
    this.removeCellButtons()
  }
}
