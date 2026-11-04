import { describe, expect, it } from 'vitest'
import { computeStreakDays } from '@/lib/dashboard/streak'

/** Local noon on Y-M-D (month is 1-based for readability). */
function localDay(y: number, m: number, d: number, hour = 12): Date {
  return new Date(y, m - 1, d, hour, 0, 0, 0)
}

describe('computeStreakDays', () => {
  const now = localDay(2026, 3, 15, 18)

  it('returns 0 for empty submissions', () => {
    expect(computeStreakDays([], now)).toBe(0)
  })

  it('counts today-only as streak of 1', () => {
    expect(computeStreakDays([localDay(2026, 3, 15, 9)], now)).toBe(1)
  })

  it('starts from yesterday when nothing submitted today', () => {
    expect(computeStreakDays([localDay(2026, 3, 14, 20)], now)).toBe(1)
    expect(
      computeStreakDays(
        [localDay(2026, 3, 14, 8), localDay(2026, 3, 13, 8), localDay(2026, 3, 12, 8)],
        now,
      ),
    ).toBe(3)
  })

  it('stops at calendar gaps', () => {
    expect(
      computeStreakDays(
        [localDay(2026, 3, 15), localDay(2026, 3, 14), localDay(2026, 3, 12)],
        now,
      ),
    ).toBe(2)
  })

  it('returns 0 when last activity is older than yesterday', () => {
    expect(computeStreakDays([localDay(2026, 3, 13)], now)).toBe(0)
  })

  it('dedupes multiple submissions on the same local day', () => {
    expect(
      computeStreakDays(
        [localDay(2026, 3, 15, 8), localDay(2026, 3, 15, 22), localDay(2026, 3, 14, 1)],
        now,
      ),
    ).toBe(2)
  })

  it('uses local calendar day keys (not UTC midnight)', () => {
    // Late evening local still counts as that local day regardless of UTC offset.
    const lateLocal = localDay(2026, 3, 15, 23)
    expect(computeStreakDays([lateLocal], now)).toBe(1)

    const earlyLocal = localDay(2026, 3, 15, 0)
    expect(computeStreakDays([earlyLocal], now)).toBe(1)
  })

  it('spans month boundaries', () => {
    const endOfMonth = localDay(2026, 4, 1, 10)
    expect(
      computeStreakDays(
        [localDay(2026, 4, 1), localDay(2026, 3, 31), localDay(2026, 3, 30)],
        endOfMonth,
      ),
    ).toBe(3)
  })
})
