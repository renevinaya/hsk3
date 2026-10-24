import vocabulary from '../vocabulary.md?raw'

export interface Word {
  // Hanzi with homograph number plus pinyin, so saved progress survives a renumbered syllabus
  id: string
  level: number
  hanzi: string
  pinyin: string
  pos: string
  meaning: string
}

// A table row of vocabulary.md: | No. | Level | Word | Pinyin | Part of speech | English |
const ROW = /^\| \d+ \| (\d)[^|]* \| ([^|]+) \| ([^|]+) \| ([^|]*) \| ([^|]+) \|$/

export const WORDS: Word[] = vocabulary.split('\n').flatMap(line => {
  const match = line.match(ROW)
  if (!match) return []
  const [, level, word, pinyin, pos, meaning] = match
  return [{
    id: `${word.replace(/<\/?sup>/g, '')}|${pinyin}`,
    level: Number(level),
    hanzi: word.replace(/<sup>\d+<\/sup>/, ''),
    pinyin,
    pos: pos.trim(),
    meaning,
  }]
})

export const WORDS_BY_ID = new Map(WORDS.map(word => [word.id, word]))
