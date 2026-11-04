import { describe, expect, it } from 'vitest'
import {
  emptyQuestion,
  emptyTestDraft,
  parseTestJson,
  questionDraftToParsed,
  testDraftToPayload,
  validateTestDraft,
} from '@/lib/system-test/test-draft'

describe('emptyTestDraft / emptyQuestion', () => {
  it('seeds a draft with one MC question', () => {
    const draft = emptyTestDraft()
    expect(draft.subject).toBe('Toán')
    expect(draft.questions).toHaveLength(1)
    expect(draft.questions[0]!.type).toBe('MULTIPLE_CHOICE')
    expect(emptyQuestion('ESSAY').type).toBe('ESSAY')
  })
})

describe('parseTestJson', () => {
  it('rejects empty / invalid / non-object JSON', () => {
    expect(parseTestJson('').ok).toBe(false)
    expect(parseTestJson('{').ok).toBe(false)
    expect(parseTestJson('[]').ok).toBe(false)
  })

  it('parses a minimal valid MC test', () => {
    const result = parseTestJson(
      JSON.stringify({
        title: 'Đề 1',
        durationMinutes: 20,
        questions: [
          {
            type: 'MULTIPLE_CHOICE',
            content: '1+1=?',
            options: ['1', '2', '3', '4'],
            correctAnswer: 1,
            points: 1,
          },
        ],
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.title).toBe('Đề 1')
      expect(result.data.questions[0]!.correctAnswer).toBe(1)
    }
  })
})

describe('testDraftToPayload / validateTestDraft', () => {
  it('round-trips a valid draft through the publish schema', () => {
    const draft = emptyTestDraft()
    draft.title = 'Kiểm tra'
    draft.questions[0]!.content = 'Câu hỏi'
    draft.questions[0]!.options = ['A', 'B', 'C', 'D']
    draft.questions[0]!.correctAnswer = 0
    const payload = testDraftToPayload(draft)
    expect(payload.title).toBe('Kiểm tra')
    expect(validateTestDraft(draft).ok).toBe(true)
  })
})

describe('questionDraftToParsed', () => {
  it('maps MC draft fields onto ParsedQuestion', () => {
    const q = emptyQuestion('MULTIPLE_CHOICE')
    q.content = 'Q'
    q.options = ['a', 'b', 'c', 'd']
    q.correctAnswer = 2
    const parsed = questionDraftToParsed(q)
    expect(parsed.type).toBe('MULTIPLE_CHOICE')
    expect(parsed.options).toEqual(['a', 'b', 'c', 'd'])
    expect(parsed.correctAnswer).toBe(2)
  })
})
