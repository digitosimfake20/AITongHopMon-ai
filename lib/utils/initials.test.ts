import { describe, expect, it } from 'vitest'
import { getInitials } from '@/lib/utils/initials'

describe('getInitials', () => {
  it('returns ? for blank names', () => {
    expect(getInitials('')).toBe('?')
    expect(getInitials('   ')).toBe('?')
  })

  it('uses up to two chars for a single token', () => {
    expect(getInitials('An')).toBe('AN')
    expect(getInitials('A')).toBe('A')
  })

  it('uses first and last name initials', () => {
    expect(getInitials('Nguyen Van A')).toBe('NA')
    expect(getInitials('  Trần  Thị  Bình  ')).toBe('TB')
  })
})
