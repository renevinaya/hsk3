<script setup lang="ts">
import type { Summary } from './srs.ts'
import { ui, type language } from './translations.ts'

defineProps<{ summary: Summary; language: language }>()

const KEYS = ['due', 'unseen', 'learning', 'known'] as const
</script>

<template>
  <div class="level is-mobile stats">
    <div v-for="key in KEYS" :key="key" class="level-item has-text-centered">
      <div>
        <p class="is-size-7 is-uppercase has-text-weight-semibold">{{ ui[key][language] }}</p>
        <p class="title is-4">{{ summary[key] }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.stats {
  margin: 1.5rem 0;
}
</style>
