import { describe, expect, it } from 'vitest'
import {
  analysisModelResponseSchema,
  personalizedQuizResponseSchema,
  remedialSuggestionSchema,
} from '@/lib/ai/model-json-schemas'

describe('remedialSuggestionSchema', () => {
  it('rejects empty object that would crash activities.map', () => {
    expect(remedialSuggestionSchema.safeParse({}).success).toBe(false)
    expect(
      remedialSuggestionSchema.safeParse({
        summary: 'ok',
        activities: [{ title: 'A', description: 'B', type: 'exercise' }],
      }).success,
    ).toBe(true)
  })
})

describe('personalizedQuizResponseSchema', () => {
  it('requires real quiz item fields, not merely an array', () => {
    expect(
      personalizedQuizResponseSchema.safeParse({ questions: [{ id: 'q1' }] }).success,
    ).toBe(false)
    expect(
      personalizedQuizResponseSchema.safeParse({
        questions: [
          {
            id: 'q1',
            type: 'SHORT_ANSWER',
            content: '1+1=?',
            correctAnswer: '2',
            explanation: 'cộng',
            points: 2,
            topic: 'Số học',
          },
        ],
      }).success,
    ).toBe(true)
  })
})

describe('analysisModelResponseSchema', () => {
  it('requires string praise and knowledgeGaps with string advice', () => {
    expect(
      analysisModelResponseSchema.safeParse({
        praise: 'ok',
        knowledgeGaps: [{ issue: 1, advice: null }],
      }).success,
    ).toBe(false)
    expect(
      analysisModelResponseSchema.safeParse({
        praise: 'Tốt',
        knowledgeGaps: [{ issue: 'Yếu phân thức', advice: 'Ôn lại' }],
      }).success,
    ).toBe(true)
  })
})
