import { WORDS_BY_ID, type Word } from './words.ts'
import type { Question } from './quiz.ts'
import type { Progress } from './srs.ts'
import { NO_STREAK, type Streak } from './streak.ts'

const PROGRESS_KEY = 'hsk3.progress'
const ROUND_KEY = 'hsk3.round'
const STREAK_KEY = 'hsk3.streak'

export interface Round {
  questions: Question[]
  index: number // the next question to ask
  score: number
  mistakes: Word[]
  pinyinCorrect: boolean | null // the pinyin answer to the next question, if it is given already
}

interface StoredRound {
  questions: { word: string; choices: string[]; pinyinChoices?: string[] }[]
  index: number
  score: number
  mistakes: string[]
  pinyinCorrect?: boolean | null
}

function wordById(id: string): Word {
  const word = WORDS_BY_ID.get(id)
  if (!word) throw new Error(`Unknown word ${id}`)
  return word
}

export function loadProgress(): Progress {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}') as Progress
  } catch {
    return {}
  }
}

export function saveProgress(progress: Progress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

export function clearProgress(): void {
  localStorage.removeItem(PROGRESS_KEY)
}

export function loadRound(): Round | null {
  try {
    const stored = JSON.parse(localStorage.getItem(ROUND_KEY) ?? 'null') as StoredRound | null
    if (!stored) return null
    return {
      questions: stored.questions.map(q => ({
        word: wordById(q.word),
        choices: q.choices.map(wordById),
        pinyinChoices: q.pinyinChoices ?? [],
      })),
      index: stored.index,
      score: stored.score,
      mistakes: stored.mistakes.map(wordById),
      pinyinCorrect: stored.pinyinCorrect ?? null,
    }
  } catch {
    // Unreadable, or saved for words that are no longer in the list: start a new round instead
    return null
  }
}

export function saveRound(round: Round): void {
  const stored: StoredRound = {
    questions: round.questions.map(q => ({ word: q.word.id, choices: q.choices.map(c => c.id), pinyinChoices: q.pinyinChoices })),
    index: round.index,
    score: round.score,
    mistakes: round.mistakes.map(w => w.id),
    pinyinCorrect: round.pinyinCorrect,
  }
  localStorage.setItem(ROUND_KEY, JSON.stringify(stored))
}

export function clearRound(): void {
  localStorage.removeItem(ROUND_KEY)
}

export function loadStreak(): Streak {
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY) ?? 'null') as Streak | null ?? NO_STREAK
  } catch {
    return NO_STREAK
  }
}

export function saveStreak(streak: Streak): void {
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak))
}

export function clearStreak(): void {
  localStorage.removeItem(STREAK_KEY)
}
