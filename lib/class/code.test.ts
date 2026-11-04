import { describe, expect, it } from 'vitest'
import {
  generateClassCode,
  isValidClassCode,
  normalizeClassCode,
} from '@/lib/class/code'

describe('normalizeClassCode', () => {
  it('trims, uppercases, and strips non-alphanumerics', () => {
    expect(normalizeClassCode('  ab-cd_12  ')).toBe('ABCD12')
    expect(normalizeClassCode('xy z!')).toBe('XYZ')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeClassCode('   ')).toBe('')
  })
})

describe('isValidClassCode', () => {
  it('accepts exactly 8 A–Z / 0–9 chars', () => {
    expect(isValidClassCode('ABCD2345')).toBe(true)
    expect(isValidClassCode('ZZZZ9999')).toBe(true)
  })

  it('rejects wrong length or lowercase / symbols', () => {
    expect(isValidClassCode('ABCD234')).toBe(false)
    expect(isValidClassCode('ABCD23456')).toBe(false)
    expect(isValidClassCode('abcd2345')).toBe(false)
    expect(isValidClassCode('ABCD-345')).toBe(false)
    expect(isValidClassCode('')).toBe(false)
  })
})

describe('generateClassCode', () => {
  it('always produces a valid 8-char code from the alphabet', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateClassCode()
      expect(code).toHaveLength(8)
      expect(isValidClassCode(code)).toBe(true)
      // Alphabet excludes I, O, 0, 1 to avoid ambiguity
      expect(code).not.toMatch(/[IO01]/)
    }
  })
})
