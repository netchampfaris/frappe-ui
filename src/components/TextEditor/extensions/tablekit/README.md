# Table Context Menu Extension

This extension adds contextual buttons and menus to table cells for performing
row and column actions.

## Features

- **Context Menu**: Right-click on any table cell to open a context menu with
  actions
- **Cell Buttons**: Click on a cell to show a contextual button that opens the
  menu
- **Search**: Search through available actions in the context menu
- **Header Toggle**: Quick toggle for header rows with visual indicator
- **Row Actions**: Insert above/below, duplicate, delete rows
- **Content Actions**: Clear cell contents, color customization

## Usage

### Basic Integration

```typescript
import { TableKit } from './extensions/tablekit'
import './extensions/tablekit/table/table-context-menu.css'

// In your editor configuration
const editor = new Editor({
  extensions: [
    TableKit.configure({
      // Enable context menu by using the enhanced table view
      View: EnhancedTableView,
    }),
  ],
})
```

### Vue Component Integration

```vue
<template>
  <TextEditor
    :content="content"
    @change="handleChange"
    :extensions="[tableKitWithContextMenu]"
  />
</template>

<script setup>
import { TableKit } from '@/components/TextEditor/extensions/tablekit'
import '@/components/TextEditor/extensions/tablekit/table/table-context-menu.css'

const tableKitWithContextMenu = TableKit.configure({
  // Context menu will be automatically enabled
})
</script>
```

## Context Menu Actions

### Available Actions

1. **Header row** - Toggle header row on/off
2. **Color** - Change cell/row colors (customizable)
3. **Insert Above** - Add a new row above current row
4. **Insert Below** - Add a new row below current row
5. **Duplicate** - Duplicate the current row
6. **Clear Contents** - Clear all content in the row
7. **Delete** - Delete the current row

### Keyboard Shortcuts

- `⌘D` (Mac) / `Ctrl+D` (Windows) - Duplicate row
- `Del` - Delete row
- Right-click - Open context menu

## Customization

### Adding Custom Actions

You can extend the context menu with custom actions:

```typescript
// In TableContextMenu.vue, add to the actions array:
{
  key: 'custom-action',
  label: 'Custom Action',
  icon: CustomIcon,
  action: () => {
    // Your custom logic here
    emit('action', 'custom-action')
    emit('close')
  },
  shortcut: '⌘K'
}
```

### Styling

The context menu uses CSS classes that can be customized:

- `.table-context-menu` - Main menu container
- `.table-cell-context-button` - Cell button that triggers menu
- `.context-menu-search` - Search input area
- `.header-row-toggle` - Header row toggle element

### Dark Mode

Dark mode is automatically supported when using `[data-theme='dark']` on your
document.

## Browser Compatibility

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Dependencies

- Vue 3.0+
- TipTap editor
- ProseMirror tables extension

## Notes

- The context menu automatically positions itself to stay within viewport bounds
- Cell buttons appear on hover and auto-hide after 3 seconds
- Context menu closes when clicking outside or pressing Escape
- All table commands are properly integrated with the editor's undo/redo system
