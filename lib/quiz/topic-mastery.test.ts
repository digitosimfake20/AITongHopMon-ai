import { describe, expect, it } from 'vitest'
import { computeTopicMastery } from '@/lib/quiz/topic-mastery'

describe('computeTopicMastery', () => {
  it('groups by canonical topicKey and sorts weakest first', () => {
    const rows = computeTopicMastery([
      { topic: 'Hình học', isCorrect: true },
      { topic: '  hình học ', isCorrect: false },
      { topic: 'Đại số', isCorrect: true },
      { topic: 'Đại số', isCorrect: true },
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]!.topicKey).toBe('hinh-hoc')
    expect(rows[0]!.accuracy).toBe(50)
    expect(rows[0]!.status).toBe('WEAK')
    expect(rows[1]!.accuracy).toBe(100)
    expect(rows[1]!.status).toBe('MASTERED')
  })

  it('skips ESSAY when type is provided', () => {
    const rows = computeTopicMastery([
      { topic: 'A', isCorrect: false, type: 'ESSAY' },
      { topic: 'A', isCorrect: true, type: 'MULTIPLE_CHOICE' },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]!.total).toBe(1)
    expect(rows[0]!.correct).toBe(1)
  })
})
