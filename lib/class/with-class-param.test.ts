import { describe, expect, it } from 'vitest'
import { withClassParam } from '@/lib/class/with-class-param'

describe('withClassParam', () => {
  it('appends ?class= when href has no query', () => {
    expect(withClassParam('/teacher/gaps', 'cls-1')).toBe(
      '/teacher/gaps?class=cls-1',
    )
  })

  it('appends &class= when href already has a query', () => {
    expect(withClassParam('/teacher/gaps?tab=weak', 'cls-2')).toBe(
      '/teacher/gaps?tab=weak&class=cls-2',
    )
  })

  it('does not encode classId (caller owns the id string)', () => {
    expect(withClassParam('/x', 'raw-id')).toBe('/x?class=raw-id')
  })
})
