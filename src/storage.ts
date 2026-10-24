import { WORDS_BY_ID, type Word } from './words.ts'
import type { Question } from './quiz.ts'
import type { Progress } from './srs.ts'

const PROGRESS_KEY = 'hsk3.progress'
const ROUND_KEY = 'hsk3.round'

export interface Round {
  questions: Question[]
  index: number // the next question to ask
  score: number
  mistakes: Word[]
}

interface StoredRound {
  questions: { word: string; choices: string[] }[]
  index: number
  score: number
  mistakes: string[]
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
      questions: stored.questions.map(q => ({ word: wordById(q.word), choices: q.choices.map(wordById) })),
      index: stored.index,
      score: stored.score,
      mistakes: stored.mistakes.map(wordById),
    }
  } catch {
    // Unreadable, or saved for words that are no longer in the list: start a new round instead
    return null
  }
}

export function saveRound(round: Round): void {
  const stored: StoredRound = {
    questions: round.questions.map(q => ({ word: q.word.id, choices: q.choices.map(c => c.id) })),
    index: round.index,
    score: round.score,
    mistakes: round.mistakes.map(w => w.id),
  }
  localStorage.setItem(ROUND_KEY, JSON.stringify(stored))
}

export function clearRound(): void {
  localStorage.removeItem(ROUND_KEY)
}
