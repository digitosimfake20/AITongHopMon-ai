import { describe, expect, it } from 'vitest'
import { canReadSubmission } from '@/lib/quiz/submission-access'

describe('canReadSubmission', () => {
  it('allows an admin to read any submission', () => {
    expect(
      canReadSubmission({
        role: 'admin',
        callerId: 'admin-1',
        studentId: 'student-1',
        classTeacherId: 'teacher-1',
      }),
    ).toBe(true)
  })

  it('allows a teacher who owns the class', () => {
    expect(
      canReadSubmission({
        role: 'teacher',
        callerId: 'teacher-1',
        studentId: 'student-1',
        classTeacherId: 'teacher-1',
      }),
    ).toBe(true)
  })

  it('denies a teacher who does not own the class', () => {
    expect(
      canReadSubmission({
        role: 'teacher',
        callerId: 'teacher-2',
        studentId: 'student-1',
        classTeacherId: 'teacher-1',
      }),
    ).toBe(false)
  })

  it('allows a student to read their own submission', () => {
    expect(
      canReadSubmission({
        role: 'student',
        callerId: 'student-1',
        studentId: 'student-1',
        classTeacherId: 'teacher-1',
      }),
    ).toBe(true)
  })

  it('denies a student who does not own the submission', () => {
    expect(
      canReadSubmission({
        role: 'student',
        callerId: 'student-2',
        studentId: 'student-1',
        classTeacherId: 'teacher-1',
      }),
    ).toBe(false)
  })
})
