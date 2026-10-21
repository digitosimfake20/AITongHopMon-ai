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
})
