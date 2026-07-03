<script setup lang="ts">
import { computed, watch, watchEffect, h, type FunctionalComponent } from 'vue'
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { RouterLink } from 'vue-router'
import { Icon } from '../Icon'
import { warnDeprecated } from '../../utils/warnDeprecated'
import { warnFeatherIconUsage } from '../../utils/iconString'
import type { TabButton, TabButtonsEmits, TabButtonsProps } from './types'

type BrowserTabBase = 'none' | 'default' | 'left' | 'right'

defineOptions({
  name: 'TabButtons',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<TabButtonsProps>(), {
  type: 'subtle',
  size: 'sm',
  vertical: false,
  direction: 'left',
})

const emit = defineEmits<TabButtonsEmits>()

watchEffect(() => {
  if (props.buttons) {
    warnDeprecated('TabButtons `buttons` prop', '`options`')
  }
})

const options = computed(() => props.options ?? props.buttons ?? [])

watchEffect(() => {
  for (const option of options.value) {
    warnFeatherIconUsage('TabButtons', 'options.icon', option.icon)
    warnFeatherIconUsage('TabButtons', 'options.iconLeft', option.iconLeft)
    warnFeatherIconUsage('TabButtons', 'options.iconRight', option.iconRight)
  }
})

const resolvedButtons = computed(() => {
  return options.value.map((button, index) => {
    const {
      value,
      label,
      icon,
      iconLeft,
      iconRight,
      active = false,
      class: customClass,
      onClick,
      tooltip,
      disabled,
      route,
      href,
    } = button

    const isIconOnly = Boolean(icon)
    const visibleLabel = hasLabel(label) && !isIconOnly
    const accessibleLabel = hasLabel(label) ? String(label) : tooltip

    return {
      key: `tab-button-${index}`,
      label,
      icon,
      iconLeft,
      iconRight,
      active,
      customClass,
      onClick,
      tooltip,
      disabled,
      visibleLabel,
      accessibleLabel,
      route,
      href,
      modelValue: value ?? label ?? index,
    }
  })
})

watch(
  [resolvedButtons, () => props.modelValue],
  ([buttons]) => {
    const selectedButton = buttons.find((button) =>
      Object.is(button.modelValue, props.modelValue),
    )

    if (selectedButton) return

    const fallbackButton = buttons.find((button) => button.active)
    if (
      fallbackButton &&
      !Object.is(fallbackButton.modelValue, props.modelValue)
    ) {
      emit('update:modelValue', fallbackButton.modelValue)
    }
  },
  { immediate: true },
)

const selectedButtonKey = computed({
  get: () => {
    const selectedButton = resolvedButtons.value.find((button) =>
      Object.is(button.modelValue, props.modelValue),
    )

    if (selectedButton) return selectedButton.key

    return resolvedButtons.value.find((button) => button.active)?.key
  },
  set: (nextKey) => {
    const selectedButton = resolvedButtons.value.find(
      (button) => button.key === nextKey,
    )
    emit('update:modelValue', selectedButton?.modelValue)
  },
})

const rootClasses = computed(() =>
  props.vertical ? verticalClasses() : horizontalClasses(),
)

function horizontalClasses() {
  const base = ['inline-flex shrink-0 items-center overflow-hidden']
  const isSm = props.size === 'sm'

  switch (props.type) {
    case 'subtle':
    case 'ghost': {
      const surface =
        props.type === 'subtle' ? 'bg-surface-gray-2' : 'bg-surface-base'
      const shape = isSm ? 'gap-1 rounded' : 'gap-1.5 rounded-[10px]'
      return [...base, 'p-px', surface, shape]
    }
    case 'underline':
      return [...base, 'border-b border-outline-gray-1 gap-6']
    case 'browser-tab':
      return [...base, 'border-b border-outline-gray-1 gap-1']
  }
  return base
}

// Vertical mode is a separate layout. Buttons get `w-full` so every tab
// stretches to the container's intrinsic max width — the active indicator then
// lands on the container's rail rather than at the button's own text width.
function verticalClasses() {
  const base = ['inline-flex shrink-0 flex-col']
  const isSm = props.size === 'sm'

  switch (props.type) {
    case 'subtle':
    case 'ghost': {
      const surface =
        props.type === 'subtle' ? 'bg-surface-gray-2' : 'bg-surface-base'
      const shape = isSm ? 'gap-1 rounded' : 'gap-1.5 rounded-[10px]'
      return [...base, 'p-px', surface, shape, 'items-center']
    }
    case 'underline':
      return [...base, 'border-r border-outline-gray-1 gap-1.5']
    case 'browser-tab': {
      const rule =
        props.direction === 'right'
          ? 'border-r border-outline-gray-1'
          : 'border-l border-outline-gray-1'
      return [...base, rule, 'gap-1']
    }
  }
  return base
}

function browserTabBase(checked: boolean): BrowserTabBase {
  if (props.type !== 'browser-tab') return 'none'
  if (!props.vertical) return 'default'
  if (!checked) return 'none'
  return props.direction
}

function tabButtonRadiusClass(checked: boolean) {
  if (props.type === 'underline') return ''

  if (props.type === 'browser-tab') {
    const base = browserTabBase(checked)
    if (base === 'left')
      return props.size === 'sm' ? 'rounded-r-[7px]' : 'rounded-r-[9px]'
    if (base === 'right')
      return props.size === 'sm' ? 'rounded-l-[7px]' : 'rounded-l-[9px]'
    if (base === 'default')
      return props.size === 'sm' ? 'rounded-t-[7px]' : 'rounded-t-[9px]'
  }

  return props.size === 'sm' ? 'rounded-[7px]' : 'rounded-[9px]'
}

function tabButtonClasses(
  checked: boolean,
  button: (typeof resolvedButtons.value)[number],
) {
  return [
    'inline-flex box-border shrink-0 select-none items-center justify-center whitespace-nowrap text-sm leading-[16.1px] no-underline outline-none transition-[background-color,color,box-shadow,border-color] duration-150 ease-out motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-60',
    contentSizeClass(button),
    tabButtonRadiusClass(checked),
    tabButtonVariantClasses(checked),
    props.vertical && 'w-full justify-start',
  ]
}

const buttonSizeClasses = computed(() => {
  const isSm = props.size === 'sm'
  return {
    iconOnly: isSm ? 'size-6.5 gap-1.5 p-[5px]' : 'size-7 gap-1.5 p-[5px]',
    default:
      props.type === 'underline'
        ? isSm
          ? 'h-7 gap-2'
          : 'h-7.5 gap-2'
        : isSm
          ? 'h-6.5 gap-2 px-2 py-[5px]'
          : 'h-7 gap-2 px-2.5 py-1.5',
  }
})

function tabButtonVariantClasses(checked: boolean) {
  if (props.type === 'underline') return underlineClasses(checked)
  if (props.type === 'browser-tab') return browserTabClasses(checked)
  if (props.type === 'ghost') return ghostClasses(checked)
  return subtleClasses(checked)
}

function subtleClasses(checked: boolean) {
  return checked
    ? 'bg-surface-base text-ink-gray-8 shadow-[0_0.5px_0_rgb(0_0_0/0.07),0_1px_2px_-1px_rgb(0_0_0/0.08),inset_0_0.5px_0_var(--surface-white)] dark:bg-surface-gray-3 dark:shadow-[inset_0_0.5px_0_rgb(255_255_255/0.25),inset_0_0_0_0.5px_rgb(255_255_255/0.10)]'
    : 'text-ink-gray-5 hover:bg-surface-gray-3/80 hover:text-ink-gray-7'
}

function ghostClasses(checked: boolean) {
  return checked
    ? 'bg-surface-gray-2 text-ink-gray-8 shadow-[inset_0_0.5px_0_var(--surface-white)] dark:bg-surface-gray-3 dark:shadow-[inset_0_0.5px_0_rgb(255_255_255/0.25),inset_0_0_0_0.5px_rgb(255_255_255/0.10)]'
    : 'text-ink-gray-5 hover:bg-surface-gray-2 hover:text-ink-gray-7'
}

function underlineClasses(checked: boolean) {
  const isVertical = props.vertical
  const railSlot = isVertical
    ? 'border-r border-transparent'
    : 'border-b border-transparent'

  if (!checked) return [railSlot, 'text-ink-gray-5 hover:text-ink-gray-7']

  const indicator = isVertical
    ? 'after:absolute after:inset-y-1.5 after:-right-0.5 after:w-px after:bg-[var(--ink-gray-8)]'
    : 'after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-[var(--ink-gray-8)]'

  return ['relative text-ink-gray-8 font-medium', railSlot, indicator]
}

function browserTabClasses(checked: boolean) {
  if (!checked) {
    return 'border border-transparent text-ink-gray-5 hover:bg-surface-gray-2 hover:text-ink-gray-7'
  }

  const activeBase =
    'relative border border-outline-gray-2 bg-surface-base text-ink-gray-8 shadow-[inset_0_1px_0_var(--surface-white)]'
  const base = browserTabBase(checked)

  if (base === 'left') {
    return [
      activeBase,
      'border-l-0 after:absolute after:-left-[3px] after:-top-px after:-bottom-px after:w-[3px] after:bg-surface-base',
    ]
  }

  if (base === 'right') {
    return [
      activeBase,
      'border-r-0 after:absolute after:-right-[3px] after:-top-px after:-bottom-px after:w-[3px] after:bg-surface-base',
    ]
  }

  return [
    activeBase,
    'border-b-0 after:absolute after:-inset-x-px after:-bottom-[3px] after:h-[3px] after:bg-surface-base',
  ]
}

function contentSizeClass(button: (typeof resolvedButtons.value)[number]) {
  return button.icon
    ? buttonSizeClasses.value.iconOnly
    : buttonSizeClasses.value.default
}

function tabLabelClass(button: (typeof resolvedButtons.value)[number]) {
  return ['min-w-0 truncate', !button.visibleLabel && 'sr-only']
}

const iconClass = computed(() =>
  props.size === 'sm' ? 'size-4 shrink-0' : 'size-[18px] shrink-0',
)

function hasLabel(label: TabButton['label']) {
  return label !== undefined && label !== null && label !== ''
}

// Native tab elements are rendered through these functional wrappers rather
// than bare 'button'/'a' tag strings. A string `:is` binding runs through
// Vue's component resolver, which capitalizes the name and matches a globally
// registered component — so in apps that do `app.component('Button', ...)`
// (e.g. Gameplan), `<component :is="'button'">` resolves to that Button
// component instead of a native <button>. Binding a component value skips the
// resolver. `inheritAttrs: false` keeps the merged Reka/data/class/@click
// attrs from being applied twice.
const NativeButton: FunctionalComponent = (_props, { attrs, slots }) =>
  h('button', { ...attrs }, slots.default?.())
NativeButton.inheritAttrs = false
const NativeAnchor: FunctionalComponent = (_props, { attrs, slots }) =>
  h('a', { ...attrs }, slots.default?.())
NativeAnchor.inheritAttrs = false

// Pick the wrapper element for a tab. `route` → RouterLink, `href` →
// anchor, otherwise a native button. Disabled forces the button form so
// `:disabled` actually blocks interaction.
function tabElement(button: (typeof resolvedButtons.value)[number]) {
  if (button.disabled) return NativeButton
  if (button.route) return RouterLink
  if (button.href) return NativeAnchor
  return NativeButton
}

function tabElementProps(button: (typeof resolvedButtons.value)[number]) {
  if (!button.disabled && button.route) {
    return { to: button.route }
  }
  if (!button.disabled && button.href) {
    return {
      href: button.href,
      target: '_blank',
      rel: 'noreferrer noopener',
    }
  }
  return { type: 'button' as const, disabled: button.disabled }
}
</script>

<template>
  <RadioGroupRoot
    v-model="selectedButtonKey"
    :orientation="vertical ? 'vertical' : 'horizontal'"
    v-bind="$attrs"
  >
    <div :class="rootClasses">
      <RadioGroupItem
        v-for="button in resolvedButtons"
        :key="button.key"
        v-slot="{ checked, disabled }"
        as="template"
        :disabled="button.disabled"
        :value="button.key"
      >
        <component
          :is="tabElement(button)"
          v-bind="tabElementProps(button)"
          data-slot="tab-button"
          :data-state="checked ? 'checked' : 'unchecked'"
          :data-disabled="disabled ? '' : undefined"
          :aria-label="
            button.accessibleLabel && !button.visibleLabel
              ? button.accessibleLabel
              : undefined
          "
          :title="
            button.accessibleLabel && !button.visibleLabel
              ? button.accessibleLabel
              : button.tooltip
          "
          :class="[tabButtonClasses(checked, button), button.customClass]"
          @click="button.onClick?.($event)"
        >
          <slot
            v-if="$slots.prefix"
            name="prefix"
            :button="button"
            :checked="checked"
            :disabled="disabled"
          />
          <Icon
            v-else-if="button.icon"
            :name="button.icon"
            :class="iconClass"
          />
          <Icon
            v-else-if="button.iconLeft"
            :name="button.iconLeft"
            :class="iconClass"
          />

          <span v-if="hasLabel(button.label)" :class="tabLabelClass(button)">
            {{ button.label }}
          </span>

          <slot
            v-if="$slots.suffix"
            name="suffix"
            :button="button"
            :checked="checked"
            :disabled="disabled"
          />
          <Icon
            v-else-if="button.iconRight && !button.icon"
            :name="button.iconRight"
            :class="iconClass"
          />
        </component>
      </RadioGroupItem>
    </div>
  </RadioGroupRoot>
</template>
