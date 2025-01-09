<template>
  <Story :layout="{ type: 'grid', width: 500 }">
    <Variant title="Combobox basic">
      <div class="p-2 min-h-96">
        <Combobox :options="options" v-model="selectedValue" />
      </div>
    </Variant>
  </Story>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import Combobox from './Combobox.vue'

let selectedValue = ref(null)
let options = [
  'Apple',
  'Banana',
  'Cherry',
  'Date',
  'Elderberry',
  'Fig',
  'Grape',
  'Honeydew',
  'Icaco',
]
</script>
