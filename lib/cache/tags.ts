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
  /** Was 90s; longer soft TTL — submit still busts via submissions tag. */
  teacherDash: 180,
  packages: 90,
  adaptive: 90,
  /** Class roster + list aggregates; busted on roster/submit. */
  students: 90,
  /** Was 180s; gap map is expensive — prefer tag bust over short soft expiry. */
  classGap: 300,
  quizBank: 60,
  studentDash: 45,
  /** Chrome mastery/streak — longer TTL; busted with studentDash + knowledge on submit. */
  studentShell: 120,
  knowledge: 90,
} as const
