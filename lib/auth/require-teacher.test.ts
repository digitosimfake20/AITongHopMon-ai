import { describe, expect, it } from 'vitest'
import { requireTeacher } from '@/lib/auth/require-teacher'

describe('requireTeacher', () => {
  it('returns a Vietnamese error when there is no session', () => {
    const error = requireTeacher(null)
    expect(error).toBe('Chỉ giáo viên mới có thể thực hiện thao tác này.')
  })

  it('returns a Vietnamese error for a student', () => {
    expect(requireTeacher({ role: 'student' })).toBe(
      'Chỉ giáo viên mới có thể thực hiện thao tác này.',
    )
  })

  it('allows a teacher', () => {
    expect(requireTeacher({ role: 'teacher' })).toBeNull()
  })

  it('allows an admin', () => {
    expect(requireTeacher({ role: 'admin' })).toBeNull()
  })
})
