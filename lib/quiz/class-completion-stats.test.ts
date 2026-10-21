import { describe, expect, it } from 'vitest'
import { computeClassCompletionDetail } from '@/lib/quiz/class-completion-stats'

describe('computeClassCompletionDetail', () => {
  it('matches 9A2: 2 students, 3 tests, 2 distinct pairs → 2/6, 33%', () => {
    const r = computeClassCompletionDetail(2, 3, 2)
    expect(r.completedSlots).toBe(2)
    expect(r.expectedSlots).toBe(6)
    expect(r.completionRate).toBe(33)
  })

  it('does not inflate when extra submissions exist (pairs already counted)', () => {
    const r = computeClassCompletionDetail(2, 3, 2)
    expect(r.completedSlots).toBe(2)
  })

  it('uses at least 1 test in denominator when testCount is 0', () => {
    const r = computeClassCompletionDetail(5, 0, 0)
    expect(r.expectedSlots).toBe(5)
    expect(r.completionRate).toBe(0)
  })
})
