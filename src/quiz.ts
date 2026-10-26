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

// Hanzi that are easily mixed up, single characters or whole words. Asking for a word that contains one
// always offers a word with each of the others as a wrong meaning, and from box 3 on the word read
// with the other one as a wrong pinyin (自己: zìyǐ)
const LOOK_ALIKES = [['七', '九'], ['己', '已'], ['电影', '电视'], ['买', '卖'], ['左', '右']]

// Where the word contains a look-alike, and what it looks like
function lookAlikesIn(word: Word): { index: number; length: number; other: string }[] {
  return LOOK_ALIKES.flatMap(group => group.flatMap(hanzi => {
    const index = word.hanzi.indexOf(hanzi)
    return index < 0 ? [] : group.filter(other => other !== hanzi).map(other => ({ index, length: hanzi.length, other }))
  }))
}

// The word with the look-alike swapped in (买 → 卖), else the look-alike itself (外卖 → 买), else a word with it (自己 → 已经)
function lookAlikeWords(word: Word): Word[] {
  return lookAlikesIn(word).flatMap(({ index, length, other }) => {
    const swapped = word.hanzi.slice(0, index) + other + word.hanzi.slice(index + length)
    const options = [swapped, other].map(hanzi => WORDS.filter(w => w.hanzi === hanzi)).find(words => words.length)
      ?? WORDS.filter(w => w.hanzi.includes(other))
    return shuffle(options.filter(w => !conflicts(word, w))).slice(0, 1)
  })
}

function pickDistractors(word: Word): Word[] {
  const allowed = shuffle(WORDS.filter(w => !conflicts(word, w)))
  // Same part of speech first, so the form of the meaning ("to …", "(measure word …)") gives nothing away
  const pos = primaryPos(word)
  const candidates = [
    ...lookAlikeWords(word),
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
const VOWELS = 'aeiou\u00fc\u0101\u00e1\u01ce\u00e0\u0113\u00e9\u011b\u00e8\u012b\u00ed\u01d0\u00ec\u014d\u00f3\u01d2\u00f2\u016b\u00fa\u01d4\u00f9\u01d6\u01d8\u01da\u01dc'
// Initial, vowels, then n or ng and the erhua r, unless they start the next syllable
const SYLLABLE = new RegExp(`(?:[zcs]h|[bpmfdtnlgkhjqxrzcsyw])?[${VOWELS}]+(?:ng|n)?r?(?![${VOWELS}])`, 'g')

function spelling(pinyin: string): Spelling {
  const letters = [...pinyin]
  return {
    pinyin,
    letters,
    toneless: letters.map(l => l.normalize('NFD').replace(TONE_MARKS, '').normalize('NFC')),
    // Every syllable has one group of vowels; y, w and the erhua r are not vowels
    syllables: pinyin.match(new RegExp(`[${VOWELS}]+`, 'g'))?.length ?? 0,
  }
}

const SPELLINGS = [...new Set(WORDS.map(word => quizPinyin(word.pinyin)))].map(spelling)

// The syllable of each hanzi, or null if the pinyin does not split that way
export function syllablesByHanzi(word: Word): string[] | null {
  const syllables = quizPinyin(word.pinyin).match(SYLLABLE) ?? []
  if (syllables.length === word.hanzi.length) return syllables
  // Erhua: 儿 shares the syllable before it (一会儿, yíhuìr)
  if (word.hanzi.endsWith('儿') && syllables.length === word.hanzi.length - 1) return [...syllables, '']
  return null
}

// Pinyin needs an apostrophe before a syllable that starts with a, o or e (nǚ'ér)
function joinSyllables(syllables: string[]): string {
  return syllables.map((s, i) => i > 0 && /^[aoeāáǎàōóǒòēéěè]/.test(s) ? `'${s}` : s).join('')
}

function readingOf(hanzi: string): string[] | null {
  for (const word of WORDS) {
    const index = word.hanzi.indexOf(hanzi)
    const syllables = index < 0 ? null : syllablesByHanzi(word)
    if (syllables) return syllables.slice(index, index + hanzi.length)
  }
  return null
}

// The word read with each look-alike in place of the hanzi it looks like
function lookAlikePinyin(word: Word): string[] {
  const syllables = syllablesByHanzi(word)
  if (!syllables) return []
  return lookAlikesIn(word).flatMap(({ index, length, other }) => {
    const reading = readingOf(other)
    return reading ? [joinSyllables([...syllables.slice(0, index), ...reading, ...syllables.slice(index + length)])] : []
  })
}

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
  const correct = spelling(quizPinyin(word.pinyin))
  const lookAlikes = [...new Set(lookAlikePinyin(word))].filter(p => p !== correct.pinyin)
  // The same number of syllables first, so the length gives nothing away, then the most similar spellings
  const similar = shuffle(SPELLINGS.filter(s => !readings.some(r => r.includes(s.pinyin)) && !lookAlikes.includes(s.pinyin)))
    .map(s => ({ pinyin: s.pinyin, gap: Math.abs(s.syllables - correct.syllables), distance: pinyinDistance(correct, s) }))
    .sort((a, b) => a.gap - b.gap || a.distance - b.distance)
  // The look-alikes' pinyin, then a random pick from the 6 most similar spellings
  return [...lookAlikes, ...shuffle(similar.slice(0, 6).map(s => s.pinyin))].slice(0, CHOICES_PER_QUESTION - 1)
}

// Due items first (longest overdue, then weakest), then new ones level by level,
// and if that is not enough, the ones that will be due soonest
export function pickItems<T extends { id: string; level: number }>(items: T[], progress: Progress, count: number): T[] {
  const day = today()
  const seen = shuffle(items.filter(i => progress[i.id])).sort((a, b) =>
    progress[a.id].due.localeCompare(progress[b.id].due) || progress[a.id].box - progress[b.id].box
  )
  const due = seen.filter(i => progress[i.id].due <= day)
  const upcoming = seen.filter(i => progress[i.id].due > day)
  const unseen = shuffle(items.filter(i => !progress[i.id])).sort((a, b) => a.level - b.level)
  return shuffle([...due, ...unseen, ...upcoming].slice(0, count))
}

export function buildRound(progress: Progress): Question[] {
  return pickItems(WORDS, progress, WORDS_PER_ROUND).map(word => ({
    word,
    choices: shuffle([word, ...pickDistractors(word)]),
    pinyinChoices: (progress[word.id]?.box ?? 0) >= PINYIN_BOX
      ? shuffle([quizPinyin(word.pinyin), ...pickPinyinDistractors(word)])
      : [],
  }))
}
