import { describe, expect, it } from 'vitest'
import { isSafeMathInterior } from '@/components/quiz/math-text'

describe('isSafeMathInterior', () => {
  it('rejects empty / whitespace', () => {
    expect(isSafeMathInterior('')).toBe(false)
    expect(isSafeMathInterior('   ')).toBe(false)
  })

  it('rejects Vietnamese prose wrongly wrapped as math', () => {
    expect(isSafeMathInterior('Tìm giá trị của x')).toBe(false)
    expect(isSafeMathInterior('phương trình bậc hai')).toBe(false)
    expect(isSafeMathInterior('ờ')).toBe(false)
  })

  it('accepts ordinary LaTeX interiors', () => {
    expect(isSafeMathInterior('x^2 + 1')).toBe(true)
    expect(isSafeMathInterior('\\frac{a}{b}')).toBe(true)
    expect(isSafeMathInterior('E = mc^2')).toBe(true)
  })
})
