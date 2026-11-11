import { describe, expect, it } from 'vitest'
import { computePersona } from '@/lib/ai/pipeline'
import {
  MASTERY_STATUS_MASTERED,
  MASTERY_STATUS_PROGRESSING,
} from '@/lib/knowledge/mastery-labels'

describe('computePersona', () => {
  it('returns Thành thạo when avg mastery ≥ mastered threshold', () => {
    expect(computePersona(10, 0.9, MASTERY_STATUS_MASTERED)).toBe('Thành thạo')
    expect(computePersona(100, 0.5, 0.9)).toBe('Thành thạo')
  })

  it('flags fast + careless before slow persona', () => {
    expect(computePersona(15, 0.31, 0.5)).toBe('Nhanh nhạy nhưng ẩu')
  })

  it('flags slow average speed', () => {
    expect(computePersona(81, 0.2, 0.5)).toBe('Cẩn thận - Ngâm lâu')
  })

  it('flags careful + progressing mastery', () => {
    expect(computePersona(40, 0.05, MASTERY_STATUS_PROGRESSING)).toBe(
      'Chắc chắn, tốc độ tốt',
    )
  })

  it('defaults to Đang phát triển', () => {
    expect(computePersona(40, 0.2, 0.4)).toBe('Đang phát triển')
  })

  it('uses blended speed for persona (not raw estimated 30s default alone)', () => {
    // Stored blend of 90s + new 90s → still slow persona
    expect(computePersona(90, 0.05, 0.4)).toBe('Cẩn thận - Ngâm lâu')
  })
})
