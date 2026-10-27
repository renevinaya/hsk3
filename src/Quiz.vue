<script setup lang="ts">
import { ref, computed } from 'vue'
import { WORDS, CHARACTERS, type Word } from './words.ts'
import { quizMeaning, quizPinyin, WORDS_PER_ROUND, type Question } from './quiz.ts'
import { CHARACTERS_PER_ROUND, type WritingQuestion as WritingQuestionData } from './writing.ts'
import { buildRound, type RoundItem } from './round.ts'
import { review, summarize, today, type Progress } from './srs.ts'
import { recordRound, NO_STREAK } from './streak.ts'
import {
  loadProgress, saveProgress, clearProgress, loadWritingProgress, saveWritingProgress, clearWritingProgress,
  loadRound, saveRound, clearRound, loadStreak, saveStreak, clearStreak,
} from './storage.ts'
import Stats from './Stats.vue'
import StreakInfo from './StreakInfo.vue'
import WritingQuestion from './WritingQuestion.vue'
import { ui, type language } from './translations.ts'

const props = defineProps<{ language: language }>()

const WORD_IDS = WORDS.map(word => word.id)
const CHARACTER_IDS = CHARACTERS.map(character => character.id)

const progress = ref<Progress>(loadProgress())
const writingProgress = ref<Progress>(loadWritingProgress())
const streak = ref(loadStreak())
const items = ref<RoundItem[]>([])
const currentIndex = ref(0)
const score = ref(0)
const mistakes = ref<RoundItem[]>([])
const phase = ref<'start' | 'playing' | 'answered' | 'gameover'>('start')
// Well-known words ask for the pinyin before the meaning
const step = ref<'pinyin' | 'meaning'>('meaning')
const selectedId = ref<string | null>(null)
const selectedPinyin = ref<string | null>(null)
const pinyinCorrect = ref<boolean | null>(null)
let advanceTimer: ReturnType<typeof setTimeout> | null = null

function firstStep(item: RoundItem | undefined): 'pinyin' | 'meaning' {
  return item?.kind === 'word' && item.question.pinyinChoices.length ? 'pinyin' : 'meaning'
}

// Pick up an unfinished round where it was left
const savedRound = loadRound()
if (savedRound) {
  items.value = savedRound.items
  currentIndex.value = savedRound.index
  score.value = savedRound.score
  mistakes.value = savedRound.mistakes
  pinyinCorrect.value = savedRound.pinyinCorrect
  step.value = savedRound.pinyinCorrect === null ? firstStep(savedRound.items[savedRound.index]) : 'meaning'
  phase.value = 'playing'
}

const CONFETTI_COLORS = ['#C8102E', '#FFD700', '#FFB300', '#E53935', '#FFFFFF', '#FF7043']

const confettiPieces = computed(() => {
  if (phase.value !== 'gameover' || score.value / items.value.length <= 0.85) return []
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

const currentItem = computed<RoundItem | null>(() => items.value[currentIndex.value] ?? null)

const currentQuestion = computed<Question | null>(
  () => currentItem.value?.kind === 'word' ? currentItem.value.question : null
)

const currentWriting = computed<WritingQuestionData | null>(
  () => currentItem.value?.kind === 'writing' ? currentItem.value.question : null
)

const correctPinyin = computed(() => quizPinyin(currentQuestion.value?.word.pinyin ?? ''))

const pinyinRevealed = computed(() => phase.value === 'answered' || pinyinCorrect.value !== null)

const wordMistakes = computed(() => mistakes.value.flatMap(item => item.kind === 'word' ? [item.question.word] : []))

const writingMistakes = computed(() => mistakes.value.flatMap(item => item.kind === 'writing' ? [item.question] : []))

const summary = computed(() => summarize(WORD_IDS, progress.value, today()))

const writingSummary = computed(() => summarize(CHARACTER_IDS, writingProgress.value, today()))

const introText = computed(() =>
  ui['intro'][props.language].replace('{w}', String(WORDS_PER_ROUND)).replace('{c}', String(CHARACTERS_PER_ROUND))
)

function buttonClass(option: string, correct: string | undefined, selected: string | null): string {
  if (selected === null) return ''
  if (option === correct) return 'is-success'
  if (option === selected) return 'is-danger'
  return ''
}

function saveState(index: number): void {
  saveProgress(progress.value)
  saveWritingProgress(writingProgress.value)
  if (index >= items.value.length) {
    clearRound()
  } else {
    saveRound({ items: items.value, index, score: score.value, mistakes: mistakes.value, pinyinCorrect: pinyinCorrect.value })
  }
}

function scheduleAdvance(correct: boolean): void {
  // Leave a wrong answer up longer, so the right one can be read
  advanceTimer = setTimeout(() => advance(), correct ? 1500 : 3500)
}

function startGame(): void {
  items.value = buildRound(progress.value, writingProgress.value)
  currentIndex.value = 0
  score.value = 0
  mistakes.value = []
  selectedId.value = null
  selectedPinyin.value = null
  pinyinCorrect.value = null
  step.value = firstStep(items.value[0])
  phase.value = 'playing'
  saveState(0)
}

// Counts the answer to the current item, saves everything and moves on after a moment
function finishItem(correct: boolean, showLonger: boolean): void {
  if (correct) {
    score.value++
  } else if (currentItem.value) {
    mistakes.value.push(currentItem.value)
  }
  if (currentIndex.value + 1 >= items.value.length) recordStreak()
  saveState(currentIndex.value + 1)
  phase.value = 'answered'
  scheduleAdvance(!showLonger)
}

function selectPinyin(pinyin: string): void {
  if (phase.value !== 'playing' || step.value !== 'pinyin') return
  selectedPinyin.value = pinyin
  pinyinCorrect.value = pinyin === correctPinyin.value
  saveState(currentIndex.value)
  phase.value = 'answered'
  scheduleAdvance(pinyinCorrect.value)
}

function selectAnswer(choice: Word): void {
  const word = currentQuestion.value?.word
  if (phase.value !== 'playing' || step.value !== 'meaning' || !word) return
  selectedId.value = choice.id
  const meaningCorrect = choice.id === word.id
  // A word with a pinyin step only counts as right if both answers are
  const correct = meaningCorrect && pinyinCorrect.value !== false
  progress.value[word.id] = review(progress.value[word.id], correct, today())
  pinyinCorrect.value = null
  finishItem(correct, !meaningCorrect)
}

function answerWriting(correct: boolean): void {
  const character = currentWriting.value?.character
  if (phase.value !== 'playing' || !character) return
  writingProgress.value[character.id] = review(writingProgress.value[character.id], correct, today())
  // Leave a character that needed a hint up longer, so it can be looked at
  finishItem(correct, !correct)
}

function advance(): void {
  if (advanceTimer !== null) {
    clearTimeout(advanceTimer)
    advanceTimer = null
  }
  if (step.value === 'pinyin') {
    step.value = 'meaning'
    phase.value = 'playing'
    return
  }
  const next = currentIndex.value + 1
  if (next >= items.value.length) {
    phase.value = 'gameover'
  } else {
    currentIndex.value = next
    selectedId.value = null
    selectedPinyin.value = null
    step.value = firstStep(items.value[next])
    phase.value = 'playing'
  }
}

function recordStreak(): void {
  streak.value = recordRound(streak.value, today())
  saveStreak(streak.value)
}

function resetProgress(): void {
  if (!confirm(ui['resetConfirm'][props.language])) return
  progress.value = {}
  clearProgress()
  writingProgress.value = {}
  clearWritingProgress()
  streak.value = NO_STREAK
  clearStreak()
}
</script>

<template>
  <div v-if="phase === 'start'" class="quiz-layout has-text-centered">
    <h2 class="title is-3 mb-4">{{ ui['tagline'][language] }}</h2>
    <p class="mb-5">{{ introText }}</p>
    <StreakInfo :streak="streak" :language="language" />
    <h3 class="title is-5 mt-5 mb-0">{{ ui['wordsTitle'][language] }}</h3>
    <Stats :summary="summary" :language="language" />
    <h3 class="title is-5 mb-0">{{ ui['writingTitle'][language] }}</h3>
    <Stats :summary="writingSummary" :language="language" />
    <button class="button is-primary is-large" @click="startGame">{{ ui['startBtn'][language] }}</button>
    <p class="mt-6">
      <button class="button is-small is-danger is-outlined" @click="resetProgress">{{ ui['reset'][language] }}</button>
    </p>
  </div>

  <div v-else-if="phase === 'playing' || phase === 'answered'" class="quiz-layout">
    <div class="quiz-score">{{ score }} / {{ items.length }}</div>
    <progress class="progress is-primary is-small" :value="currentIndex" :max="items.length"></progress>

    <WritingQuestion
      v-if="currentWriting"
      :key="currentIndex"
      :question="currentWriting"
      :is-new="!writingProgress[currentWriting.character.id]"
      :language="language"
      @answer="answerWriting"
    />

    <template v-else-if="currentQuestion">
      <div class="word-card">
        <span class="tag word-level">HSK {{ currentQuestion.word.level }}</span>
        <p class="hanzi" lang="zh-CN">{{ currentQuestion.word.hanzi }}</p>
        <p class="pinyin" :class="{ revealed: pinyinRevealed }">{{ currentQuestion.word.pinyin }}</p>
      </div>

      <h2 class="title is-5 has-text-centered mb-4">{{ ui[step === 'pinyin' ? 'questionPinyin' : 'question'][language] }}</h2>

      <div v-if="step === 'pinyin'" class="columns is-multiline">
        <div
          v-for="pinyin in currentQuestion.pinyinChoices"
          :key="pinyin"
          class="column is-half"
        >
          <button
            class="button is-fullwidth answer-btn pinyin-btn"
            :class="buttonClass(pinyin, correctPinyin, selectedPinyin)"
            @click="selectPinyin(pinyin)"
          >{{ pinyin }}</button>
        </div>
      </div>

      <div v-else class="columns is-multiline">
        <div
          v-for="choice in currentQuestion.choices"
          :key="choice.id"
          class="column is-half"
        >
          <button
            class="button is-fullwidth answer-btn"
            :class="buttonClass(choice.id, currentQuestion.word.id, selectedId)"
            @click="selectAnswer(choice)"
          >
            <span>{{ quizMeaning(choice.meaning[language]) }}</span>
            <span v-if="phase === 'answered'" class="answer-word" lang="zh-CN">{{ choice.hanzi }} · {{ choice.pinyin }}</span>
          </button>
        </div>
      </div>
    </template>
  </div>

  <div v-else-if="phase === 'gameover'" class="quiz-layout has-text-centered">
    <h2 class="title is-3 mb-4">{{ ui['complete'][language] }}</h2>
    <p class="title is-1 mb-5">{{ score }} / {{ items.length }}</p>
    <StreakInfo :streak="streak" :language="language" />
    <div v-if="wordMistakes.length" class="mb-5">
      <h3 class="title is-5">{{ ui['mistakes'][language] }}</h3>
      <table class="table is-fullwidth mistakes">
        <tbody>
          <tr v-for="word in wordMistakes" :key="word.id">
            <td class="mistake-hanzi" lang="zh-CN">{{ word.hanzi }}</td>
            <td>{{ word.pinyin }}</td>
            <td>{{ word.meaning[language] }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="writingMistakes.length" class="mb-5">
      <h3 class="title is-5">{{ ui['writingReview'][language] }}</h3>
      <table class="table is-fullwidth mistakes">
        <tbody>
          <tr v-for="question in writingMistakes" :key="question.character.id">
            <td class="mistake-hanzi" lang="zh-CN">{{ question.character.id }}</td>
            <td class="mistake-word" lang="zh-CN">{{ question.word.hanzi }}</td>
            <td>{{ question.word.pinyin }}</td>
            <td>{{ question.word.meaning[language] }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="buttons is-centered">
      <button class="button is-primary is-large" @click="startGame">{{ ui['playAgain'][language] }}</button>
      <button class="button is-large" @click="phase = 'start'">{{ ui['back'][language] }}</button>
    </div>
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

.pinyin-btn {
  font-size: 1.25rem;
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

.mistake-word {
  font-family: $hanzi-font;
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
