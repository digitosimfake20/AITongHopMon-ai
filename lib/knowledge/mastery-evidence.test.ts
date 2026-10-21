import { describe, expect, it } from 'vitest'
import {
  computeTopicMasteryUpdate,
  contributesToMasteryUpdate,
  masteryAnswersFromDetails,
} from '@/lib/knowledge/mastery-evidence'
import {
  formatOfficialScoreLine,
  submissionOfficialStatsFromDetails,
} from '@/lib/knowledge/scored-submission-stats'

describe('contributesToMasteryUpdate', () => {
  it('excludes ESSAY (unscored placeholder)', () => {
    expect(contributesToMasteryUpdate('ESSAY')).toBe(false)
  })

  it('includes auto-scored types', () => {
    expect(contributesToMasteryUpdate('MULTIPLE_CHOICE')).toBe(true)
    expect(contributesToMasteryUpdate('TRUE_FALSE_GROUP')).toBe(true)
    expect(contributesToMasteryUpdate('SHORT_ANSWER')).toBe(true)
  })
})

describe('ESSAY unscored must not change pMastery', () => {
  it('essay-only session leaves mastery unchanged', () => {
    const current = 0.5
    const details = [
      { type: 'ESSAY', isCorrect: false },
      { type: 'ESSAY', isCorrect: false },
    ]
    const answers = masteryAnswersFromDetails(details)
    expect(answers).toEqual([])
    expect(computeTopicMasteryUpdate(current, answers)).toBe(current)
  })

  it('mixed topic: only auto-scored answers update; ESSAY does not pull down', () => {
    const current = 0.5
    const details = [
      { type: 'MULTIPLE_CHOICE', isCorrect: true },
      { type: 'ESSAY', isCorrect: false }, // placeholder — must be ignored
      { type: 'SHORT_ANSWER', isCorrect: true },
    ]
    const answers = masteryAnswersFromDetails(details)
    expect(answers).toEqual([{ isCorrect: true }, { isCorrect: true }])

    const withEssayBug = computeTopicMasteryUpdate(current, [
      { isCorrect: true },
      { isCorrect: false },
      { isCorrect: true },
    ])
    const fixed = computeTopicMasteryUpdate(current, answers)

    // Ignoring ESSAY must not decrease vs treating it as wrong
    expect(fixed).toBeGreaterThan(withEssayBug)
    // Two corrects from 0.5 should increase mastery
    expect(fixed).toBeGreaterThan(current)
  })
})

describe('submissionOfficialStatsFromDetails', () => {
  it('counts correct only among auto-scored items when isCorrect provided', () => {
    const stats = submissionOfficialStatsFromDetails(
      [
        { type: 'MULTIPLE_CHOICE', isCorrect: true },
        { type: 'ESSAY', isCorrect: false },
        { type: 'SHORT_ANSWER', isCorrect: false },
      ],
      99,
      3,
    )
    expect(stats.correctCount).toBe(1)
    expect(stats.scoredQuestionCount).toBe(2)
  })
})

describe('formatOfficialScoreLine', () => {
  it('mentions unscored essay count when present', () => {
    const line = formatOfficialScoreLine({
      correctCount: 5,
      totalQuestions: 10,
      scoredQuestionCount: 8,
    })
    expect(line).toContain('5/10')
    expect(line).toContain('2')
    expect(line).toMatch(/tự luận|chưa chấm/i)
  })
})
