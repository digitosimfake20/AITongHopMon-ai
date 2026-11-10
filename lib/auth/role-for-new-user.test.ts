import { describe, expect, it } from 'vitest'
import { roleForNewUser } from '@/lib/auth/role-for-new-user'

describe('roleForNewUser', () => {
  it('whitelists student and teacher', () => {
    expect(roleForNewUser('student')).toBe('student')
    expect(roleForNewUser('teacher')).toBe('teacher')
  })

  it('never mints admin from metadata', () => {
    expect(roleForNewUser('admin')).toBe('student')
    expect(roleForNewUser('ADMIN')).toBe('student')
  })

  it('defaults unknown values to student', () => {
    expect(roleForNewUser(undefined)).toBe('student')
    expect(roleForNewUser(null)).toBe('student')
    expect(roleForNewUser(1)).toBe('student')
    expect(roleForNewUser('')).toBe('student')
  })
})
