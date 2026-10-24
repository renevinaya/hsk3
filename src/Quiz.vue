<script setup lang="ts">
import { ref, computed } from 'vue'
import { WORDS, type Word } from './words.ts'
import { buildRound, quizMeaning, WORDS_PER_ROUND, type Question } from './quiz.ts'
import { review, summarize, today, type Progress } from './srs.ts'
import { loadProgress, saveProgress, clearProgress, loadRound, saveRound, clearRound } from './storage.ts'
import Stats from './Stats.vue'
import { ui, type language } from './translations.ts'

const props = defineProps<{ language: language }>()

const WORD_IDS = WORDS.map(word => word.id)

const progress = ref<Progress>(loadProgress())
const questions = ref<Question[]>([])
const currentIndex = ref(0)
const score = ref(0)
const mistakes = ref<Word[]>([])
const phase = ref<'start' | 'playing' | 'answered' | 'gameover'>('start')
const selectedId = ref<string | null>(null)
let advanceTimer: ReturnType<typeof setTimeout> | null = null

// Pick up an unfinished round where it was left
const savedRound = loadRound()
if (savedRound) {
  questions.value = savedRound.questions
  currentIndex.value = savedRound.index
  score.value = savedRound.score
  mistakes.value = savedRound.mistakes
  phase.value = 'playing'
}

const CONFETTI_COLORS = ['#C8102E', '#FFD700', '#FFB300', '#E53935', '#FFFFFF', '#FF7043']

const confettiPieces = computed(() => {
  if (phase.value !== 'gameover' || score.value / questions.value.length <= 0.85) return []
  return Array.from({ length: 60 }, (_, i): Record<string, string> => ({
    left: `${((i * 61.8) % 100).toFixed(1)}%`,
    width: `${6 + (i * 3) % 7}px`,
    height: `${8 + (i * 5) % 9}px`,
    backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    '--cdelay': `${(i * 0.03).toFixed(2)}s`,
    '--cduration': `${(1.6 + ((i * 37) % 80) / 100).toFixed(2)}s`,
    '--cdrift': `${-50 + (i * 13) % 100}px`,
  }))
})

const currentQuestion = computed<Question | null>(
  () => questions.value[currentIndex.value] ?? null
)

const summary = computed(() => summarize(WORD_IDS, progress.value, today()))

const introText = computed(() =>
  ui['intro'][props.language].replace('{n}', String(WORDS_PER_ROUND))
)

function buttonClass(choice: Word): string {
  if (selectedId.value === null) return ''
  if (choice.id === currentQuestion.value?.word.id) return 'is-success'
  if (choice.id === selectedId.value) return 'is-danger'
  return ''
}

function saveState(nextIndex: number): void {
  saveProgress(progress.value)
  if (nextIndex >= questions.value.length) {
    clearRound()
  } else {
    saveRound({ questions: questions.value, index: nextIndex, score: score.value, mistakes: mistakes.value })
  }
}

function startGame(): void {
  questions.value = buildRound(progress.value)
  currentIndex.value = 0
  score.value = 0
  mistakes.value = []
  selectedId.value = null
  phase.value = 'playing'
  saveState(0)
}

function selectAnswer(choice: Word): void {
  const word = currentQuestion.value?.word
  if (phase.value !== 'playing' || !word) return
  selectedId.value = choice.id
  const correct = choice.id === word.id
  if (correct) {
    score.value++
  } else {
    mistakes.value.push(word)
  }
  progress.value[word.id] = review(progress.value[word.id], correct, today())
  saveState(currentIndex.value + 1)
  phase.value = 'answered'
  // Leave a wrong answer up longer, so the right one can be read
  advanceTimer = setTimeout(() => advance(), correct ? 1500 : 3500)
}

function advance(): void {
  if (advanceTimer !== null) {
    clearTimeout(advanceTimer)
    advanceTimer = null
  }
  const next = currentIndex.value + 1
  if (next >= questions.value.length) {
    phase.value = 'gameover'
  } else {
    currentIndex.value = next
    selectedId.value = null
    phase.value = 'playing'
  }
}

function resetProgress(): void {
  if (!confirm(ui['resetConfirm'][props.language])) return
  progress.value = {}
  clearProgress()
}
</script>

<template>
  <div v-if="phase === 'start'" class="quiz-layout has-text-centered">
    <h2 class="title is-3 mb-4">{{ ui['tagline'][language] }}</h2>
    <p class="mb-5">{{ introText }}</p>
    <Stats :summary="summary" :language="language" />
    <button class="button is-primary is-large" @click="startGame">{{ ui['startBtn'][language] }}</button>
    <p class="mt-6">
      <button class="button is-small is-danger is-outlined" @click="resetProgress">{{ ui['reset'][language] }}</button>
    </p>
  </div>

  <div v-else-if="phase === 'playing' || phase === 'answered'" class="quiz-layout">
    <div class="quiz-score">{{ score }} / {{ questions.length }}</div>
    <progress class="progress is-primary is-small" :value="currentIndex" :max="questions.length"></progress>

    <div v-if="currentQuestion" class="word-card">
      <span class="tag word-level">HSK {{ currentQuestion.word.level }}</span>
      <p class="hanzi" lang="zh-CN">{{ currentQuestion.word.hanzi }}</p>
      <p class="pinyin" :class="{ revealed: phase === 'answered' }">{{ currentQuestion.word.pinyin }}</p>
    </div>

    <h2 class="title is-5 has-text-centered mb-4">{{ ui['question'][language] }}</h2>

    <div v-if="currentQuestion" class="columns is-multiline">
      <div
        v-for="choice in currentQuestion.choices"
        :key="choice.id"
        class="column is-half"
      >
        <button
          class="button is-fullwidth answer-btn"
          :class="buttonClass(choice)"
          @click="selectAnswer(choice)"
        >
          <span>{{ quizMeaning(choice.meaning) }}</span>
          <span v-if="phase === 'answered'" class="answer-word" lang="zh-CN">{{ choice.hanzi }} · {{ choice.pinyin }}</span>
        </button>
      </div>
    </div>
  </div>

  <div v-else-if="phase === 'gameover'" class="quiz-layout has-text-centered">
    <h2 class="title is-3 mb-4">{{ ui['complete'][language] }}</h2>
    <p class="title is-1 mb-5">{{ score }} / {{ questions.length }}</p>
    <div v-if="mistakes.length" class="mb-5">
      <h3 class="title is-5">{{ ui['mistakes'][language] }}</h3>
      <table class="table is-fullwidth mistakes">
        <tbody>
          <tr v-for="word in mistakes" :key="word.id">
            <td class="mistake-hanzi" lang="zh-CN">{{ word.hanzi }}</td>
            <td>{{ word.pinyin }}</td>
            <td>{{ word.meaning }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <Stats :summary="summary" :language="language" />
    <button class="button is-primary is-large" @click="startGame">{{ ui['playAgain'][language] }}</button>
  </div>

  <div v-if="confettiPieces.length" class="confetti-container" aria-hidden="true">
    <div
      v-for="(piece, i) in confettiPieces"
      :key="i"
      class="confetti-piece"
      :style="piece"
    ></div>
  </div>
</template>

<style scoped lang="scss">
$hanzi-font: "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif;

.quiz-layout {
  max-width: 640px;
  margin: 0 auto;
  padding: 1rem;
}

.quiz-score {
  text-align: right;
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 0.75rem;
}

.word-card {
  position: relative;
  text-align: center;
  padding: 2rem 1rem 1.25rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.word-level {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
}

.hanzi {
  font-family: $hanzi-font;
  font-size: 4.5rem;
  line-height: 1.2;
}

.pinyin {
  font-size: 1.5rem;
  visibility: hidden;
  &.revealed {
    visibility: visible;
  }
}

.answer-btn {
  height: auto;
  min-height: 3.5rem;
  white-space: normal;
  flex-direction: column;
}

.answer-word {
  font-family: $hanzi-font;
  font-size: 0.9rem;
  opacity: 0.8;
}

.mistakes {
  text-align: left;
}

.mistake-hanzi {
  font-family: $hanzi-font;
  font-size: 1.25rem;
  white-space: nowrap;
}

.confetti-container {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 100;
}

.confetti-piece {
  position: absolute;
  top: -12px;
  border-radius: 2px;
  animation: confetti-fall var(--cduration) var(--cdelay) ease-in both;
}

@keyframes confetti-fall {
  0% {
    transform: translateY(0) translateX(0) rotate(0deg);
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) translateX(var(--cdrift)) rotate(540deg);
    opacity: 0;
  }
}
</style>
