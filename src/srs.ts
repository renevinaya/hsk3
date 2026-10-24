// Leitner system: a right answer moves a word up one box, a wrong answer sends it back to box 0.
// The box sets how many days pass until the word is due again; box 0 is due again right away.
export const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30, 60, 120]
// From here on a word comes back after a month or more
export const KNOWN_BOX = 5

export interface Card {
  box: number
  due: string // local date, YYYY-MM-DD
}

// Cards by word id; words without a card have never been asked
export type Progress = Record<string, Card>

export interface Summary {
  due: number
  unseen: number
  learning: number
  known: number
}

function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function today(): string {
  return formatDate(new Date())
}

export function addDays(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number)
  return formatDate(new Date(year, month - 1, date + days))
}

export function review(card: Card | undefined, correct: boolean, day: string): Card {
  const box = correct ? Math.min((card?.box ?? 0) + 1, INTERVAL_DAYS.length - 1) : 0
  return { box, due: addDays(day, INTERVAL_DAYS[box]) }
}

export function summarize(ids: string[], progress: Progress, day: string): Summary {
  const summary: Summary = { due: 0, unseen: 0, learning: 0, known: 0 }
  for (const id of ids) {
    const card = progress[id]
    if (!card) {
      summary.unseen++
      continue
    }
    if (card.due <= day) summary.due++
    if (card.box >= KNOWN_BOX) summary.known++
    else summary.learning++
  }
  return summary
}
