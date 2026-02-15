<template>
  <div class="flex min-w-0 items-center" ref="crumbsRef">
    <template v-if="overflowedX && items.length > 2">
      <Dropdown class="h-7" :options="dropdownItems">
        <Button variant="ghost">
          <template #icon>
            <LucideEllipsis class="w-4 text-ink-gray-5" />
          </template>
        </Button>
      </Dropdown>
      <span class="ml-1 mr-0.5 text-base text-ink-gray-4" aria-hidden="true">
        /
      </span>
    </template>

    <div class="flex min-w-0 items-center text-ellipsis whitespace-nowrap">
      <template v-for="(item, i) in crumbs" :key="getCrumbKey(item, i)">
        <Dropdown
          v-if="item.type === 'dropdown'"
          class="h-7"
          :options="getDropdownOptions(item)"
        >
          <template #default>
            <button
              class="flex items-center rounded px-0.5 py-1 text-lg font-medium text-ink-gray-5 hover:text-ink-gray-7 focus:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-3"
            >
              <slot name="prefix" :item="getDropdownActiveOption(item)" />
              <span>{{ getDropdownLabel(item) }}</span>
              <slot name="suffix" :item="getDropdownActiveOption(item)" />
              <LucideChevronDown class="ml-1 size-4 text-ink-gray-5" />
            </button>
          </template>
        </Dropdown>
        <router-link
          v-else-if="item.route && hasRouter"
          :to="item.route"
          @click="item.onClick ? item.onClick() : null"
          class="flex items-center rounded px-0.5 py-1 text-lg font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-3"
          :class="[
            i == crumbs.length - 1
              ? 'text-ink-gray-9'
              : 'text-ink-gray-5 hover:text-ink-gray-7',
          ]"
        >
          <slot name="prefix" :item="item" />
          <span>
            {{ item.label }}
          </span>
          <slot name="suffix" :item="item" />
        </router-link>
        <a
          v-else-if="item.route && !hasRouter && typeof item.route === 'string'"
          :href="item.route"
          @click="item.onClick ? item.onClick() : null"
          class="flex items-center rounded px-0.5 py-1 text-lg font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-3"
          :class="[
            i == crumbs.length - 1
              ? 'text-ink-gray-9'
              : 'text-ink-gray-5 hover:text-ink-gray-7',
          ]"
        >
          <slot name="prefix" :item="item" />
          <span>
            {{ item.label }}
          </span>
          <slot name="suffix" :item="item" />
        </a>
        <a
          v-else-if="item.href"
          :href="item.href"
          @click="item.onClick ? item.onClick() : null"
          class="flex items-center rounded px-0.5 py-1 text-lg font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-3"
          :class="[
            i == crumbs.length - 1
              ? 'text-ink-gray-9'
              : 'text-ink-gray-5 hover:text-ink-gray-7',
          ]"
        >
          <slot name="prefix" :item="item" />
          <span>
            {{ item.label }}
          </span>
          <slot name="suffix" :item="item" />
        </a>
        <button
          v-else
          @click="handleCrumbClick(item)"
          class="flex items-center rounded px-0.5 py-1 text-lg font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-3"
          :class="[
            i == crumbs.length - 1
              ? 'text-ink-gray-9'
              : 'text-ink-gray-5 hover:text-ink-gray-7',
          ]"
        >
          <slot name="prefix" :item="item" />
          <span>
            {{ item.label }}
          </span>
          <slot name="suffix" :item="item" />
        </button>
        <span
          v-if="i != crumbs.length - 1"
          class="mx-0.5 text-base text-ink-gray-4"
          aria-hidden="true"
        >
          /
        </span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { Dropdown } from '../Dropdown'
import { Button } from '../Button'
import type {
  BreadcrumbsProps,
  BreadcrumbItem,
  BreadcrumbDropdownItem,
  BreadcrumbLinkItem,
} from './types'
import { ref, computed, nextTick, useTemplateRef } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import LucideEllipsis from '~icons/lucide/ellipsis'
import LucideChevronDown from '~icons/lucide/chevron-down'

const crumbsEl = useTemplateRef<HTMLDivElement>('crumbsRef')

const props = defineProps<BreadcrumbsProps>()

let router: ReturnType<typeof useRouter> | null = null
let route: ReturnType<typeof useRoute> | null = null
try {
  router = useRouter()
} catch (error) {
  router = null
}
try {
  route = useRoute()
} catch (error) {
  route = null
}
const overflowedX = ref(false)
const hasRouter = computed(() => Boolean(router))

const items = computed(() => {
  return (props.items || []).filter(Boolean)
})

const checkOverflow = () => {
  if (!crumbsEl.value) return

  // tmp show all items to measure item width
  overflowedX.value = false

  nextTick(() => {
    const scrollWidth = crumbsEl.value?.scrollWidth || 0
    const clientWidth = crumbsEl.value?.clientWidth || 0
    overflowedX.value = scrollWidth > clientWidth
  })
}

useResizeObserver(crumbsEl, checkOverflow)

const dropdownItems = computed(() => {
  let allExceptLastTwo = items.value.slice(0, -2)
  return allExceptLastTwo.map((item) => mapOverflowDropdownItem(item))
})

const crumbs = computed(() => items.value.slice(overflowedX.value ? -2 : 0))

const getCrumbKey = (item: BreadcrumbItem, index: number) => {
  if ('type' in item && item.type === 'dropdown') {
    return `${index}-dropdown`
  }
  return item.label
}

const isRouteMatch = (option: BreadcrumbLinkItem) => {
  const currentPath = route?.path || ''
  if (option.route && router) {
    return router.resolve(option.route).path === currentPath
  }
  if (option.route && typeof option.route === 'string') {
    return option.route === currentPath
  }
  if (option.href) {
    return option.href === currentPath
  }
  return false
}

const getDropdownActiveOption = (item: BreadcrumbDropdownItem) => {
  return item.items.find((option) => isRouteMatch(option)) || item.items[0]
}

const getDropdownLabel = (item: BreadcrumbDropdownItem) => {
  const activeOption = getDropdownActiveOption(item)
  if (typeof item.label === 'function') {
    return item.label(item, activeOption)
  }
  return activeOption?.label || item.label || 'Select'
}

const mapBreadcrumbOptionToDropdown = (option: BreadcrumbLinkItem) => {
  const { onClick, route, ...rest } = option
  return {
    ...rest,
    icon: null,
    label: option.label,
    onClick: () => {
      onClick?.()
      if (route && router) {
        router.push(route)
      }
    },
  }
}

const handleCrumbClick = (item: BreadcrumbLinkItem) => {
  item.onClick?.()
  if (item.route && router) {
    router.push(item.route)
    return
  }
}

const getDropdownOptions = (item: BreadcrumbDropdownItem) => {
  return item.items.map((option) => mapBreadcrumbOptionToDropdown(option))
}

const mapOverflowDropdownItem = (item: BreadcrumbItem) => {
  if ('type' in item && item.type === 'dropdown') {
    return {
      icon: null,
      label: getDropdownLabel(item),
      submenu: getDropdownOptions(item),
    }
  }
  return mapBreadcrumbOptionToDropdown(item)
}

defineSlots<{
  /** Content shown before each breadcrumb label */
  prefix?: (props: { item: BreadcrumbItem }) => any

  /** Content shown after each breadcrumb label */
  suffix?: (props: { item: BreadcrumbItem }) => any
}>()
</script>
