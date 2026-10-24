<script setup lang="ts">
import { computed } from 'vue'
import { currentStreak, type Streak } from './streak.ts'
import { today } from './srs.ts'
import { ui, type language } from './translations.ts'

const props = defineProps<{ streak: Streak; language: language }>()

const doneToday = computed(() => props.streak.last === today())
const count = computed(() => currentStreak(props.streak, today()))

const hint = computed(() => {
  if (doneToday.value) return ui['streakDone'][props.language]
  return ui[count.value ? 'streakKeep' : 'streakStart'][props.language]
})
</script>

<template>
  <div class="streak">
    <p class="title is-2 mb-1">
      <span class="streak-flame" :class="{ pending: !doneToday }" aria-hidden="true">🔥</span> {{ count }}
    </p>
    <p class="has-text-weight-semibold">{{ ui[count === 1 ? 'streakDay' : 'streakDays'][language] }}</p>
    <p class="is-size-7">
      {{ hint }}
      <template v-if="streak.best > 1"> · {{ ui['streakBest'][language].replace('{n}', String(streak.best)) }}</template>
    </p>
  </div>
</template>

<style scoped lang="scss">
.streak {
  margin: 1.5rem 0;
}

.streak-flame.pending {
  filter: grayscale(1);
  opacity: 0.4;
}
</style>
