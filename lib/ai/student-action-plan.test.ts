import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildStudentActionPlan,
  curatedInsightFromPlan,
  deterministicEncouragement,
  enrichActionPlanWithLLM,
  type StudentActionPlan,
} from '@/lib/ai/student-action-plan'

vi.mock('@/lib/ai/openai', () => ({
  OPENAI_MODEL_CHAT: 'mock-model',
  getOpenAIClient: vi.fn(),
}))

import { getOpenAIClient } from '@/lib/ai/openai'

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

  it('praises strong plans without weak topics', () => {
    const line = deterministicEncouragement(
      basePlan({
        officialStats: { correctCount: 9, totalQuestions: 10, scoredQuestionCount: 10 },
        topicMastery: [
          {
            topic: 'A',
            topicKey: 'a',
            total: 5,
            correct: 5,
            accuracy: 100,
            pMastery: 0.9,
            status: 'MASTERED',
          },
        ],
      }),
    )
    expect(line).toMatch(/Làm tốt/i)
  })
})

describe('buildStudentActionPlan', () => {
  it('sorts topics by mastery, builds nextStep, and counts careless/stuck', () => {
    const plan = buildStudentActionPlan([
      {
        topicName: 'Strong',
        topicKey: 'strong',
        pMastery: 0.9,
        answers: [
          { isCorrect: true, timeSpentSeconds: 40 },
          { isCorrect: true, timeSpentSeconds: 35 },
        ],
      },
      {
        topicName: 'Weak',
        topicKey: 'weak',
        pMastery: 0.3,
        answers: [
          { isCorrect: false, timeSpentSeconds: 8 },
          { isCorrect: false, timeSpentSeconds: 10 },
          { isCorrect: false, timeSpentSeconds: 150 },
          { isCorrect: false, timeSpentSeconds: 140 },
          { isCorrect: true, timeSpentSeconds: 40 },
        ],
      },
    ])

    expect(plan.topicMastery[0]?.topicKey).toBe('weak')
    expect(plan.nextStep).toEqual({
      type: 'practice',
      topicKeys: ['weak'],
      topicTitles: ['Weak'],
    })
    expect(plan.signals).toEqual({ carelessCount: 2, stuckCount: 2 })
    expect(plan.knowledgeGaps[0]?.issue).toMatch(/ẩu|đoán/i)
    expect(plan.knowledgeGaps.some((g) => /120 giây/.test(g.issue))).toBe(true)
  })

  it('prefers officialStats praise and null nextStep when no weak topics', () => {
    const plan = buildStudentActionPlan(
      [
        {
          topicName: 'Ok',
          topicKey: 'ok',
          pMastery: 0.9,
          answers: [{ isCorrect: true, timeSpentSeconds: 20 }],
        },
      ],
      { correctCount: 8, totalQuestions: 10, scoredQuestionCount: 10 },
    )
    expect(plan.praise).toBe('Kết quả: 8/10 câu đúng.')
    expect(plan.nextStep).toBeNull()
  })
})

describe('curatedInsightFromPlan', () => {
  it('appends practice topics when nextStep exists', () => {
    expect(
      curatedInsightFromPlan(
        basePlan({
          praise: 'Praise.',
          nextStep: {
            type: 'practice',
            topicKeys: ['a', 'b', 'c'],
            topicTitles: ['Alpha', 'Beta', 'Gamma'],
          },
        }),
      ),
    ).toBe('Praise. Nên luyện tiếp: Alpha, Beta.')
  })

  it('falls back to praise alone', () => {
    expect(curatedInsightFromPlan(basePlan({ praise: 'Only praise.' }))).toBe('Only praise.')
  })
})

describe('enrichActionPlanWithLLM', () => {
  beforeEach(() => {
    vi.mocked(getOpenAIClient).mockReset()
  })

  it('skips LLM when there are no weak topics', async () => {
    const plan = basePlan({
      topicMastery: [
        {
          topic: 'A',
          topicKey: 'a',
          total: 2,
          correct: 2,
          accuracy: 100,
          pMastery: 0.9,
          status: 'MASTERED',
        },
      ],
    })
    await expect(enrichActionPlanWithLLM(plan)).resolves.toBe(plan)
    expect(getOpenAIClient).not.toHaveBeenCalled()
  })

  it('merges topic advice and keeps deterministic praise prefix', async () => {
    vi.mocked(getOpenAIClient).mockReturnValue({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    encouragement: 'Cố lên thêm một chút nữa nhé.',
                    topicAdvice: [{ topicKey: 'weak', advice: 'Ôn lại hệ phương trình.' }],
                  }),
                },
              },
            ],
          }),
        },
      },
    } as never)

    const plan = basePlan({
      praise: 'Kết quả: 4/10 câu đúng.',
      knowledgeGaps: [
        {
          issue: 'Weak: Chỉ đúng 1/4 câu trong bài vừa làm',
          advice: 'old advice',
        },
      ],
      topicMastery: [
        {
          topic: 'Weak',
          topicKey: 'weak',
          total: 4,
          correct: 1,
          accuracy: 25,
          pMastery: 0.25,
          status: 'WEAK',
        },
      ],
      nextStep: {
        type: 'practice',
        topicKeys: ['weak'],
        topicTitles: ['Weak'],
      },
    })

    const enriched = await enrichActionPlanWithLLM(plan)
    expect(enriched.topicMastery[0]?.advice).toBe('Ôn lại hệ phương trình.')
    expect(enriched.knowledgeGaps[0]?.advice).toBe('Ôn lại hệ phương trình.')
    expect(enriched.praise.startsWith('Kết quả: 4/10 câu đúng.')).toBe(true)
  })

  it('returns original plan when LLM throws', async () => {
    vi.mocked(getOpenAIClient).mockImplementation(() => {
      throw new Error('no key')
    })
    const plan = basePlan({
      topicMastery: [
        {
          topic: 'Weak',
          topicKey: 'weak',
          total: 2,
          correct: 0,
          accuracy: 0,
          pMastery: 0.2,
          status: 'WEAK',
        },
      ],
    })
    await expect(enrichActionPlanWithLLM(plan)).resolves.toBe(plan)
  })
})

