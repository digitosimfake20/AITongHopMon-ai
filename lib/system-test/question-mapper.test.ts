import { describe, expect, it } from 'vitest'
import { toDbQuestion } from '@/lib/system-test/question-mapper'

describe('toDbQuestion', () => {
  it('maps MULTIPLE_CHOICE index to A–D correctOption', () => {
    expect(
      toDbQuestion({
        type: 'MULTIPLE_CHOICE',
        content: 'Q',
        options: ['1', '2', '3', '4'],
        correctAnswer: 2,
        points: 1,
      }),
    ).toEqual({
      type: 'MULTIPLE_CHOICE',
      options: ['1', '2', '3', '4'],
      correctOption: 'C',
    })
  })

  it('defaults MC options and clamps answer index', () => {
    const q = toDbQuestion({
      type: 'MULTIPLE_CHOICE',
      content: 'Q',
      correctAnswer: 9,
      points: 1,
    })
    expect(q.options).toEqual(['A', 'B', 'C', 'D'])
    expect(q.correctOption).toBe('D')
  })

  it('maps TRUE_FALSE_GROUP subs to T/F csv', () => {
    const q = toDbQuestion({
      type: 'TRUE_FALSE_GROUP',
      content: 'Q',
      points: 1,
      subQuestions: [
        { label: 'a', content: '1', correctAnswer: true },
        { label: 'b', content: '2', correctAnswer: false },
        { label: 'c', content: '3', correctAnswer: true },
      ],
    })
    expect(q.type).toBe('TRUE_FALSE_GROUP')
    expect(q.correctOption).toBe('T,F,T')
    expect(Array.isArray(q.options)).toBe(true)
  })

  it('maps SHORT_ANSWER and ESSAY', () => {
    expect(
      toDbQuestion({
        type: 'SHORT_ANSWER',
        content: 'Q',
        correctAnswer: '42',
        points: 1,
      }),
    ).toEqual({ type: 'SHORT_ANSWER', options: [], correctOption: '42' })

    expect(
      toDbQuestion({
        type: 'ESSAY',
        content: 'Viết luận',
        points: 2,
      }),
    ).toEqual({ type: 'ESSAY', options: [], correctOption: null })
  })
})
