import { describe, expect, it } from 'vitest'
import { maxPointsFromQuestions, scoreOutOfTen } from '@/lib/quiz/score-out-of-ten'

describe('scoreOutOfTen', () => {
  it('weakness practice: 6/6 correct at 1pt each → 10/10 (not raw 6)', () => {
    const earned = 6
    const max = 6
    expect(scoreOutOfTen(earned, max)).toBe(10)
    // Regression: old submit path was Math.min(10, earned) → 6
    expect(Math.min(10, earned)).toBe(6)
  })

  it('weakness practice: 5/5 correct → 10/10', () => {
    expect(scoreOutOfTen(5, 5)).toBe(10)
  })

  it('partial credit scales proportionally', () => {
    expect(scoreOutOfTen(3, 6)).toBe(5)
    expect(scoreOutOfTen(4.5, 6)).toBe(7.5)
  })

  it('teacher package already on /10 stays identity', () => {
    expect(scoreOutOfTen(8, 10)).toBe(8)
    expect(scoreOutOfTen(10, 10)).toBe(10)
  })

  it('guards empty / invalid totals', () => {
    expect(scoreOutOfTen(0, 6)).toBe(0)
    expect(scoreOutOfTen(5, 0)).toBe(0)
    expect(scoreOutOfTen(Number.NaN, 6)).toBe(0)
  })
})

describe('maxPointsFromQuestions', () => {
  it('defaults missing points to 1 and skips holes', () => {
    expect(
      maxPointsFromQuestions([{ points: 1 }, { points: null }, undefined, { points: 2 }]),
    ).toBe(4)
  })
})
