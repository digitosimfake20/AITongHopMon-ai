import { describe, expect, it } from 'vitest'
import {
  MASTERY_STATUS_MASTERED,
  MASTERY_STATUS_PROGRESSING,
  isStrengthMastery,
  isWeakMastery,
  masteryStatusFromAccuracyPercent,
  masteryStatusFromP,
  masteryStatusLabelVi,
} from '@/lib/knowledge/mastery-labels'

describe('masteryStatusFromP', () => {
  it('bands: WEAK < 0.6 ≤ MEDIUM < 0.85 ≤ MASTERED', () => {
    expect(masteryStatusFromP(0)).toBe('WEAK')
    expect(masteryStatusFromP(0.59)).toBe('WEAK')
    expect(masteryStatusFromP(MASTERY_STATUS_PROGRESSING)).toBe('MEDIUM')
    expect(masteryStatusFromP(0.84)).toBe('MEDIUM')
    expect(masteryStatusFromP(MASTERY_STATUS_MASTERED)).toBe('MASTERED')
    expect(masteryStatusFromP(0.99)).toBe('MASTERED')
  })
})

describe('masteryStatusFromAccuracyPercent', () => {
  it('maps percent onto the same BKT bands', () => {
    expect(masteryStatusFromAccuracyPercent(59)).toBe('WEAK')
    expect(masteryStatusFromAccuracyPercent(60)).toBe('MEDIUM')
    expect(masteryStatusFromAccuracyPercent(84)).toBe('MEDIUM')
    expect(masteryStatusFromAccuracyPercent(85)).toBe('MASTERED')
  })
})

describe('masteryStatusLabelVi', () => {
  it('returns Vietnamese status labels', () => {
    expect(masteryStatusLabelVi('MASTERED')).toBe('Thành thạo')
    expect(masteryStatusLabelVi('MEDIUM')).toBe('Đang tiến bộ')
    expect(masteryStatusLabelVi('WEAK')).toBe('Yếu')
  })
})

describe('isWeakMastery / isStrengthMastery', () => {
  it('strength is ≥ mastered threshold; weak is everything below', () => {
    expect(isStrengthMastery(0.85)).toBe(true)
    expect(isStrengthMastery(0.849)).toBe(false)
    expect(isWeakMastery(0.849)).toBe(true)
    expect(isWeakMastery(0.85)).toBe(false)
  })
})
