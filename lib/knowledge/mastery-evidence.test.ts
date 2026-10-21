import { describe, expect, it } from 'vitest'
import {
  computeTopicMasteryUpdate,
  contributesToMasteryUpdate,
  masteryAnswersFromDetails,
} from '@/lib/knowledge/mastery-evidence'

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
