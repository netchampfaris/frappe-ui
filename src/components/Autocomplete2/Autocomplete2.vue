<script setup lang="ts">
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxViewport,
} from 'reka-ui'
import { Button } from '../Button'
import { ref, computed, watch } from 'vue'
import LucideChevronDown from '~icons/lucide/chevron-down'
import LucideCheck from '~icons/lucide/check'
import LucideX from '~icons/lucide/x'
import LucideSearch from '~icons/lucide/search'

// Define prop types
type Option = {
  label?: string
  name?: string
  value?: OptionValue
  description?: string
  [key: string]: any
}

type OptionValue = string | number | boolean

type AutocompleteOption = OptionValue | Option

type AutocompleteOptionGroup = {
  group?: string
  name?: string
  items?: AutocompleteOption[]
  children?: AutocompleteOption[]
  hideLabel?: boolean
}

type AutocompleteOptions = AutocompleteOption[] | AutocompleteOptionGroup[]

type AutocompleteProps = {
  options?: AutocompleteOptions
  hideSearch?: boolean
  placeholder?: string
} & (
  | {
      multiple: true
      modelValue?: AutocompleteOption[] | null
    }
  | {
      multiple?: false
      modelValue?: AutocompleteOption | null
    }
)

// Define props
const props = withDefaults(defineProps<AutocompleteProps>(), {
  multiple: false,
  hideSearch: false,
  placeholder: 'Select...',
  options: () => [],
})

const emit = defineEmits(['update:modelValue', 'update:query', 'change'])

// State
const query = ref('')
const open = ref(false)
const internalValue = ref<Option[] | Option | null>(props.multiple ? [] : null)

// Transform options to standard format
const normalizeOptions = (inputOptions: AutocompleteOptions) => {
  if (!inputOptions?.length) return []

  let groups = []

  if (isOptionGroup(inputOptions[0])) {
    // Handle grouped options
    for (const group of inputOptions as AutocompleteOptionGroup[]) {
      const items = group.items || group.children || []
      groups.push({
        name: group.name || group.group || '',
        children: items.map(normalizeOption),
      })
    }
  } else {
    // Handle flat options list
    groups.push({
      name: '',
      children: (inputOptions as AutocompleteOption[]).map(normalizeOption),
    })
  }

  return groups
}

// Convert any option to standardized format
const normalizeOption = (option: AutocompleteOption): Option => {
  if (typeof option !== 'object' || option === null) {
    return {
      name: String(option),
      label: String(option),
      value: option,
    }
  }
  return {
    name: option.name || option.label || String(option.value),
    label: option.label || option.name || String(option.value),
    value:
      option.value !== undefined ? option.value : option.name || option.label,
    ...option,
  }
}

// Check if option is a group
const isOptionGroup = (option: any): boolean => {
  return (
    typeof option === 'object' &&
    option !== null &&
    (('items' in option && 'group' in option) ||
      ('children' in option && 'name' in option))
  )
}

// Process options based on query
const filteredOptions = computed(() => {
  const normalized = normalizeOptions(props.options)

  if (!query.value) return normalized

  return normalized
    .map((group) => ({
      ...group,
      children: (group.children || []).filter(
        (option) =>
          option.name.toLowerCase().includes(query.value.toLowerCase()) ||
          (option.label &&
            option.label.toLowerCase().includes(query.value.toLowerCase())) ||
          (option.value &&
            String(option.value)
              .toLowerCase()
              .includes(query.value.toLowerCase())),
      ),
    }))
    .filter((group) => (group.children || []).length > 0)
})

const allOptions = computed(() => {
  return filteredOptions.value.flatMap((group) => group.children || [])
})

// Handle model value bindings - fixed for multiple handling
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal === null || newVal === undefined) {
      internalValue.value = props.multiple ? [] : null
      return
    }

    if (props.multiple) {
      // Handle array of values for multiple selection
      const values = (newVal as AutocompleteOption[]) || []
      const normalized = values.map((val) => {
        // If it's already a normalized option, keep it
        if (
          typeof val === 'object' &&
          val !== null &&
          ('value' in val || 'label' in val || 'name' in val)
        ) {
          return normalizeOption(val)
        }

        // Try to find matching option in our options list
        const allOpts = allOptions.value
        const found = allOpts.find((opt) => opt.value === val)
        return found || normalizeOption(val)
      })
      internalValue.value = normalized
    } else {
      // Handle single value
      if (
        typeof newVal === 'object' &&
        newVal !== null &&
        ('value' in newVal || 'label' in newVal || 'name' in newVal)
      ) {
        internalValue.value = normalizeOption(newVal)
      } else {
        // Try to find matching option
        const found = allOptions.value.find((opt) => opt.value === newVal)
        internalValue.value = found || normalizeOption(newVal)
      }
    }
  },
  { immediate: true, deep: true },
)

// Display value for the input
const displayValue = computed(() => {
  if (!internalValue.value) return ''

  if (!props.multiple) {
    const selected = internalValue.value as Option
    return selected?.name || selected?.label || ''
  }

  return (internalValue.value as Option[])
    .map((v) => v.name || v.label || '')
    .join(', ')
})

// Check if option is selected - fixed for multiple mode
const isSelected = (option: Option) => {
  if (!internalValue.value) return false

  if (!props.multiple) {
    const selected = internalValue.value as Option
    return selected?.value === option.value
  }

  return (internalValue.value as Option[]).some((v) => v.value === option.value)
}

// Handle option selection - fixed for multiple mode
const handleSelect = (option: Option, e) => {
  if (props.multiple) {
    e.preventDefault()
    const currentValues = Array.isArray(internalValue.value)
      ? internalValue.value
      : []
    const isAlreadySelected = currentValues.some(
      (v) => v.value === option.value,
    )

    let newValues
    if (isAlreadySelected) {
      newValues = currentValues.filter((v) => v.value !== option.value)
    } else {
      newValues = [...currentValues, option]
    }

    internalValue.value = newValues
    emit('update:modelValue', newValues)
    emit('change', newValues)
  } else {
    internalValue.value = option
    emit('update:modelValue', option)
    emit('change', option)
    open.value = false
  }
}

const areAllOptionsSelected = computed(() => {
  if (
    !props.multiple ||
    !internalValue.value ||
    !Array.isArray(internalValue.value)
  )
    return false
  const selected = internalValue.value as Option[]
  return (
    allOptions.value.length > 0 &&
    allOptions.value.length === selected.length &&
    allOptions.value.every((opt) =>
      selected.some((sel) => sel.value === opt.value),
    )
  )
})

const selectAll = () => {
  if (props.multiple) {
    internalValue.value = [...allOptions.value]
    emit('update:modelValue', allOptions.value)
    emit('change', allOptions.value)
  }
}

const clearAll = () => {
  if (props.multiple) {
    internalValue.value = []
    emit('update:modelValue', [])
    emit('change', [])
  } else {
    internalValue.value = null
    emit('update:modelValue', null)
    emit('change', null)
  }
  query.value = ''
}

// Emit query updates
watch(
  () => query.value,
  (val) => {
    emit('update:query', val)
  },
)
</script>

<template>
  <ComboboxRoot class="relative w-full" v-model:open="open">
    <ComboboxAnchor>
      <ComboboxTrigger
        class="px-2 transition-colors py-1 h-7 gap-1 bg-surface-gray-2 hover:bg-surface-gray-3 text-ink-gray-8 flex w-full rounded border border-transparent items-center justify-between focus:border-outline-gray-4 focus:outline-none focus:ring-2 focus:ring-outline-gray-3"
      >
        <!-- Input prefix slot -->
        <div class="flex items-center">
          <div v-if="$slots.prefix" class="flex-shrink-0">
            <slot name="prefix" />
          </div>

          <!-- Display selected value(s) or placeholder -->
          <div class="flex-1 truncate text-base leading-5">
            <template v-if="displayValue">{{ displayValue }}</template>
            <template v-else>
              <span class="text-ink-gray-4">{{ placeholder }}</span>
            </template>
          </div>
        </div>

        <!-- Input suffix and trigger -->
        <div class="flex-shrink-0 flex items-center">
          <slot name="suffix" />
          <LucideChevronDown class="h-4 w-4 text-ink-gray-5" />
        </div>
      </ComboboxTrigger>
    </ComboboxAnchor>

    <ComboboxPortal>
      <ComboboxContent
        class="z-10 w-[var(--reka-combobox-trigger-width)] min-w-[160px] bg-surface-white overflow-hidden rounded-lg border-outline-gray-2 shadow-sm border mt-1"
        position="popper"
      >
        <!-- Search functionality -->
        <div
          v-if="!hideSearch"
          class="sticky top-0 z-10 flex items-stretch px-1.5 pt-1.5 pb-1 bg-surface-white"
        >
          <div class="relative w-full flex items-center">
            <div class="absolute left-2 flex items-center pointer-events-none">
              <LucideSearch class="h-4 w-4 text-ink-gray-5" />
            </div>
            <ComboboxInput
              class="pl-8 pr-7 form-input w-full focus:bg-surface-gray-3 hover:bg-surface-gray-4 text-ink-gray-8"
              placeholder="Search"
              :value="query"
              @input="(e) => (query = (e.target as HTMLInputElement).value)"
              autoComplete="off"
            />
            <button
              v-if="query"
              class="absolute right-2 h-4 w-4 flex items-center justify-center"
              @click="query = ''"
            >
              <LucideX class="h-3 w-3 text-ink-gray-5" />
            </button>
          </div>
        </div>

        <ComboboxViewport class="max-h-[15rem] overflow-y-auto p-1.5">
          <!-- No results message -->
          <ComboboxEmpty
            class="text-ink-gray-5 text-base font-medium text-center py-1.5"
          >
            No results found
          </ComboboxEmpty>

          <!-- Option groups -->
          <template
            v-for="(group, index) in filteredOptions"
            :key="group.name || index"
          >
            <ComboboxGroup v-if="(group.children || []).length > 0">
              <ComboboxSeparator
                v-if="index !== 0 && group.name"
                class="h-[1px] bg-surface-gray-2 my-1"
              />

              <ComboboxLabel
                v-if="group.name"
                class="px-2.5 py-1.5 text-sm leading-none font-medium text-ink-gray-5"
              >
                {{ group.name }}
              </ComboboxLabel>

              <ComboboxItem
                v-for="option in group.children"
                :key="option.value"
                :value="option"
                class="flex cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-base text-ink-gray-7 data-[disabled]:text-ink-gray-5 data-[disabled]:pointer-events-none data-[highlighted]:outline-none data-[highlighted]:bg-surface-gray-3 relative"
                @select="(e) => handleSelect(option, e)"
              >
                <div class="flex flex-1 gap-2 overflow-hidden items-center">
                  <!-- Item prefix slot -->

                  <div v-if="$slots['item-prefix']" class="flex flex-shrink-0">
                    <slot
                      name="item-prefix"
                      v-bind="{ option, selected: isSelected(option) }"
                    >
                    </slot>
                  </div>

                  <!-- Label -->
                  <span class="flex-1 truncate">
                    {{ option.name || option.label }}
                  </span>
                </div>

                <!-- Item suffix slot or description -->
                <div
                  v-if="$slots['item-suffix'] || option.description || multiple"
                  class="ml-2 flex-shrink-0 flex items-center gap-2"
                >
                  <slot
                    name="item-suffix"
                    v-bind="{ option, selected: isSelected(option) }"
                  >
                    <div
                      v-if="option.description"
                      class="text-sm text-ink-gray-5"
                    >
                      {{ option.description }}
                    </div>
                  </slot>
                  <LucideCheck
                    v-if="props.multiple && isSelected(option)"
                    class="flex-shrink-0 size-4"
                  />
                  <div v-else-if="props.multiple" class="size-4"></div>
                </div>
              </ComboboxItem>
            </ComboboxGroup>
          </template>
        </ComboboxViewport>

        <!-- Footer with actions -->
        <div
          v-if="$slots.footer || multiple"
          class="border-t border-outline-gray-2 p-1.5 bg-surface-white"
        >
          <slot name="footer">
            <div v-if="multiple" class="flex items-center gap-2">
              <Button
                variant="ghost"
                v-if="!areAllOptionsSelected && allOptions.length > 0"
                @click.stop="selectAll"
              >
                Select All
              </Button>
              <Button
                v-if="Array.isArray(internalValue) && internalValue.length > 0"
                variant="ghost"
                @click.stop="clearAll"
              >
                Clear All
              </Button>
            </div>
          </slot>
        </div>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
