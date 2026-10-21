import { describe, expect, it } from 'vitest'
import { scoreTrueFalseGroup } from '@/lib/quiz/score-true-false'

/** Real bank row 2479d5e1-… — correctOption T,T,F,T */
const MH_NK_CORRECT = 'T,T,F,T'

describe('scoreTrueFalseGroup', () => {
  it('2479d5e1: all statements marked Đ (true) → 3/4 ý → 0.5 điểm', () => {
    const pts = scoreTrueFalseGroup(
      { a: true, b: true, c: true, d: true },
      MH_NK_CORRECT,
      1,
    )
    expect(pts).toBe(0.5)
  })

  it('uses label order a,b,c,d not Object.keys insertion order', () => {
    const shuffledKeys = { d: true, b: true, a: true, c: false }
    const pts = scoreTrueFalseGroup(shuffledKeys, MH_NK_CORRECT, 1)
    expect(pts).toBe(1)
  })

  it('full match yields max points', () => {
    expect(
      scoreTrueFalseGroup({ a: true, b: true, c: false, d: true }, MH_NK_CORRECT, 1),
    ).toBe(1)
  })
})
