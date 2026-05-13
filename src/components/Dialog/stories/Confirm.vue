<script setup lang="ts">
// Adapted from gameplan/SpaceOptions.vue — "Delete space" confirm.
// Uses declarative `actions` with a `{ close }` context, `theme: 'red'`,
// `dismissable: false` so the user must pick an action, and a loading
// flag wired to the in-flight delete.
import { ref } from 'vue'
import { Button, Dialog, Dropdown, MultiSelect } from 'frappe-ui'

const open = ref(false)
const deleting = ref(false)

const test = ref(false)

async function deleteSpace({ close }: { close: () => void }) {
  deleting.value = true
  try {
    await new Promise((r) => setTimeout(r, 800))
  } finally {
    deleting.value = false
    close()
  }
}
</script>

<template>
  <Button @click="open = true">Delete space…</Button>

  <Dialog
    v-model:open="open"
    title="Delete space"
    message="This will permanently delete the space along with 12 discussions and 4 tasks. This action cannot be undone."
    :icon="{ name: 'lucide-alert-triangle', theme: 'red' }"
    :dismissable="false"
    :show-close-button="false"
    :actions="[
      { label: 'Cancel' },
      {
        label: 'Delete',
        theme: 'red',
        variant: 'solid',
        loading: deleting,
        onClick: deleteSpace,
      },
    ]"
  />

  <Button @click="test = true">Open dialog with dropdown</Button>

  <Dialog v-model:open="test" title="Dialog with dropdown">
    <Dropdown
      :options="[
        {
          label: 'Add user',
          onClick() {
            console.log('add user')
          },
        },
        {
          label: 'Delete user',
          onClick() {
            console.log('del user')
          },
        },
      ]"
    />

    <MultiSelect
      :options="[
        { label: 'John Doe', value: 'john' },
        { label: 'John Doe 2', value: 'john2' },
        { label: 'John Doe 3', value: 'john3' },
        { label: 'John Doe 4', value: 'john4' },
      ]"
    />
  </Dialog>
</template>
