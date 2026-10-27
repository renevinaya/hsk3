import vocabulary from '../vocabulary.md?raw'
import type { language } from './translations.ts'

export interface Word {
  // Hanzi with homograph number plus pinyin, so saved progress survives a renumbered syllabus
  id: string
  level: number
  hanzi: string
  pinyin: string
  pos: string
  meaning: Record<language, string>
}

// A table row of vocabulary.md: | No. | Level | Word | Pinyin | Part of speech | English | Deutsch |
const ROW = /^\| \d+ \| (\d)[^|]* \| ([^|]+) \| ([^|]+) \| ([^|]*) \| ([^|]+) \| ([^|]+) \|$/

export const WORDS: Word[] = vocabulary.split('\n').flatMap(line => {
  const match = line.match(ROW)
  if (!match) return []
  const [, level, word, pinyin, pos, en, de] = match
  return [{
    id: `${word.replace(/<\/?sup>/g, '')}|${pinyin}`,
    level: Number(level),
    hanzi: word.replace(/<sup>\d+<\/sup>/, ''),
    pinyin,
    pos: pos.trim(),
    meaning: { en, de },
  }]
})

export const WORDS_BY_ID = new Map(WORDS.map(word => [word.id, word]))

// A character to write by hand
export interface Character {
  id: string // the character itself
  level: number // 2 for the HSK 1–2 list, 3 for HSK 3
}

// A row of the "Characters to write" table: | HSK 1–2 | 爱 八 爸 … |
const CHARACTER_ROW = /^\| HSK (1–2|3) \| ([\u4e00-\u9fff ]+) \|$/

export const CHARACTERS: Character[] = vocabulary.split('\n').flatMap(line => {
  const match = line.match(CHARACTER_ROW)
  if (!match) return []
  const level = match[1] === '3' ? 3 : 2
  return match[2].split(' ').map(id => ({ id, level }))
})

export const CHARACTERS_BY_ID = new Map(CHARACTERS.map(character => [character.id, character]))
