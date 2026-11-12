import { describe, expect, it } from 'vitest'
import {
  computeClassCompletionDetail,
  computeWeeklyCompletionRate,
} from '@/lib/quiz/class-completion-stats'

describe('computeWeeklyCompletionRate', () => {
  it('uses week-scoped test count for expected slots, not all-time', () => {
    const students = 10
    const weekCompleted = 10
    const allTimeTests = 20
    const weekTests = 2

    // Bug shape: all-time denom → 10 / (10×20) = 5%
    expect(
      computeClassCompletionDetail(students, allTimeTests, weekCompleted)
        .completionRate,
    ).toBe(5)

    // Week-scoped: 10 / (10×2) = 50%
    expect(
      computeWeeklyCompletionRate(students, weekTests, weekCompleted),
    ).toBe(50)
  })

  it('matches computeClassCompletionDetail slot math and caps at 100', () => {
    expect(computeWeeklyCompletionRate(4, 2, 8)).toBe(100)
    expect(computeWeeklyCompletionRate(4, 2, 16)).toBe(100)
    expect(computeWeeklyCompletionRate(2, 3, 2)).toBe(33)
  })

  it('treats zero week tests as one slot per student (same floor as detail)', () => {
    expect(computeWeeklyCompletionRate(5, 0, 0)).toBe(0)
    expect(computeWeeklyCompletionRate(5, 0, 5)).toBe(100)
  })
})

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

  it('returns 100% when every student×test slot is filled', () => {
    const r = computeClassCompletionDetail(4, 2, 8)
    expect(r.completedSlots).toBe(8)
    expect(r.expectedSlots).toBe(8)
    expect(r.completionRate).toBe(100)
  })

  it('clamps negative completedDistinctPairs to 0', () => {
    const r = computeClassCompletionDetail(3, 2, -5)
    expect(r.completedSlots).toBe(0)
    expect(r.expectedSlots).toBe(6)
    expect(r.completionRate).toBe(0)
  })

  it('returns 0% when studentCount is 0 (no expected slots)', () => {
    const r = computeClassCompletionDetail(0, 5, 0)
    expect(r.expectedSlots).toBe(0)
    expect(r.completedSlots).toBe(0)
    expect(r.completionRate).toBe(0)
  })

  it('rounds completion rate to nearest integer', () => {
    // 1/3 → 33.333… → 33
    expect(computeClassCompletionDetail(1, 3, 1).completionRate).toBe(33)
    // 2/3 → 66.666… → 67
    expect(computeClassCompletionDetail(1, 3, 2).completionRate).toBe(67)
  })

  it('allows completedSlots above expectedSlots (over-complete data)', () => {
    const r = computeClassCompletionDetail(1, 1, 5)
    expect(r.completedSlots).toBe(5)
    expect(r.expectedSlots).toBe(1)
    expect(r.completionRate).toBe(500)
  })
})
