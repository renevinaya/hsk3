import { WORDS, type Word } from './words.ts'
import { today, PINYIN_BOX, type Progress } from './srs.ts'

export const WORDS_PER_ROUND = 30
export const CHOICES_PER_QUESTION = 4

export interface Question {
  word: Word
  choices: Word[]
  // Empty unless the pinyin is asked before the meaning
  pinyinChoices: string[]
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

// Hanzi that are easily mixed up: asking for one always offers the others as wrong answers
const LOOK_ALIKES = [['七', '九']]

function lookAlikes(word: Word): Word[] {
  const group = LOOK_ALIKES.find(g => g.includes(word.hanzi)) ?? []
  return WORDS.filter(w => w.hanzi !== word.hanzi && group.includes(w.hanzi))
}

function pickDistractors(word: Word): Word[] {
  const allowed = shuffle(WORDS.filter(w => !conflicts(word, w)))
  // Same part of speech first, so the form of the meaning ("to …", "(measure word …)") gives nothing away
  const pos = primaryPos(word)
  const candidates = [
    ...lookAlikes(word),
    ...allowed.filter(w => primaryPos(w) === pos),
    ...allowed.filter(w => primaryPos(w) !== pos),
  ]
  const distractors: Word[] = []
  for (const candidate of candidates) {
    if (distractors.length === CHOICES_PER_QUESTION - 1) break
    if (!distractors.some(d => conflicts(d, candidate))) distractors.push(candidate)
  }
  return distractors
}

// Pinyin as an answer option: one spelling, lower case, no spaces or hyphens, so the form gives nothing away
export function quizPinyin(pinyin: string): string {
  return pinyin.split('/')[0].toLowerCase().replace(/[ -]/g, '')
}

interface Spelling {
  pinyin: string
  letters: string[]
  toneless: string[]
  syllables: number
}

const TONE_MARKS = /[\u0300\u0301\u0304\u030c]/g

function spelling(pinyin: string): Spelling {
  const letters = [...pinyin]
  return {
    pinyin,
    letters,
    toneless: letters.map(l => l.normalize('NFD').replace(TONE_MARKS, '').normalize('NFC')),
    // Every syllable has one group of vowels; y, w and the erhua r are not vowels
    syllables: pinyin.match(/[aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+/g)?.length ?? 0,
  }
}

const SPELLINGS = [...new Set(WORDS.map(word => quizPinyin(word.pinyin)))].map(spelling)

// Edit distance between two pinyin spellings, where the same letter with another tone counts half
function pinyinDistance(a: Spelling, b: Spelling): number {
  let previous = Array.from({ length: b.letters.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.letters.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.letters.length; j++) {
      const substitution = a.letters[i - 1] === b.letters[j - 1] ? 0
        : a.toneless[i - 1] === b.toneless[j - 1] ? 0.5 : 1
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + substitution)
    }
    previous = current
  }
  return previous[b.letters.length]
}

function pickPinyinDistractors(word: Word): string[] {
  // Readings the characters have in other words are not wrong: 好 is also hào, as in 爱好
  const readings = WORDS.filter(w => w.hanzi.includes(word.hanzi)).map(w => quizPinyin(w.pinyin))
  const lookAlikePinyin = lookAlikes(word).map(w => quizPinyin(w.pinyin))
  const correct = spelling(quizPinyin(word.pinyin))
  // The same number of syllables first, so the length gives nothing away, then the most similar spellings
  const similar = shuffle(SPELLINGS.filter(s => !readings.some(r => r.includes(s.pinyin)) && !lookAlikePinyin.includes(s.pinyin)))
    .map(s => ({ pinyin: s.pinyin, gap: Math.abs(s.syllables - correct.syllables), distance: pinyinDistance(correct, s) }))
    .sort((a, b) => a.gap - b.gap || a.distance - b.distance)
  // The look-alikes' pinyin, then a random pick from the 6 most similar spellings
  return [...lookAlikePinyin, ...shuffle(similar.slice(0, 6).map(s => s.pinyin))].slice(0, CHOICES_PER_QUESTION - 1)
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
    pinyinChoices: (progress[word.id]?.box ?? 0) >= PINYIN_BOX
      ? shuffle([quizPinyin(word.pinyin), ...pickPinyinDistractors(word)])
      : [],
  }))
}
