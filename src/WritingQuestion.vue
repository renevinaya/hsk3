<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import HanziWriter from 'hanzi-writer'
import { cells, type WritingQuestion } from './writing.ts'
import { quizMeaning } from './quiz.ts'
import { ui, type language } from './translations.ts'

const props = defineProps<{ question: WritingQuestion; isNew: boolean; language: language }>()
const emit = defineEmits<{ answer: [correct: boolean] }>()

// A stroke that is still wrong after this many tries is shown, and the character counts as not known
const HINT_AFTER_MISSES = 3

// A new character shows its stroke order first (demo)
const phase = ref<'loading' | 'demo' | 'writing' | 'answered'>('loading')
const correct = ref(false)
const loadFailed = ref(false)
const target = ref<HTMLDivElement | null>(null)
let writer: HanziWriter | null = null
let neededHint = false

const questionCells = computed(() => cells(props.question))

const status = computed(() => {
  if (loadFailed.value) return ui['writingError'][props.language]
  if (phase.value === 'demo') return ui['writingDemo'][props.language]
  if (phase.value === 'answered') return ui[correct.value ? 'writingRight' : 'writingHint'][props.language]
  return ui['writingPrompt'][props.language]
})

function startQuiz(): void {
  phase.value = 'writing'
  writer?.quiz({
    showHintAfterMisses: HINT_AFTER_MISSES,
    onMistake: stroke => { if (stroke.mistakesOnStroke >= HINT_AFTER_MISSES) neededHint = true },
    onComplete: () => {
      correct.value = !neededHint
      phase.value = 'answered'
      emit('answer', correct.value)
    },
  })
}

onMounted(() => {
  if (!target.value) return
  const size = target.value.clientWidth
  writer = HanziWriter.create(target.value, props.question.character.id, {
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
  if (props.isNew) {
    phase.value = 'demo'
    writer.animateCharacter({ onComplete: ({ canceled }) => { if (!canceled) startQuiz() } })
  } else {
    startQuiz()
  }
})

onBeforeUnmount(() => {
  writer?.cancelQuiz()
})
</script>

<template>
  <div :data-phase="phase">
    <div class="word-card">
      <span class="tag word-level">HSK {{ question.character.level === 3 ? '3' : '1–2' }}</span>
      <p class="context" lang="zh-CN">
        <span v-for="(cell, i) in questionCells" :key="i" class="cell">
          <span class="cell-pinyin">{{ cell.pinyin }}</span>
          <span v-if="cell.hanzi" class="cell-hanzi">{{ cell.hanzi }}</span>
          <span v-else class="cell-hanzi gap">{{ phase === 'answered' ? question.character.id : '' }}</span>
        </span>
      </p>
      <p class="meaning">{{ quizMeaning(question.word.meaning[language]) }}</p>
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
</template>

<style scoped lang="scss">
$hanzi-font: "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif;

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
</style>
