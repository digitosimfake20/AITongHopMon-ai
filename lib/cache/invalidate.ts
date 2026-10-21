import { bustCacheTags, bustClassCaches } from '@/lib/cache/cached-query'
import { CacheTags } from '@/lib/cache/tags'

/** Admin/teacher published or deleted system tests / groups. */
export function invalidateTestBank() {
  bustCacheTags(
    CacheTags.testBank,
    CacheTags.testBankSystem,
    CacheTags.testBankGroups,
  )
}

/** Teacher assigned a test / adaptive group to a class. */
export function invalidateAfterAssign(classId: string) {
  invalidateTestBank()
  bustClassCaches(classId)
}

/** Student submitted a quiz (scores, bank status, gap map, dashboards). */
export function invalidateAfterSubmit(classId: string, studentId: string) {
  bustClassCaches(classId, { studentId })
}

/** Roster / membership changed. */
export function invalidateAfterRoster(classId: string, studentId?: string) {
  bustCacheTags(
    CacheTags.teacherDash(classId),
    CacheTags.students(classId),
    CacheTags.classGap(classId),
    CacheTags.adaptive(classId),
  )
  if (studentId) {
    bustCacheTags(
      CacheTags.studentDash(studentId),
      CacheTags.quizBankStudent(classId, studentId),
      CacheTags.quizBank(classId),
    )
  } else {
    bustCacheTags(CacheTags.quizBank(classId))
  }
}

/** Package CRUD on teacher assignments. */
export function invalidatePackages(classId: string) {
  bustCacheTags(
    CacheTags.packages(classId),
    CacheTags.teacherDash(classId),
    CacheTags.quizBank(classId),
  )
}
