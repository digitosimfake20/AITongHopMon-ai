import { describe, expect, it } from 'vitest'
import { normalizeLatexDelimiters } from '@/lib/utils/katex-formatter'

describe('normalizeLatexDelimiters', () => {
  it('converts display \\[ \\] before inline \\( \\)', () => {
    expect(normalizeLatexDelimiters('\\[x^2\\]')).toBe('$$x^2$$')
    expect(normalizeLatexDelimiters('\\(a+b\\)')).toBe('$a+b$')
  })

  it('handles mixed delimiters in one string', () => {
    const input = 'Inline \\(x\\) and display \\[y\\].'
    expect(normalizeLatexDelimiters(input)).toBe('Inline $x$ and display $$y$$.')
  })

  it('leaves already-dollar-delimited math alone', () => {
    expect(normalizeLatexDelimiters('Keep $a$ and $$b$$')).toBe('Keep $a$ and $$b$$')
  })
})
