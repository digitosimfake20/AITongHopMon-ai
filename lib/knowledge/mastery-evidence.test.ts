import { describe, expect, it } from 'vitest'
import {
  MASTERY_CAP_PROGRESSING,
  MASTERY_CAP_SINGLE_CORRECT,
  applyEvidenceCap,
  bktUpdate,
  computeTopicMasteryUpdate,
  contributesToMasteryUpdate,
  masteryAnswersFromDetails,
  maxConsecutiveCorrect,
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

describe('maxConsecutiveCorrect', () => {
  it('tracks the longest correct streak', () => {
    expect(maxConsecutiveCorrect([])).toBe(0)
    expect(
      maxConsecutiveCorrect([
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: false },
        { isCorrect: true },
      ]),
    ).toBe(2)
  })
})

describe('applyEvidenceCap', () => {
  it('caps ≤1 correct at 0.6', () => {
    expect(applyEvidenceCap(0.95, [{ isCorrect: true }])).toBe(MASTERY_CAP_SINGLE_CORRECT)
    expect(applyEvidenceCap(0.95, [{ isCorrect: false }])).toBe(MASTERY_CAP_SINGLE_CORRECT)
  })

  it('caps 2 corrects without 3-streak at progressing band', () => {
    expect(
      applyEvidenceCap(0.95, [{ isCorrect: true }, { isCorrect: true }]),
    ).toBe(MASTERY_CAP_PROGRESSING)
  })

  it('allows full mastery with ≥3 consecutive or ≥3 total correct', () => {
    expect(
      applyEvidenceCap(0.95, [
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
      ]),
    ).toBe(0.95)
  })
})

describe('bktUpdate', () => {
  it('increases on correct and decreases on incorrect within [0.05, 0.99]', () => {
    const up = bktUpdate(0.5, true)
    const down = bktUpdate(0.5, false)
    expect(up).toBeGreaterThan(0.5)
    expect(down).toBeLessThan(0.5)
    expect(bktUpdate(0.99, true)).toBeLessThanOrEqual(0.99)
    expect(bktUpdate(0.05, false)).toBeGreaterThanOrEqual(0.05)
  })
})

describe('computeTopicMasteryUpdate — evidence edges', () => {
  it('never pulls prior mastery down via the evidence cap', () => {
    const prior = 0.8
    const next = computeTopicMasteryUpdate(prior, [{ isCorrect: true }])
    expect(next).toBeGreaterThanOrEqual(prior)
  })

  it('still declines when answers are wrong', () => {
    const prior = 0.7
    const next = computeTopicMasteryUpdate(prior, [
      { isCorrect: false },
      { isCorrect: false },
    ])
    expect(next).toBeLessThan(prior)
  })

  it('empty session leaves mastery unchanged', () => {
    expect(computeTopicMasteryUpdate(0.55, [])).toBe(0.55)
  })
})
