<script setup lang="ts">
import { reactive } from 'vue'
import Alert from './Alert.vue'

const state = reactive({
  title: 'Alert Title',
  type: 'warning' as const,
  content:
    'This is an alert message with some important information that users need to be aware of.',
})

const types = ['warning']
</script>

<template>
  <Story :layout="{ type: 'grid', width: 600 }">
    <Variant title="Default">
      <Alert v-bind="state">
        {{ state.content }}
      </Alert>
    </Variant>

    <Variant title="With Actions">
      <Alert v-bind="state">
        {{ state.content }}
        <template #actions>
          <button class="text-sm font-medium text-blue-600 hover:text-blue-500">
            Action
          </button>
        </template>
      </Alert>
    </Variant>

    <Variant title="Without Title">
      <Alert :type="state.type">
        {{ state.content }}
      </Alert>
    </Variant>

    <template #controls>
      <HstText v-model="state.title" title="Title" />
      <HstSelect v-model="state.type" :options="types" title="Type" />
      <HstTextarea v-model="state.content" title="Content" />
    </template>
  </Story>
</template>
