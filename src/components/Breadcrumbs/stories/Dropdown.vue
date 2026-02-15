<script setup lang="ts">
import { Breadcrumbs } from 'frappe-ui'
</script>

<template>
  <Breadcrumbs
    :items="[
      { label: 'Home', href: '/' },
      {
        type: 'dropdown',
        label: (_item, activeOption) => activeOption?.label || 'Views',
        items: [
          { label: 'Views', href: '/components' },
          { label: 'Kanban', href: '/components/kanban' },
        ],
      },
      { label: 'List', href: '/components/breadcrumbs' },
    ]"
  />
</template>
