import { WORDS, type Word } from './words.ts'
import { today, type Progress } from './srs.ts'

export const WORDS_PER_ROUND = 30
export const CHOICES_PER_QUESTION = 4

export interface Question {
  word: Word
  choices: Word[]
}

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// The meaning as an answer option. Chinese examples are dropped because they often contain the word itself.
export function quizMeaning(meaning: string): string {
  return meaning
    .replace(/,? e\.g\. [^)\]]*/g, '')
    .replace(/ ?\([一-鿿… ]+\)/g, '')
    .replace(/\[HSK \d: ([^\]]*)\]/g, '$1')
}

function primaryPos(word: Word): string {
  return word.pos.split(', ')[0]
}

const SENSES = new Map(WORDS.map(word => [word.id, quizMeaning(word.meaning).toLowerCase().split('; ')]))

// Two words must not appear in the same question if they look the same or share a meaning
function conflicts(a: Word, b: Word): boolean {
  if (a.hanzi === b.hanzi) return true
  const sensesA = SENSES.get(a.id) ?? []
  return (SENSES.get(b.id) ?? []).some(sense => sensesA.includes(sense))
}

function pickDistractors(word: Word): Word[] {
  const allowed = shuffle(WORDS.filter(w => !conflicts(word, w)))
  // Same part of speech first, so the form of the meaning ("to …", "(measure word …)") gives nothing away
  const pos = primaryPos(word)
  const candidates = [...allowed.filter(w => primaryPos(w) === pos), ...allowed.filter(w => primaryPos(w) !== pos)]
  const distractors: Word[] = []
  for (const candidate of candidates) {
    if (distractors.length === CHOICES_PER_QUESTION - 1) break
    if (!distractors.some(d => conflicts(d, candidate))) distractors.push(candidate)
  }
  return distractors
}

// Due words first (longest overdue, then weakest), then new words level by level,
// and if that is not enough, the words that will be due soonest
function pickWords(progress: Progress, day: string): Word[] {
  const seen = shuffle(WORDS.filter(w => progress[w.id])).sort((a, b) =>
    progress[a.id].due.localeCompare(progress[b.id].due) || progress[a.id].box - progress[b.id].box
  )
  const due = seen.filter(w => progress[w.id].due <= day)
  const upcoming = seen.filter(w => progress[w.id].due > day)
  const unseen = shuffle(WORDS.filter(w => !progress[w.id])).sort((a, b) => a.level - b.level)
  return shuffle([...due, ...unseen, ...upcoming].slice(0, WORDS_PER_ROUND))
}

export function buildRound(progress: Progress): Question[] {
  return pickWords(progress, today()).map(word => ({
    word,
    choices: shuffle([word, ...pickDistractors(word)]),
  }))
}
