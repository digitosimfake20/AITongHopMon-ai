import { describe, expect, it } from 'vitest'
import {
  PRACTICE_TEST_PREFIX,
  isPracticeTestTitle,
  isTestVisibleInStudentCatalog,
  personalPracticeListWhere,
} from '@/lib/quiz/practice-quiz'

describe('isTestVisibleInStudentCatalog', () => {
  const me = 'student-me'
  const classmate = 'student-other'

  it('hides classmates personal practice from quiz bank / recent lists', () => {
    expect(
      isTestVisibleInStudentCatalog(
        `${PRACTICE_TEST_PREFIX} — Đại số`,
        classmate,
        me,
      ),
    ).toBe(false)
  })

  it('keeps own personal practice visible', () => {
    expect(
      isTestVisibleInStudentCatalog(
        `${PRACTICE_TEST_PREFIX} — Hình học`,
        me,
        me,
      ),
    ).toBe(true)
  })

  it('keeps assigned ClassTest / normal titles class-wide regardless of createdBy', () => {
    expect(
      isTestVisibleInStudentCatalog('Kiểm tra giữa kỳ', 'teacher-1', me),
    ).toBe(true)
    expect(
      isTestVisibleInStudentCatalog('Bài 13 Đường tròn', classmate, me),
    ).toBe(true)
  })
})

describe('personalPracticeListWhere', () => {
  it('scopes adaptive recent query to createdBy + practice prefix', () => {
    expect(personalPracticeListWhere('student-me')).toEqual({
      title: { startsWith: PRACTICE_TEST_PREFIX },
      createdBy: 'student-me',
    })
    expect(isPracticeTestTitle(`${PRACTICE_TEST_PREFIX} — X`)).toBe(true)
  })
})
