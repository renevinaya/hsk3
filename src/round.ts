import { WORDS, CHARACTERS } from './words.ts'
import { pickItems, shuffle, wordQuestion, WORDS_PER_ROUND, type Question } from './quiz.ts'
import { writingQuestion, CHARACTERS_PER_ROUND, type WritingQuestion } from './writing.ts'
import { today, type Progress } from './srs.ts'

export type RoundItem =
  | { kind: 'word'; question: Question }
  | { kind: 'writing'; question: WritingQuestion }

export const ROUND_SIZE = WORDS_PER_ROUND + CHARACTERS_PER_ROUND

// How many are due or new
function open(items: { id: string }[], progress: Progress, day: string): number {
  return items.filter(item => !progress[item.id] || progress[item.id].due <= day).length
}

// 20 words and 10 characters. When one of them runs out of due and new ones, the other fills the round;
// when both do, words and then characters that are not due yet are asked early.
export function roundSplit(progress: Progress, writingProgress: Progress): { words: number; characters: number } {
  const day = today()
  const openWords = open(WORDS, progress, day)
  const openCharacters = open(CHARACTERS, writingProgress, day)
  let words = Math.min(WORDS_PER_ROUND, openWords)
  let characters = Math.min(CHARACTERS_PER_ROUND, openCharacters)
  words += Math.min(openWords - words, ROUND_SIZE - words - characters)
  characters += Math.min(openCharacters - characters, ROUND_SIZE - words - characters)
  words = Math.max(words, Math.min(WORDS_PER_ROUND, ROUND_SIZE - characters))
  return { words, characters: ROUND_SIZE - words }
}

export function buildRound(progress: Progress, writingProgress: Progress): RoundItem[] {
  const { words, characters } = roundSplit(progress, writingProgress)
  return shuffle<RoundItem>([
    ...pickItems(WORDS, progress, words).map(word => ({ kind: 'word' as const, question: wordQuestion(word, progress) })),
    ...pickItems(CHARACTERS, writingProgress, characters).map(character => ({ kind: 'writing' as const, question: writingQuestion(character) })),
  ])
}
