export const PRACTICE_TEST_PREFIX = 'Luyện tập cá nhân hóa'
export const PRACTICE_TIME_LIMIT_MINUTES = 10

export interface GenerateSmartQuizResult {
  testId: string
  questionCount: number
  timeLimitMinutes: number
  weakTopic: string
  weakFormLabel: string
  sourceTitles: string[]
  saveForLater?: boolean
}

export function isPracticeTestTitle(title: string): boolean {
  return title.startsWith(PRACTICE_TEST_PREFIX)
}

/** Personal practice is private; assigned / other titles stay class-wide. */
export function isTestVisibleInStudentCatalog(
  title: string,
  createdBy: string,
  studentId: string,
): boolean {
  if (!isPracticeTestTitle(title)) return true
  return createdBy === studentId
}

/** Prisma where for adaptive "Bài luyện gần đây". */
export function personalPracticeListWhere(studentId: string) {
  return {
    title: { startsWith: PRACTICE_TEST_PREFIX },
    createdBy: studentId,
  }
}
