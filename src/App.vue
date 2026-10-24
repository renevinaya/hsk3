<script setup lang="ts">
import Quiz from './Quiz.vue'
import { ref, type Ref, computed, watch } from 'vue'
import { getBrowserLanguage, displayNames, ui, type language } from './translations.ts'

const LANG_KEY = 'hsk3.language'
const stored = localStorage.getItem(LANG_KEY)
const initial: language = stored && stored in displayNames ? stored as language : getBrowserLanguage()
const language: Ref<language> = ref(initial)
watch(language, (lang) => localStorage.setItem(LANG_KEY, lang))
const t = computed(() => {
  const lang = language.value
  return (key: string) => ui[key][lang]
})
</script>

<template>
  <header class="hero is-primary">
    <div class="hero-body">
      <div class="level">
        <div class="level-left">
          <h1 class="title">HSK 3 词汇</h1>
        </div>
        <div class="level-right">
          <div class="level is-mobile">
            <div class="level-item" v-for="(name, key) in displayNames" :key="key">
              <button
                class="button"
                :class="[language === key ? 'is-outlined' : 'is-primary']"
                v-text="name"
                @click="language = (key as language)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
  <section class="section">
    <Quiz :language="language" />
  </section>
  <footer class="hero is-link is-small">
    <div class="hero-body has-text-centered has-text-white">
      <p>{{ t('madeBy') }} <a href="https://github.com/renevinaya" class="has-text-white">René Mueller</a> &mdash; <a href="https://github.com/renevinaya/hsk3" class="has-text-white">{{ t('viewOnGithub') }}</a></p>
    </div>
  </footer>
</template>
