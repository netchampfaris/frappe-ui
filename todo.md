# Frappe UI Migration TODO

This document outlines the remaining tasks for migrating the Frappe UI component library to TypeScript and organizing components into individual folders.

## Current Status

- **Total Vue Components**: 125 (excluding stories)
- **Components in TypeScript**: 106
- **Components still in JavaScript**: 19
- **Components already in folders**: 17 folders
- **Components still flat**: 52 files

## 📦 Component Migration Tasks

### Components in Flat Structure (Need Complete Migration)

- [x] **Alert.vue** - ✅ Complete
  - [x] Create `Alert/` folder
  - [x] Move `Alert.vue` to folder
  - [x] Create `Alert/types.ts` with `AlertProps` interface
  - [x] Create `Alert/index.ts` with component and type exports
  - [x] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [x] Update component props to use TypeScript interfaces
  - [x] Ensure `Alert.story.vue` exists or create it

- [ ] **Autocomplete.vue**
  - [ ] Create `Autocomplete/` folder
  - [ ] Move `Autocomplete.vue` to folder
  - [ ] Create `Autocomplete/types.ts` with `AutocompleteProps` interface
  - [ ] Create `Autocomplete/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Ensure `Autocomplete.story.vue` exists or create it

- [x] **Avatar.vue** - ✅ Complete
  - [x] Create `Avatar/` folder
  - [x] Move `Avatar.vue` to folder
  - [x] Create `Avatar/types.ts` with `AvatarProps` interface
  - [x] Create `Avatar/index.ts` with component and type exports
  - [x] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [x] Update component props to use TypeScript interfaces
  - [x] Ensure `Avatar.story.vue` exists or create it

- [x] **Badge.vue** - ✅ Complete
  - [x] Create `Badge/` folder
  - [x] Move `Badge.vue` to folder
  - [x] Create `Badge/types.ts` with `BadgeProps` interface
  - [x] Create `Badge/index.ts` with component and type exports
  - [x] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [x] Update component props to use TypeScript interfaces
  - [x] Ensure `Badge.story.vue` exists or create it

- [x] **Breadcrumbs.vue** - ✅ Complete
  - [x] Create `Breadcrumbs/` folder
  - [x] Move `Breadcrumbs.vue` to folder
  - [x] Create `Breadcrumbs/types.ts` with `BreadcrumbsProps` interface
  - [x] Create `Breadcrumbs/index.ts` with component and type exports
  - [x] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [x] Update component props to use TypeScript interfaces
  - [x] Ensure `Breadcrumbs.story.vue` exists or create it

- [x] **Checkbox.vue** - ✅ Complete
  - [x] Create `Checkbox/` folder
  - [x] Move `Checkbox.vue` to folder
  - [x] Create `Checkbox/types.ts` with `CheckboxProps` interface
  - [x] Create `Checkbox/index.ts` with component and type exports
  - [x] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [x] Update component props to use TypeScript interfaces
  - [x] Ensure `Checkbox.story.vue` exists or create it

- [ ] **CircularProgressBar.vue**
  - [ ] Create `CircularProgressBar/` folder
  - [ ] Move `CircularProgressBar.vue` to folder
  - [ ] Create `CircularProgressBar/types.ts` with `CircularProgressBarProps` interface
  - [ ] Create `CircularProgressBar/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Ensure `CircularProgressBar.story.vue` exists or create it

- [ ] **ConfirmDialog.vue**
  - [ ] Create `ConfirmDialog/` folder
  - [ ] Move `ConfirmDialog.vue` to folder
  - [ ] Create `ConfirmDialog/types.ts` with `ConfirmDialogProps` interface
  - [ ] Create `ConfirmDialog/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Create `ConfirmDialog.story.vue`

- [x] **Dialog.vue** - ✅ Complete
  - [x] Create `Dialog/` folder
  - [x] Move `Dialog.vue` to folder
  - [x] Create `Dialog/types.ts` with `DialogProps` interface
  - [x] Create `Dialog/index.ts` with component and type exports
  - [x] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [x] Update component props to use TypeScript interfaces
  - [x] Ensure `Dialog.story.vue` exists or create it

- [ ] **Dialogs.vue**
  - [ ] Create `Dialogs/` folder
  - [ ] Move `Dialogs.vue` to folder
  - [ ] Create `Dialogs/types.ts` with `DialogsProps` interface
  - [ ] Create `Dialogs/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Create `Dialogs.story.vue`

- [ ] **Divider.vue**
  - [ ] Create `Divider/` folder
  - [ ] Move `Divider.vue` to folder
  - [ ] Create `Divider/types.ts` with `DividerProps` interface
  - [ ] Create `Divider/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Create `Divider.story.vue`

- [ ] **Dropdown.vue**
  - [ ] Create `Dropdown/` folder
  - [ ] Move `Dropdown.vue` to folder
  - [ ] Create `Dropdown/types.ts` with `DropdownProps` interface
  - [ ] Create `Dropdown/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Ensure `Dropdown.story.vue` exists or create it

- [ ] **ErrorMessage.vue**
  - [ ] Create `ErrorMessage/` folder
  - [ ] Move `ErrorMessage.vue` to folder
  - [ ] Create `ErrorMessage/types.ts` with `ErrorMessageProps` interface
  - [ ] Create `ErrorMessage/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Ensure `ErrorMessage.story.vue` exists or create it

- [ ] **FileUploader.vue**
  - [ ] Create `FileUploader/` folder
  - [ ] Move `FileUploader.vue` to folder
  - [ ] Create `FileUploader/types.ts` with `FileUploaderProps` interface
  - [ ] Create `FileUploader/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Ensure `FileUploader.story.vue` exists or create it

- [ ] **FormControl.vue**
  - [ ] Create `FormControl/` folder
  - [ ] Move `FormControl.vue` to folder
  - [ ] Create `FormControl/types.ts` with `FormControlProps` interface
  - [ ] Create `FormControl/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Ensure `FormControl.story.vue` exists or create it

- [ ] **FormLabel.vue**
  - [ ] Create `FormLabel/` folder
  - [ ] Move `FormLabel.vue` to folder
  - [ ] Create `FormLabel/types.ts` with `FormLabelProps` interface
  - [ ] Create `FormLabel/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Create `FormLabel.story.vue`

- [ ] **GreenCheckIcon.vue**
  - [ ] Create `GreenCheckIcon/` folder
  - [ ] Move `GreenCheckIcon.vue` to folder
  - [ ] Create `GreenCheckIcon/types.ts` with `GreenCheckIconProps` interface
  - [ ] Create `GreenCheckIcon/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Create `GreenCheckIcon.story.vue`

- [ ] **LoadingIndicator.vue**
  - [ ] Create `LoadingIndicator/` folder
  - [ ] Move `LoadingIndicator.vue` to folder
  - [ ] Create `LoadingIndicator/types.ts` with `LoadingIndicatorProps` interface
  - [ ] Create `LoadingIndicator/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Create `LoadingIndicator.story.vue`

- [ ] **LoadingText.vue**
  - [ ] Create `LoadingText/` folder
  - [ ] Move `LoadingText.vue` to folder
  - [ ] Create `LoadingText/types.ts` with `LoadingTextProps` interface
  - [ ] Create `LoadingText/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Create `LoadingText.story.vue`

- [ ] **Popover.vue**
  - [ ] Create `Popover/` folder
  - [ ] Move `Popover.vue` to folder
  - [ ] Create `Popover/types.ts` with `PopoverProps` interface
  - [ ] Create `Popover/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Ensure `Popover.story.vue` exists or create it

- [ ] **Progress.vue**
  - [ ] Create `Progress/` folder
  - [ ] Move `Progress.vue` to folder
  - [ ] Create `Progress/types.ts` with `ProgressProps` interface
  - [ ] Create `Progress/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Ensure `Progress.story.vue` exists or create it

- [ ] **Resource.vue**
  - [ ] Create `Resource/` folder
  - [ ] Move `Resource.vue` to folder
  - [ ] Create `Resource/types.ts` with `ResourceProps` interface
  - [ ] Create `Resource/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Create `Resource.story.vue`

- [ ] **Select.vue**
  - [ ] Create `Select/` folder
  - [ ] Move `Select.vue` to folder
  - [ ] Create `Select/types.ts` with `SelectProps` interface
  - [ ] Create `Select/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Ensure `Select.story.vue` exists or create it

- [ ] **Spinner.vue**
  - [ ] Create `Spinner/` folder
  - [ ] Move `Spinner.vue` to folder
  - [ ] Create `Spinner/types.ts` with `SpinnerProps` interface
  - [ ] Create `Spinner/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Ensure `Spinner.story.vue` exists or create it

- [ ] **Switch.vue**
  - [ ] Create `Switch/` folder
  - [ ] Move `Switch.vue` to folder
  - [ ] Create `Switch/types.ts` with `SwitchProps` interface
  - [ ] Create `Switch/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Ensure `Switch.story.vue` exists or create it

- [ ] **TabButtons.vue**
  - [ ] Create `TabButtons/` folder
  - [ ] Move `TabButtons.vue` to folder
  - [ ] Create `TabButtons/types.ts` with `TabButtonsProps` interface
  - [ ] Create `TabButtons/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Ensure `TabButtons.story.vue` exists or create it

- [ ] **TextInput.vue**
  - [ ] Create `TextInput/` folder
  - [ ] Move `TextInput.vue` to folder
  - [ ] Move `types/TextInput.ts` to `TextInput/types.ts` and rename to `TextInputProps`
  - [ ] Create `TextInput/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Ensure `TextInput.story.vue` exists or create it

- [ ] **Textarea.vue**
  - [ ] Create `Textarea/` folder
  - [ ] Move `Textarea.vue` to folder
  - [ ] Create `Textarea/types.ts` with `TextareaProps` interface
  - [ ] Create `Textarea/index.ts` with component and type exports
  - [ ] Migrate component to TypeScript (`<script setup lang="ts">`)
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Ensure `Textarea.story.vue` exists or create it

### Components in Folders (Need TypeScript Migration Only)

- [ ] **TextEditor/MentionList.vue**
  - [ ] Migrate to TypeScript (`<script setup lang="ts">`)
  - [ ] Create `TextEditor/types.ts` if not exists, add `MentionListProps`
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Update exports in `TextEditor/index.ts`

- [ ] **TextEditor/TextEditorBubbleMenu.vue**
  - [ ] Migrate to TypeScript (`<script setup lang="ts">`)
  - [ ] Add `TextEditorBubbleMenuProps` to `TextEditor/types.ts`
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Update exports in `TextEditor/index.ts`

- [ ] **TextEditor/TextEditorFloatingMenu.vue**
  - [ ] Migrate to TypeScript (`<script setup lang="ts">`)
  - [ ] Add `TextEditorFloatingMenuProps` to `TextEditor/types.ts`
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Update exports in `TextEditor/index.ts`

- [ ] **TextEditor/TextEditorFixedMenu.vue**
  - [ ] Migrate to TypeScript (`<script setup lang="ts">`)
  - [ ] Add `TextEditorFixedMenuProps` to `TextEditor/types.ts`
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Update exports in `TextEditor/index.ts`

- [ ] **TextEditor/FontColor.vue**
  - [ ] Migrate to TypeScript (`<script setup lang="ts">`)
  - [ ] Add `FontColorProps` to `TextEditor/types.ts`
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Update exports in `TextEditor/index.ts`

- [ ] **TextEditor/InsertVideo.vue**
  - [ ] Migrate to TypeScript (`<script setup lang="ts">`)
  - [ ] Add `InsertVideoProps` to `TextEditor/types.ts`
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Update exports in `TextEditor/index.ts`

- [ ] **TextEditor/CodeBlockComponent.vue**
  - [ ] Migrate to TypeScript (`<script setup lang="ts">`)
  - [ ] Add `CodeBlockComponentProps` to `TextEditor/types.ts`
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Update exports in `TextEditor/index.ts`

- [ ] **TextEditor/Menu.vue**
  - [ ] Migrate to TypeScript (`<script setup lang="ts">`)
  - [ ] Add `MenuProps` to `TextEditor/types.ts`
  - [ ] Update component props to use TypeScript interfaces
  - [ ] Update exports in `TextEditor/index.ts`

### Components Already Migrated (Review Only)

- [x] **Alert/** - ✅ Complete
- [x] **Button/** - ✅ Complete
- [x] **Charts/** - ✅ Complete
- [x] **Calendar/** - ✅ Complete
- [x] **DatePicker/** - ✅ Complete
- [x] **ListView/** - ✅ Complete
- [x] **Toast/** - ✅ Complete
- [x] **Tooltip/** - ✅ Complete
- [x] **Tabs/** - ✅ Complete
- [x] **Rating/** - ✅ Complete
- [x] **Tree/** - ✅ Complete
- [x] **Combobox/** - ✅ Complete

### Folders Needing Structure Review

- [ ] **Provider/** - Review if structure is optimal
- [ ] **CommandPalette/** - Review if structure is optimal
- [ ] **ListFilter/** - Review if all related components are included

### Deprecated Components (Skip Migration)

- ~~**Input.vue**~~ - **DEPRECATED** (replaced by TextInput)
- ~~**FeatherIcon.vue**~~ - **DEPRECATED** (replaced by Lucide icons)
- ~~**Card.vue**~~ - **DEPRECATED**
- ~~**Link.vue**~~ - **DEPRECATED** (use router-link or Button variant)
- ~~**ListItem.vue**~~ - **DEPRECATED** (not used anywhere)

## 🔧 JavaScript/TypeScript Utilities Migration

### JavaScript Files to Convert to TypeScript

- [ ] **Calendar/calendarUtils.js → calendarUtils.ts**
  - [ ] Convert to TypeScript
  - [ ] Add proper type annotations
  - [ ] Export types if needed
  - [ ] Update imports in components

- [ ] **Calendar/composables/useCalendarData.js → useCalendarData.ts**
  - [ ] Convert to TypeScript
  - [ ] Add proper return type annotations
  - [ ] Add parameter type annotations
  - [ ] Update imports in components

- [ ] **Calendar/composables/useEventModal.js → useEventModal.ts**
  - [ ] Convert to TypeScript
  - [ ] Add proper return type annotations
  - [ ] Add parameter type annotations
  - [ ] Update imports in components

- [ ] **TextEditor/index.js → index.ts**
  - [ ] Convert to TypeScript
  - [ ] Add proper type exports
  - [ ] Update component imports

- [ ] **TextEditor/mention.js → mention.ts**
  - [ ] Convert to TypeScript
  - [ ] Add proper type annotations
  - [ ] Update imports in components

- [ ] **TextEditor/commands.js → commands.ts**
  - [ ] Convert to TypeScript
  - [ ] Add proper type annotations
  - [ ] Update imports in components

- [ ] **TextEditor/utils.js → utils.ts**
  - [ ] Convert to TypeScript
  - [ ] Add proper type annotations
  - [ ] Update imports in components

- [ ] **ListView/utils.js → utils.ts**
  - [ ] Convert to TypeScript
  - [ ] Add proper type annotations
  - [ ] Update imports in components

### TypeScript Type Safety Improvements

- [ ] Review existing TypeScript components for type safety improvements
- [ ] Add proper prop types for all components
- [ ] Ensure all emit events are properly typed
- [ ] Add generic types where appropriate
- [ ] Review and fix any `any` types

## 📋 Implementation Strategy

### Phase 1: Component Folder Structure (Priority 1)
1. Move components to individual folders with proper structure:
   - `ComponentName/ComponentName.vue` - Main component file
   - `ComponentName/types.ts` - Component props and type definitions
   - `ComponentName/index.ts` - Export component and types
   - `ComponentName/ComponentName.story.vue` - Storybook stories (if exists or create)

### Phase 2: TypeScript Migration (After Folder Structure)
1. Convert component files from `.vue` to TypeScript:
   - Add proper `<script setup lang="ts">`
   - Define component props with TypeScript interfaces
   - Move prop types to `types.ts` file in component folder
   - Ensure proper type safety for emits and slots
2. Convert JavaScript utility files to TypeScript
3. Update component exports in `index.ts` files

### Phase 3: Type Organization & Structure
1. Create `ComponentNameProps` interface and other types in each `types.ts` file
2. Export component and types from `index.ts`:
   ```typescript
   export { default as ComponentName } from './ComponentName.vue'
   export type { ComponentNameProps } from './types'
   ```
3. Update main library exports to use folder-based imports
4. Ensure consistent naming conventions across all components

### Phase 4: Polish & Documentation
1. Add missing story files for components without them
2. Review and improve TypeScript types for consistency
3. Update documentation with new folder structure
4. Add comprehensive tests following the new structure

## 🎯 Success Criteria

- [ ] All components are organized in individual folders with consistent structure
- [ ] Each component folder contains:
  - [ ] Main component file (`ComponentName.vue`)
  - [ ] Types file (`types.ts`) with `ComponentNameProps` interface
  - [ ] Index file (`index.ts`) exporting component and types
  - [ ] Story file (`ComponentName.story.vue`) for Storybook
- [ ] All components are migrated to TypeScript with proper type safety
- [ ] Component props are properly typed using interfaces in `types.ts`
- [ ] All imports/exports work correctly with new folder structure
- [ ] Build process works without errors
- [ ] All existing functionality is preserved
- [ ] Main library index properly exports all components and types
- [ ] Documentation reflects new folder-first approach

## 📝 Notes

### Migration Approach
- **Folder-First Strategy**: Move components to folders before TypeScript migration to reduce complexity
- **Consistent Structure**: Each component folder follows the same pattern (component, types, index, story)
- **Type Organization**: Keep component-specific types in `types.ts` within each component folder
- **Export Pattern**: Always export both component and types from `index.ts` for clean imports

### Implementation Guidelines
- Prioritize components used most frequently first
- Maintain backward compatibility during migration
- Test thoroughly after each component migration
- Consider creating migration scripts for repetitive folder creation tasks
- Keep detailed commit history for rollback if needed
- Ensure all story files are created or moved properly
- Update main library exports incrementally

---

**Last Updated**: 2025-05-28
**Total Components**: 125
**Progress**: ~15% TypeScript, ~30% Folder Structure
