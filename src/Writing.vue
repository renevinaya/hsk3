<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import HanziWriter from 'hanzi-writer'
import { buildWritingRound, cells, type WritingQuestion } from './writing.ts'
import { quizMeaning } from './quiz.ts'
import { review, today, type Progress } from './srs.ts'
import { loadWritingProgress, saveWritingProgress, loadWritingRound, saveWritingRound, clearWritingRound } from './storage.ts'
import type { Streak } from './streak.ts'
import StreakInfo from './StreakInfo.vue'
import { ui, type language } from './translations.ts'

const props = defineProps<{ language: language; streak: Streak }>()
const emit = defineEmits<{ finished: []; exit: [] }>()

// A stroke that is still wrong after this many tries is shown, and the character counts as not known
const HINT_AFTER_MISSES = 3

const progress = ref<Progress>(loadWritingProgress())
const questions = ref<WritingQuestion[]>([])
const currentIndex = ref(0)
const score = ref(0)
const mistakes = ref<WritingQuestion[]>([])
// A new character shows its stroke order first (demo)
const phase = ref<'loading' | 'demo' | 'writing' | 'answered' | 'gameover'>('loading')
const correct = ref(false)
const loadFailed = ref(false)
const target = ref<HTMLDivElement | null>(null)
let writer: HanziWriter | null = null
let neededHint = false
let advanceTimer: ReturnType<typeof setTimeout> | null = null

function saveState(index: number): void {
  saveWritingProgress(progress.value)
  if (index >= questions.value.length) {
    clearWritingRound()
  } else {
    saveWritingRound({ questions: questions.value, index, score: score.value, mistakes: mistakes.value })
  }
}

function startRound(): void {
  questions.value = buildWritingRound(progress.value)
  currentIndex.value = 0
  score.value = 0
  mistakes.value = []
  saveState(0)
}

// Pick up an unfinished round where it was left
const savedRound = loadWritingRound()
if (savedRound) {
  questions.value = savedRound.questions
  currentIndex.value = savedRound.index
  score.value = savedRound.score
  mistakes.value = savedRound.mistakes
} else {
  startRound()
}

const currentQuestion = computed<WritingQuestion | null>(
  () => questions.value[currentIndex.value] ?? null
)

const currentCells = computed(() => currentQuestion.value ? cells(currentQuestion.value) : [])

const status = computed(() => {
  if (loadFailed.value) return ui['writingError'][props.language]
  if (phase.value === 'demo') return ui['writingDemo'][props.language]
  if (phase.value === 'answered') return ui[correct.value ? 'writingRight' : 'writingHint'][props.language]
  return ui['writingPrompt'][props.language]
})

async function ask(): Promise<void> {
  const question = currentQuestion.value
  if (!question || !writer) return
  neededHint = false
  phase.value = 'loading'
  await writer.setCharacter(question.character.id)
  if (progress.value[question.character.id]) {
    startQuiz()
  } else {
    phase.value = 'demo'
    writer.animateCharacter({ onComplete: ({ canceled }) => { if (!canceled) startQuiz() } })
  }
}

function startQuiz(): void {
  phase.value = 'writing'
  writer?.quiz({
    showHintAfterMisses: HINT_AFTER_MISSES,
    onMistake: stroke => { if (stroke.mistakesOnStroke >= HINT_AFTER_MISSES) neededHint = true },
    onComplete: () => answer(!neededHint),
  })
}

function answer(isCorrect: boolean): void {
  const question = currentQuestion.value
  if (!question) return
  correct.value = isCorrect
  if (isCorrect) {
    score.value++
  } else {
    mistakes.value.push(question)
  }
  progress.value[question.character.id] = review(progress.value[question.character.id], isCorrect, today())
  saveState(currentIndex.value + 1)
  if (currentIndex.value + 1 >= questions.value.length) emit('finished')
  phase.value = 'answered'
  // Leave a character that needed a hint up longer, so it can be looked at
  advanceTimer = setTimeout(() => advance(), isCorrect ? 1500 : 3500)
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
    ask()
  }
}

function nextRound(): void {
  startRound()
  ask()
}

onMounted(() => {
  if (!target.value || !currentQuestion.value) return
  const size = target.value.clientWidth
  writer = HanziWriter.create(target.value, currentQuestion.value.character.id, {
    width: size,
    height: size,
    padding: 12,
    showCharacter: false,
    showOutline: false,
    delayBetweenStrokes: 300,
    strokeColor: '#363636',
    drawingColor: '#363636',
    highlightCompleteColor: '#40d47e',
    onLoadCharDataError: () => { loadFailed.value = true },
  })
  ask()
})

onBeforeUnmount(() => {
  if (advanceTimer !== null) clearTimeout(advanceTimer)
  writer?.cancelQuiz()
})
</script>

<template>
  <div v-show="phase !== 'gameover'" class="quiz-layout" :data-phase="phase">
    <div class="quiz-score">{{ score }} / {{ questions.length }}</div>
    <progress class="progress is-primary is-small" :value="currentIndex" :max="questions.length"></progress>

    <div v-if="currentQuestion" class="word-card">
      <span class="tag word-level">HSK {{ currentQuestion.character.level === 3 ? '3' : '1–2' }}</span>
      <p class="context" lang="zh-CN">
        <span v-for="(cell, i) in currentCells" :key="i" class="cell">
          <span class="cell-pinyin">{{ cell.pinyin }}</span>
          <span v-if="cell.hanzi" class="cell-hanzi">{{ cell.hanzi }}</span>
          <span v-else class="cell-hanzi gap">{{ phase === 'answered' ? currentQuestion.character.id : '' }}</span>
        </span>
      </p>
      <p class="meaning">{{ quizMeaning(currentQuestion.word.meaning) }}</p>
    </div>

    <h2 class="title is-5 has-text-centered mb-4">{{ status }}</h2>

    <div class="writer-box">
      <svg class="writer-grid" viewBox="0 0 100 100" aria-hidden="true">
        <rect x="0.5" y="0.5" width="99" height="99" />
        <line x1="50" y1="0" x2="50" y2="100" />
        <line x1="0" y1="50" x2="100" y2="50" />
        <line x1="0" y1="0" x2="100" y2="100" />
        <line x1="100" y1="0" x2="0" y2="100" />
      </svg>
      <div ref="target" class="writer"></div>
    </div>
  </div>

  <div v-if="phase === 'gameover'" class="quiz-layout has-text-centered">
    <h2 class="title is-3 mb-4">{{ ui['complete'][language] }}</h2>
    <p class="title is-1 mb-5">{{ score }} / {{ questions.length }}</p>
    <div v-if="mistakes.length" class="mb-5">
      <h3 class="title is-5">{{ ui['writingReview'][language] }}</h3>
      <table class="table is-fullwidth mistakes">
        <tbody>
          <tr v-for="question in mistakes" :key="question.character.id">
            <td class="mistake-hanzi" lang="zh-CN">{{ question.character.id }}</td>
            <td class="mistake-word" lang="zh-CN">{{ question.word.hanzi }}</td>
            <td>{{ question.word.pinyin }}</td>
            <td>{{ question.word.meaning }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <StreakInfo :streak="streak" :language="language" />
    <div class="buttons is-centered">
      <button class="button is-primary is-large" @click="nextRound">{{ ui['playAgain'][language] }}</button>
      <button class="button is-large" @click="emit('exit')">{{ ui['back'][language] }}</button>
    </div>
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

.context {
  display: flex;
  justify-content: center;
  gap: 0.25rem;
  font-family: $hanzi-font;
}

.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cell-pinyin {
  min-height: 1.5rem;
  font-size: 1.1rem;
}

.cell-hanzi {
  font-size: 3rem;
  line-height: 1.2;
  height: 1.2em;
  min-width: 1.2em;
  &.gap {
    border-bottom: 3px solid currentColor;
  }
}

.meaning {
  margin-top: 0.5rem;
}

.writer-box {
  position: relative;
  width: 100%;
  max-width: 300px;
  aspect-ratio: 1;
  margin: 0 auto;
  // Drawing must not scroll the page
  touch-action: none;
}

.writer-grid {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  fill: none;
  stroke: #ccc;
  stroke-width: 0.5;
  stroke-dasharray: 2 2;
  rect {
    stroke-dasharray: none;
  }
}

.writer {
  position: relative;
  width: 100%;
  height: 100%;
}

.mistakes {
  text-align: left;
}

.mistake-hanzi {
  font-family: $hanzi-font;
  font-size: 1.25rem;
  white-space: nowrap;
}

.mistake-word {
  font-family: $hanzi-font;
  white-space: nowrap;
}
</style>
