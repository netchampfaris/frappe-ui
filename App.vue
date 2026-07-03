<script setup>
import { computed, onUnmounted, reactive, ref, watchEffect } from 'vue'
import { Button } from './src/components/Button'
import { Dropdown } from './src/components/Dropdown'
import { Slider } from './src/components/Slider'
import { useTheme } from './src/utils/theme'

const { currentTheme, toggleTheme } = useTheme()

const motionVars = [
  '--menu-enter-duration',
  '--menu-enter-ease',
  '--menu-enter-scale',
  '--menu-enter-y',
  '--menu-exit-duration',
  '--menu-exit-ease',
  '--menu-exit-scale',
  '--menu-exit-y',
  '--menu-instant-duration',
  '--menu-instant-ease',
]

const settings = reactive({
  enterDuration: [150],
  exitDuration: [95],
  instantDuration: [70],
  enterScale: [0.97],
  exitScale: [0.985],
  enterY: [3],
  exitY: [1],
})

const enterEase = ref('cubic-bezier(0.16, 1, 0.3, 1)')
const exitEase = ref('cubic-bezier(0.3, 0, 0.8, 0.15)')
const instantEase = ref('linear')
const lastAction = ref('Pick an action')

const themeToggleIcon = computed(() => {
  return currentTheme.value === 'dark' ? 'lucide-sun' : 'lucide-moon'
})

const themeToggleLabel = computed(() => {
  return currentTheme.value === 'dark' ? 'Light' : 'Dark'
})

const themeToggleTooltip = computed(() => {
  return currentTheme.value === 'dark' ? 'Use light mode' : 'Use dark mode'
})

const easingOptions = [
  { label: 'Ease out', value: 'ease-out' },
  { label: 'Ease in', value: 'ease-in' },
  { label: 'Smooth', value: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  { label: 'Standard', value: 'cubic-bezier(0.2, 0, 0, 1)' },
  { label: 'Tight', value: 'cubic-bezier(0.3, 0, 0.8, 0.15)' },
  { label: 'Snappy', value: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
  { label: 'Springy', value: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  { label: 'Native', value: 'cubic-bezier(0.25, 1, 0.5, 1)' },
  { label: 'Linear', value: 'linear' },
]

const options = [
  {
    group: 'Document',
    options: [
      {
        label: 'Edit',
        icon: 'lucide-pen',
        onClick: () => (lastAction.value = 'Edited'),
      },
      {
        label: 'Share',
        icon: 'lucide-share-2',
        submenu: [
          {
            label: 'Copy link',
            icon: 'lucide-link',
            onClick: () => (lastAction.value = 'Copied link'),
          },
          {
            label: 'Invite people',
            icon: 'lucide-user-plus',
            submenu: [
              {
                label: 'By email',
                icon: 'lucide-mail',
                onClick: () => (lastAction.value = 'Invited by email'),
              },
              {
                label: 'Send to Slack',
                icon: 'lucide-message-circle',
                onClick: () => (lastAction.value = 'Sent to Slack'),
              },
            ],
          },
        ],
      },
      {
        label: 'Duplicate',
        icon: 'lucide-copy',
        onClick: () => (lastAction.value = 'Duplicated'),
      },
    ],
  },
  {
    group: 'Danger',
    options: [
      {
        label: 'Delete',
        icon: 'lucide-trash-2',
        theme: 'red',
        onClick: () => (lastAction.value = 'Deleted'),
      },
    ],
  },
]

const controlGroups = computed(() => [
  {
    label: 'Enter',
    controls: [
      {
        key: 'enterDuration',
        label: 'Duration',
        suffix: 'ms',
        min: 60,
        max: 300,
        step: 5,
      },
      {
        key: 'enterScale',
        label: 'Scale',
        suffix: '',
        min: 0.9,
        max: 1,
        step: 0.005,
      },
      {
        key: 'enterY',
        label: 'Y',
        suffix: 'px',
        min: -8,
        max: 8,
        step: 1,
      },
    ],
  },
  {
    label: 'Exit',
    controls: [
      {
        key: 'exitDuration',
        label: 'Duration',
        suffix: 'ms',
        min: 40,
        max: 240,
        step: 5,
      },
      {
        key: 'exitScale',
        label: 'Scale',
        suffix: '',
        min: 0.9,
        max: 1,
        step: 0.005,
      },
      {
        key: 'exitY',
        label: 'Y',
        suffix: 'px',
        min: -8,
        max: 8,
        step: 1,
      },
    ],
  },
  {
    label: 'Keyboard',
    controls: [
      {
        key: 'instantDuration',
        label: 'Fade',
        suffix: 'ms',
        min: 0,
        max: 160,
        step: 5,
      },
    ],
  },
])

watchEffect(() => {
  const style = document.documentElement.style
  style.setProperty('--menu-enter-duration', `${settings.enterDuration[0]}ms`)
  style.setProperty('--menu-enter-ease', enterEase.value)
  style.setProperty('--menu-enter-scale', settings.enterScale[0])
  style.setProperty('--menu-enter-y', `${settings.enterY[0]}px`)
  style.setProperty('--menu-exit-duration', `${settings.exitDuration[0]}ms`)
  style.setProperty('--menu-exit-ease', exitEase.value)
  style.setProperty('--menu-exit-scale', settings.exitScale[0])
  style.setProperty('--menu-exit-y', `${settings.exitY[0]}px`)
  style.setProperty(
    '--menu-instant-duration',
    `${settings.instantDuration[0]}ms`,
  )
  style.setProperty('--menu-instant-ease', instantEase.value)
})

onUnmounted(() => {
  motionVars.forEach((name) =>
    document.documentElement.style.removeProperty(name),
  )
})

const presets = [
  {
    label: 'Current',
    description: 'Existing Dropdown timing',
    settings: {
      enterDuration: [100],
      exitDuration: [75],
      instantDuration: [80],
      enterScale: [0.95],
      exitScale: [0.95],
      enterY: [0],
      exitY: [0],
    },
    enterEase: 'ease-out',
    exitEase: 'ease-in',
    instantEase: 'linear',
  },
  {
    label: 'Smooth',
    description: 'Soft default exploration',
    settings: {
      enterDuration: [150],
      exitDuration: [95],
      instantDuration: [70],
      enterScale: [0.97],
      exitScale: [0.985],
      enterY: [3],
      exitY: [1],
    },
    enterEase: 'cubic-bezier(0.16, 1, 0.3, 1)',
    exitEase: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
    instantEase: 'linear',
  },
  {
    label: 'Snappy',
    description: 'Fast utility-menu feel',
    settings: {
      enterDuration: [90],
      exitDuration: [60],
      instantDuration: [45],
      enterScale: [0.98],
      exitScale: [0.98],
      enterY: [2],
      exitY: [0],
    },
    enterEase: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    exitEase: 'ease-in',
    instantEase: 'linear',
  },
]

const appPresets = [
  {
    label: 'Notion',
    description: 'Quiet fade, tiny lift',
    settings: {
      enterDuration: [120],
      exitDuration: [80],
      instantDuration: [60],
      enterScale: [0.985],
      exitScale: [0.99],
      enterY: [2],
      exitY: [0],
    },
    enterEase: 'cubic-bezier(0.2, 0, 0, 1)',
    exitEase: 'ease-in',
    instantEase: 'linear',
  },
  {
    label: 'Linear',
    description: 'Precise and quick',
    settings: {
      enterDuration: [105],
      exitDuration: [70],
      instantDuration: [45],
      enterScale: [0.975],
      exitScale: [0.985],
      enterY: [2],
      exitY: [0],
    },
    enterEase: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    exitEase: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
    instantEase: 'linear',
  },
  {
    label: 'Raycast',
    description: 'Keyboard-first snap',
    settings: {
      enterDuration: [85],
      exitDuration: [55],
      instantDuration: [35],
      enterScale: [0.99],
      exitScale: [0.995],
      enterY: [0],
      exitY: [0],
    },
    enterEase: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    exitEase: 'ease-in',
    instantEase: 'linear',
  },
  {
    label: 'Apple',
    description: 'Polished native glide',
    settings: {
      enterDuration: [180],
      exitDuration: [130],
      instantDuration: [90],
      enterScale: [0.96],
      exitScale: [0.985],
      enterY: [4],
      exitY: [1],
    },
    enterEase: 'cubic-bezier(0.25, 1, 0.5, 1)',
    exitEase: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
    instantEase: 'linear',
  },
  {
    label: 'Framer',
    description: 'Expressive prototype motion',
    settings: {
      enterDuration: [220],
      exitDuration: [150],
      instantDuration: [100],
      enterScale: [0.94],
      exitScale: [0.975],
      enterY: [6],
      exitY: [2],
    },
    enterEase: 'cubic-bezier(0.22, 1, 0.36, 1)',
    exitEase: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
    instantEase: 'linear',
  },
]

const presetGroups = [
  { label: 'Base', presets },
  { label: 'Inspired', presets: appPresets },
]

function applyPreset(preset) {
  Object.assign(settings, preset.settings)
  enterEase.value = preset.enterEase
  exitEase.value = preset.exitEase
  instantEase.value = preset.instantEase
}
</script>

<template>
  <main class="min-h-screen bg-surface-base text-ink-gray-9">
    <div
      class="mx-auto grid max-w-5xl gap-8 px-8 py-10 lg:grid-cols-[1fr_23rem]"
    >
      <section class="space-y-8">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-2">
            <h1 class="text-2xl font-semibold leading-8">Dropdown motion</h1>
            <p class="max-w-xl text-base text-ink-gray-5">
              Tune the shared menu motion variables and test pointer, keyboard,
              and nested submenu opens.
            </p>
          </div>
          <Button
            variant="outline"
            :icon-left="themeToggleIcon"
            :label="themeToggleLabel"
            :tooltip="themeToggleTooltip"
            @click="toggleTheme"
          />
        </div>

        <div
          class="flex min-h-72 items-center justify-center rounded-lg border border-outline-gray-2"
        >
          <div class="grid justify-items-center gap-3">
            <Dropdown :options="options" :button="{ label: 'Open menu' }" />
            <div class="text-sm text-ink-gray-5">{{ lastAction }}</div>
          </div>
        </div>

        <div class="grid gap-4">
          <section
            v-for="group in presetGroups"
            :key="group.label"
            class="grid gap-2"
          >
            <h2 class="text-sm font-medium text-ink-gray-5">
              {{ group.label }}
            </h2>
            <div class="grid gap-2 sm:grid-cols-2">
              <button
                v-for="preset in group.presets"
                :key="preset.label"
                type="button"
                class="rounded border border-outline-gray-2 bg-surface-base px-3 py-2 text-left transition-colors hover:bg-surface-gray-2 focus-visible:focus-ring"
                @click="applyPreset(preset)"
              >
                <div
                  class="flex items-center justify-between gap-3 text-base font-medium"
                >
                  <span>{{ preset.label }}</span>
                  <span class="text-sm text-ink-gray-5">
                    {{ preset.settings.enterDuration[0] }}ms
                  </span>
                </div>
                <div class="mt-0.5 text-sm text-ink-gray-5">
                  {{ preset.description }}
                </div>
              </button>
            </div>
          </section>
        </div>
      </section>

      <aside class="space-y-6">
        <section
          v-for="group in controlGroups"
          :key="group.label"
          class="space-y-3"
        >
          <h2 class="text-sm font-medium text-ink-gray-5">{{ group.label }}</h2>
          <div class="space-y-4">
            <label
              v-for="control in group.controls"
              :key="control.key"
              class="grid gap-2"
            >
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="font-medium">{{ control.label }}</span>
                <span class="tabular-nums text-ink-gray-5">
                  {{ settings[control.key][0] }}{{ control.suffix }}
                </span>
              </div>
              <Slider
                v-model="settings[control.key]"
                :min="control.min"
                :max="control.max"
                :step="control.step"
              />
            </label>
          </div>
        </section>

        <section class="space-y-3">
          <h2 class="text-sm font-medium text-ink-gray-5">Easing</h2>
          <label class="grid gap-1.5 text-sm">
            <span class="font-medium">Enter</span>
            <select
              v-model="enterEase"
              class="h-8 rounded border border-outline-gray-2 bg-surface-base px-2 text-base"
            >
              <option
                v-for="option in easingOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="grid gap-1.5 text-sm">
            <span class="font-medium">Exit</span>
            <select
              v-model="exitEase"
              class="h-8 rounded border border-outline-gray-2 bg-surface-base px-2 text-base"
            >
              <option
                v-for="option in easingOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
        </section>
      </aside>
    </div>
  </main>
</template>
