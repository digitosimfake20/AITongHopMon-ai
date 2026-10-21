/**
 * Central cache tags for teacher/student dashboard reads.
 * Invalidate only the tags that a mutation actually changes.
 */

export const CacheTags = {
  testBank: 'test-bank',
  testBankSystem: 'test-bank:system',
  testBankGroups: 'test-bank:groups',

  teacherDash: (classId: string) => `teacher-dash:${classId}`,
  packages: (classId: string) => `packages:${classId}`,
  adaptive: (classId: string) => `adaptive:${classId}`,
  classGap: (classId: string) => `class-gap:${classId}`,
  students: (classId: string) => `students:${classId}`,
  submissions: (classId: string) => `submissions:${classId}`,

  quizBank: (classId: string) => `quiz-bank:${classId}`,
  quizBankStudent: (classId: string, studentId: string) =>
    `quiz-bank:${classId}:${studentId}`,
  studentDash: (userId: string) => `student-dash:${userId}`,
  knowledge: (userId: string) => `knowledge:${userId}`,
} as const

/** TTLs in seconds — catalog changes rarely; dashboards stay fresher. */
export const CacheTTL = {
  testBank: 300,
  teacherDash: 90,
  packages: 60,
  adaptive: 60,
  classGap: 180,
  quizBank: 45,
  studentDash: 45,
  knowledge: 90,
} as const
