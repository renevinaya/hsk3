import { WORDS, CHARACTERS, type Character, type Word } from './words.ts'
import { pickItems, shuffle, syllablesByHanzi } from './quiz.ts'
import type { Progress } from './srs.ts'

export const CHARACTERS_PER_ROUND = 10

// Like the exam: write the character that is missing from a word, with its pinyin above the gap
export interface WritingQuestion {
  character: Character
  word: Word
}

// One cell per hanzi of the word: the hanzi itself, or a gap with its pinyin
export interface Cell {
  hanzi: string | null
  pinyin: string
}

export function cells(question: WritingQuestion): Cell[] {
  const syllables = syllablesByHanzi(question.word) ?? []
  return [...question.word.hanzi].map((hanzi, i) =>
    hanzi === question.character.id ? { hanzi: null, pinyin: syllables[i] } : { hanzi, pinyin: '' }
  )
}

// Every gap needs a syllable of its own, which the erhua 儿 does not have
function canAskIn(word: Word, character: Character): boolean {
  const syllables = syllablesByHanzi(word)
  const hanzi = [...word.hanzi]
  return !!syllables && hanzi.includes(character.id) && hanzi.every((h, i) => h !== character.id || syllables[i] !== '')
}

export function buildWritingRound(progress: Progress): WritingQuestion[] {
  return pickItems(CHARACTERS, progress, CHARACTERS_PER_ROUND).map(character => ({
    character,
    word: shuffle(WORDS.filter(word => canAskIn(word, character)))[0],
  }))
}
