import { describe, expect, it } from 'vitest'
import { criticalGapHeadline } from '@/lib/quiz/critical-gap-display'

describe('criticalGapHeadline', () => {
  it('strips inline math and keeps readable text', () => {
    const h = criticalGapHeadline(
      'Cho tam giác $ABC$ vuông tại $C$. Biết $AC = 12$ cm.',
      'Đường tròn ngoại tiếp',
    )
    expect(h).toContain('Cho tam giác')
    expect(h).not.toContain('$')
  })

  it('falls back to topic when content empty', () => {
    expect(criticalGapHeadline('', 'Tính chất đường tròn')).toBe('Tính chất đường tròn')
  })

  it('falls back when content is null or undefined', () => {
    expect(criticalGapHeadline(null, 'Chủ đề')).toBe('Chủ đề')
    expect(criticalGapHeadline(undefined, 'Chủ đề')).toBe('Chủ đề')
  })

  it('strips display math blocks', () => {
    const h = criticalGapHeadline('Trước $$x^2+1$$ sau', 'fallback')
    expect(h).toBe('Trước sau')
    expect(h).not.toContain('$$')
  })

  it('strips LaTeX commands like \\frac{a}{b}', () => {
    const h = criticalGapHeadline('Kết quả \\frac{1}{2} đúng', 'fallback')
    expect(h).toContain('Kết quả')
    expect(h).toContain('đúng')
    expect(h).not.toMatch(/\\frac/)
  })

  it('falls back when content is only math/whitespace after strip', () => {
    expect(criticalGapHeadline('$$a+b$$', 'Đại số')).toBe('Đại số')
    expect(criticalGapHeadline('   $x$   ', 'Hình học')).toBe('Hình học')
  })

  it('truncates long headlines with ellipsis at 88 chars', () => {
    const long = 'A'.repeat(100)
    const h = criticalGapHeadline(long, 'topic')
    expect(h.length).toBeLessThanOrEqual(88)
    expect(h.endsWith('…')).toBe(true)
    expect(h.slice(0, -1)).toBe('A'.repeat(85))
  })

  it('keeps text of length 88 unchanged', () => {
    const exact = 'B'.repeat(88)
    expect(criticalGapHeadline(exact, 'topic')).toBe(exact)
  })

  it('collapses runs of whitespace after stripping', () => {
    expect(criticalGapHeadline('a   $x$   b', 't')).toBe('a b')
  })
})
