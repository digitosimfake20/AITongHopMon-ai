import { describe, expect, it } from 'vitest'
import { deterministicEncouragement, type StudentActionPlan } from '@/lib/ai/student-action-plan'

function basePlan(overrides: Partial<StudentActionPlan>): StudentActionPlan {
  return {
    praise: 'Kết quả: 6/10 câu đúng.',
    knowledgeGaps: [],
    topicMastery: [],
    nextStep: null,
    signals: { carelessCount: 0, stuckCount: 0 },
    ...overrides,
  }
}

describe('deterministicEncouragement', () => {
  it('does not overpraise when accuracy low and topics at 0%', () => {
    const line = deterministicEncouragement(
      basePlan({
        officialStats: { correctCount: 6, totalQuestions: 10, scoredQuestionCount: 10 },
        topicMastery: [
          {
            topic: 'A',
            topicKey: 'a',
            total: 3,
            correct: 0,
            accuracy: 0,
            pMastery: 0.2,
            status: 'WEAK',
          },
        ],
      }),
    )
    expect(line).toMatch(/còn|luyện|ôn/i)
    expect(line).not.toMatch(/vững chắc|xuất sắc/i)
  })
})
