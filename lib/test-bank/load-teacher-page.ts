import prisma from '@/lib/prisma'
import type { AdaptiveAssignmentSummary } from '@/app/actions/test-group'
import type { ClassSummary } from '@/lib/class/actions'
import { cachedQuery } from '@/lib/cache/cached-query'
import { CacheTags, CacheTTL } from '@/lib/cache/tags'
import {
  mapSystemTestRows,
  mapTestGroupRows,
  systemTestsQuery,
  testGroupsQuery,
} from '@/lib/test-bank/queries'

async function loadTeacherTestBankPageDataUncached(
  teacherId: string,
  classId: string,
) {
  const [testRows, groupRows, classes, assignments, memberCount] =
    await prisma.$transaction([
      systemTestsQuery(),
      testGroupsQuery(),
      prisma.classroom.findMany({
        where: { teacherId },
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.classTest.findMany({
        where: { classId, isAdaptive: true },
        include: {
          testGroup: { select: { title: true, subject: true, topic: true } },
          adaptiveSessions: {
            where: { round2SubmissionId: { not: null } },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.classMember.count({ where: { classId } }),
    ])

  const classSummaries: ClassSummary[] = classes.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    maxCapacity: c.maxCapacity,
    memberCount: c._count.members,
    role: 'teacher',
  }))

  const adaptiveAssignments: AdaptiveAssignmentSummary[] = assignments.map((a) => ({
    classTestId: a.id,
    title: a.testGroup?.title ?? 'Cụm đề phân hóa',
    subject: a.testGroup?.subject ?? 'Toán',
    topic: a.testGroup?.topic ?? '',
    classId: a.classId,
    startTime: a.startTime.toISOString(),
    endTime: a.endTime.toISOString(),
    passScoreThreshold: a.passScoreThreshold,
    lowScoreThreshold: a.lowScoreThreshold,
    studentCompletedCount: a.adaptiveSessions.length,
    studentTotalCount: memberCount,
  }))

  return {
    tests: mapSystemTestRows(testRows),
    groups: mapTestGroupRows(groupRows),
    classes: classSummaries,
    adaptiveAssignments,
  }
}

/** Cached: global bank (~5m) + class adaptive slice. Bust via invalidateTestBank / invalidateAfterAssign. */
export async function loadTeacherTestBankPageData(
  teacherId: string,
  classId: string,
) {
  const cached = cachedQuery(loadTeacherTestBankPageDataUncached, {
    keyParts: ['teacher-test-bank'],
    tags: [
      CacheTags.testBank,
      CacheTags.testBankSystem,
      CacheTags.testBankGroups,
      CacheTags.adaptive(classId),
    ],
    revalidate: CacheTTL.testBank,
  })
  return cached(teacherId, classId)
}
