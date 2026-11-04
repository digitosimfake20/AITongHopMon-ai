import { describe, expect, it } from 'vitest'
import { assessQuestionTiming } from '@/lib/quiz/question-timing'

describe('assessQuestionTiming', () => {
  it('insufficient when no positive per-question times', () => {
    expect(
      assessQuestionTiming({
        perQuestionSeconds: [0, 0, 0],
        totalSeconds: 90,
        questionCount: 3,
      }),
    ).toEqual({
      quality: 'insufficient',
      medianMs: null,
      measuredCount: 0,
      reliable: false,
    })
  })

  it('estimated when all times look like even-split fallback', () => {
    expect(
      assessQuestionTiming({
        perQuestionSeconds: [30, 30, 30],
        totalSeconds: 90,
        questionCount: 3,
      }),
    ).toMatchObject({
      quality: 'estimated',
      medianMs: null,
      reliable: false,
      measuredCount: 3,
    })
  })

  it('insufficient when fewer than half of questions have timing', () => {
    expect(
      assessQuestionTiming({
        perQuestionSeconds: [40, 0, 0, 0],
        totalSeconds: 120,
        questionCount: 4,
      }),
    ).toMatchObject({
      quality: 'insufficient',
      medianMs: null,
      measuredCount: 1,
      reliable: false,
    })
  })

  it('measured with median ms when enough real timings exist', () => {
    expect(
      assessQuestionTiming({
        perQuestionSeconds: [10, 20, 30],
        totalSeconds: 90,
        questionCount: 3,
      }),
    ).toEqual({
      quality: 'measured',
      medianMs: 20_000,
      measuredCount: 3,
      reliable: true,
    })
  })
})
