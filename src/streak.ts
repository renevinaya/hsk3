import { addDays } from './srs.ts'

// Days in a row with at least one finished round
export interface Streak {
  last: string | null // the last day with a finished round, YYYY-MM-DD
  count: number
  best: number
}

export const NO_STREAK: Streak = { last: null, count: 0, best: 0 }

export function recordRound(streak: Streak, day: string): Streak {
  if (streak.last === day) return streak
  const count = streak.last === addDays(day, -1) ? streak.count + 1 : 1
  return { last: day, count, best: Math.max(streak.best, count) }
}

// A streak lives on until the end of the day after its last round
export function currentStreak(streak: Streak, day: string): number {
  return streak.last === day || streak.last === addDays(day, -1) ? streak.count : 0
}
