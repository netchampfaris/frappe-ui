<script lang="ts">
import {
  computed,
  defineComponent,
  h,
  ref,
  watchEffect,
  type Component,
  type SlotsType,
  type VNode,
} from 'vue'
import {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  injectTooltipProviderContext,
} from 'reka-ui'
import { RouterLink } from 'vue-router'
import FeatherIcon from '../FeatherIcon.vue'
import Spinner from '../Spinner/Spinner.vue'
import TooltipBubble from '../Tooltip/TooltipBubble.vue'
import { warnFeatherIconUsage } from '../../utils/iconString'
import { buttonProps } from './types'

export default defineComponent({
  name: 'Button',
  inheritAttrs: false,
  props: buttonProps,
  slots: Object as SlotsType<{
    /** Content shown before the button label (left icon / custom content) */
    prefix: void
    /** Icon-only content for icon buttons */
    icon: void
    /** Main button content (overrides `label`) */
    default: void
    /** Content shown after the button label (right icon / custom content) */
    suffix: void
  }>,
  setup(props, { attrs, slots, expose }) {
    watchEffect(() => {
      warnFeatherIconUsage('Button', 'icon', props.icon)
      warnFeatherIconUsage('Button', 'iconLeft', props.iconLeft)
      warnFeatherIconUsage('Button', 'iconRight', props.iconRight)
    })

    const isDisabled = computed(() => props.disabled || props.loading)
    const hasTooltip = computed(() => Boolean(props.tooltip?.length))

    // Reuse a surrounding <TooltipProvider> (button group) when present so the
    // group's skip-delay applies to this button instead of a private provider.
    const parentTooltipProvider = injectTooltipProviderContext(null)

    // Render as an icon button when the default slot is exactly one lucide-* icon.
    const hasLucideIconInDefaultSlot = computed(() => {
      const content = slots.default?.()
      if (!Array.isArray(content)) return false
      const name = (content[0]?.type as { name?: string })?.name
      return typeof name === 'string' && name.startsWith('lucide-')
    })

    const isIconButton = computed(
      () =>
        Boolean(props.icon) ||
        Boolean(slots.icon) ||
        hasLucideIconInDefaultSlot.value,
    )

    // All styling lives in Button.css, selected by the `data-*` attributes below.
    // `data-disabled` only dims an explicitly `disabled` button (a `loading`
    // button keeps its colors); `data-loading` makes it non-interactive.
    const dataAttrs = computed(() => ({
      'data-theme': props.theme,
      'data-variant': props.variant,
      'data-size': props.size,
      'data-icon': isIconButton.value ? '' : undefined,
      'data-disabled': props.disabled ? '' : undefined,
      'data-loading': props.loading ? '' : undefined,
    }))

    const rootRef = ref()
    expose({ rootRef })

    // The dynamic root: router link, external anchor, or native button. Using the
    // raw 'button' string (not <component :is>) sidesteps the historic recursion
    // with a globally-registered <Button> in consumer apps.
    const root = computed<{
      is: Component | string
      props: Record<string, unknown>
    }>(() => {
      if (!isDisabled.value && props.route) {
        return { is: RouterLink, props: { to: props.route } }
      }
      if (!isDisabled.value && props.link) {
        return {
          is: 'a',
          props: {
            href: props.link,
            target: '_blank',
            rel: 'noreferrer noopener',
          },
        }
      }
      return {
        is: 'button',
        props: { type: props.type, disabled: isDisabled.value },
      }
    })

    /** Resolve an icon prop to a vnode: lucide class-span, FeatherIcon, or component. */
    function renderIcon(
      icon: string | Component | undefined,
      featherHidden: boolean,
    ): VNode | null {
      if (!icon) return null
      if (typeof icon === 'string') {
        if (icon.startsWith('lucide-')) {
          return h('span', {
            class: [icon, 'fui-button-icon-square'],
            'aria-hidden': 'true',
          })
        }
        return h(FeatherIcon, {
          name: icon,
          class: 'fui-button-icon',
          ...(featherHidden ? { 'aria-hidden': 'true' } : {}),
        })
      }
      return h(icon, { class: 'fui-button-icon' })
    }

    function renderPrefix() {
      if (props.loading) {
        // No `size`/`theme` props: button spinner diameters (sized per button
        // size in Button.css) don't line up with Spinner's fixed sizes, and the
        // spinner inherits the button's text color.
        return h(Spinner, { class: 'fui-button-icon-square' })
      }
      if (slots.prefix) return slots.prefix()
      return renderIcon(props.iconLeft, true)
    }

    function renderMain() {
      if (props.loading && props.loadingText) return props.loadingText
      if (isIconButton.value && !props.loading) {
        if (props.icon) return renderIcon(props.icon, false)
        if (slots.icon) return slots.icon()
        if (hasLucideIconInDefaultSlot.value) {
          return h(
            'div',
            { class: 'fui-button-icon' },
            slots.default?.() ?? props.label,
          )
        }
        return null
      }
      return h(
        'span',
        { class: 'fui-button-label' },
        slots.default?.() ?? props.label,
      )
    }

    function renderSuffix() {
      if (slots.suffix) return slots.suffix()
      return renderIcon(props.iconRight, true)
    }

    return () => {
      const { class: attrClass, ...restAttrs } = attrs
      const { is, props: rootProps } = root.value
      const children = [renderPrefix(), renderMain(), renderSuffix()]
      const mergedProps = {
        ...rootProps,
        ...dataAttrs.value,
        ...restAttrs,
        class: [attrClass, 'fui-button'],
        'aria-label': props.label,
        'aria-busy': props.loading || undefined,
        ref: rootRef,
      }
      const button =
        typeof is === 'string'
          ? h(is, mergedProps, children)
          : h(is, mergedProps, { default: () => children })

      if (!hasTooltip.value) return button

      // Tooltip scaffolding renders only when a tooltip is set, so a bare button
      // ships without any tooltip context, listeners, or pointerdown-to-close.
      const tooltipRoot = h(TooltipRoot, null, {
        default: () => [
          h(TooltipTrigger, { asChild: true }, { default: () => button }),
          h(TooltipBubble, { text: props.tooltip }),
        ],
      })

      // Inside a button group, the provider already exists upstream — mounting
      // our own here would isolate this button from the shared skip-delay.
      return parentTooltipProvider
        ? tooltipRoot
        : h(TooltipProvider, null, { default: () => tooltipRoot })
    }
  },
})
</script>
