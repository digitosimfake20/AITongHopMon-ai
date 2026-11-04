import { describe, expect, it } from 'vitest'
import {
  formatOfficialScoreLine,
  submissionOfficialStatsFromDetails,
} from '@/lib/knowledge/scored-submission-stats'

describe('submissionOfficialStatsFromDetails', () => {
  it('uses fallbackCorrectCount when any scored item lacks isCorrect', () => {
    const stats = submissionOfficialStatsFromDetails(
      [
        { type: 'MULTIPLE_CHOICE', isCorrect: true },
        { type: 'SHORT_ANSWER' },
        { type: 'ESSAY', isCorrect: false },
      ],
      7,
      3,
    )
    expect(stats.correctCount).toBe(7)
    expect(stats.scoredQuestionCount).toBe(2)
    expect(stats.totalQuestions).toBe(3)
  })

  it('counts all-false auto-scored batch without fallback', () => {
    const stats = submissionOfficialStatsFromDetails(
      [
        { type: 'MULTIPLE_CHOICE', isCorrect: false },
        { type: 'TRUE_FALSE_GROUP', isCorrect: false },
      ],
      99,
      2,
    )
    expect(stats.correctCount).toBe(0)
    expect(stats.scoredQuestionCount).toBe(2)
  })

  it('essay-only yields zero scored questions and uses fallback correct', () => {
    const stats = submissionOfficialStatsFromDetails(
      [{ type: 'ESSAY', isCorrect: false }],
      0,
      1,
    )
    expect(stats.scoredQuestionCount).toBe(0)
    expect(stats.correctCount).toBe(0)
  })
})

describe('formatOfficialScoreLine', () => {
  it('uses short line when every question is auto-scored', () => {
    expect(
      formatOfficialScoreLine({
        correctCount: 8,
        totalQuestions: 10,
        scoredQuestionCount: 10,
      }),
    ).toBe('Kết quả: 8/10 câu đúng.')
  })
})
