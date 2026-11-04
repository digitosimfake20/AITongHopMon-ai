import { afterEach, describe, expect, it, vi } from 'vitest'
import { getRemainingSeconds, type ActiveQuizSession } from '@/lib/quiz/active-quiz-session'

describe('getRemainingSeconds', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns remaining time from startedAt and limit', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'))

    const session: ActiveQuizSession = {
      testId: 't1',
      testTitle: 'Quiz',
      startedAt: Date.parse('2026-03-15T11:59:00.000Z'),
      timeLimitMinutes: 5,
      answers: {},
    }

    expect(getRemainingSeconds(session)).toBe(4 * 60)
  })

  it('clamps at zero when overtime', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:10:00.000Z'))

    const session: ActiveQuizSession = {
      testId: 't1',
      testTitle: 'Quiz',
      startedAt: Date.parse('2026-03-15T12:00:00.000Z'),
      timeLimitMinutes: 5,
      answers: {},
    }

    expect(getRemainingSeconds(session)).toBe(0)
  })
})
