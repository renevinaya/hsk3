import { WORDS_BY_ID, CHARACTERS_BY_ID, type Word, type Character } from './words.ts'
import type { RoundItem } from './round.ts'
import type { Progress } from './srs.ts'
import { NO_STREAK, type Streak } from './streak.ts'

const PROGRESS_KEY = 'hsk3.progress'
const ROUND_KEY = 'hsk3.round'
const STREAK_KEY = 'hsk3.streak'
const WRITING_PROGRESS_KEY = 'hsk3.writing'
// Handwriting used to have rounds of its own
const OLD_WRITING_ROUND_KEY = 'hsk3.writingRound'

export interface Round {
  items: RoundItem[]
  index: number // the next item to ask
  score: number
  mistakes: RoundItem[]
  pinyinCorrect: boolean | null // the pinyin answer to the next item, if it is given already
}

type StoredItem =
  | { kind: 'word'; word: string; choices: string[]; pinyinChoices: string[] }
  | { kind: 'writing'; character: string; word: string }

interface StoredRound {
  items: StoredItem[]
  index: number
  score: number
  mistakes: number[] // positions in items
  pinyinCorrect: boolean | null
}

// A round saved before handwriting was part of the rounds: words only
interface OldStoredRound {
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

function characterById(id: string): Character {
  const character = CHARACTERS_BY_ID.get(id)
  if (!character) throw new Error(`Unknown character ${id}`)
  return character
}

function readProgress(key: string): Progress {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as Progress
  } catch {
    return {}
  }
}

export function loadProgress(): Progress {
  return readProgress(PROGRESS_KEY)
}

export function saveProgress(progress: Progress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

export function clearProgress(): void {
  localStorage.removeItem(PROGRESS_KEY)
}

export function loadWritingProgress(): Progress {
  return readProgress(WRITING_PROGRESS_KEY)
}

export function saveWritingProgress(progress: Progress): void {
  localStorage.setItem(WRITING_PROGRESS_KEY, JSON.stringify(progress))
}

export function clearWritingProgress(): void {
  localStorage.removeItem(WRITING_PROGRESS_KEY)
}

function storeItem(item: RoundItem): StoredItem {
  if (item.kind === 'writing') {
    return { kind: 'writing', character: item.question.character.id, word: item.question.word.id }
  }
  const { word, choices, pinyinChoices } = item.question
  return { kind: 'word', word: word.id, choices: choices.map(c => c.id), pinyinChoices }
}

function loadItem(item: StoredItem): RoundItem {
  if (item.kind === 'writing') {
    return { kind: 'writing', question: { character: characterById(item.character), word: wordById(item.word) } }
  }
  return {
    kind: 'word',
    question: { word: wordById(item.word), choices: item.choices.map(wordById), pinyinChoices: item.pinyinChoices },
  }
}

function upgrade(old: OldStoredRound): StoredRound {
  return {
    items: old.questions.map(q => ({ kind: 'word', word: q.word, choices: q.choices, pinyinChoices: q.pinyinChoices ?? [] })),
    index: old.index,
    score: old.score,
    mistakes: old.mistakes.map(id => old.questions.findIndex(q => q.word === id)),
    pinyinCorrect: old.pinyinCorrect ?? null,
  }
}

export function loadRound(): Round | null {
  localStorage.removeItem(OLD_WRITING_ROUND_KEY)
  try {
    const saved = JSON.parse(localStorage.getItem(ROUND_KEY) ?? 'null') as StoredRound | OldStoredRound | null
    if (!saved) return null
    const stored = 'items' in saved ? saved : upgrade(saved)
    const items = stored.items.map(loadItem)
    return {
      items,
      index: stored.index,
      score: stored.score,
      mistakes: stored.mistakes.map(i => {
        if (!items[i]) throw new Error(`No item ${i}`)
        return items[i]
      }),
      pinyinCorrect: stored.pinyinCorrect,
    }
  } catch {
    // Unreadable, or saved for words that are no longer in the list: start a new round instead
    return null
  }
}

export function saveRound(round: Round): void {
  const stored: StoredRound = {
    items: round.items.map(storeItem),
    index: round.index,
    score: round.score,
    mistakes: round.mistakes.map(item => round.items.indexOf(item)),
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
