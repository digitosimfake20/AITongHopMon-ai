import prisma from '@/lib/prisma'
import { cachedQuery } from '@/lib/cache/cached-query'
import { CacheTags, CacheTTL } from '@/lib/cache/tags'
import type { AdaptiveAssignmentSummary } from '@/app/actions/test-group'

/**
 * Slim class-scoped adaptive assignment list (ids, titles, completion counts).
 * Deep per-student progress lives on `/teacher/adaptive/[classTestId]`.
 */
async function listAdaptiveAssignmentsUncached(
  classId: string,
): Promise<AdaptiveAssignmentSummary[]> {
  const [assignments, memberCount] = await prisma.$transaction([
    prisma.classTest.findMany({
      where: { classId, isAdaptive: true },
      select: {
        id: true,
        classId: true,
        startTime: true,
        endTime: true,
        passScoreThreshold: true,
        lowScoreThreshold: true,
        testGroup: { select: { title: true, subject: true, topic: true } },
        _count: {
          select: {
            adaptiveSessions: {
              where: { round2SubmissionId: { not: null } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.classMember.count({ where: { classId } }),
  ])

  return assignments.map((a) => ({
    classTestId: a.id,
    title: a.testGroup?.title ?? 'Cụm đề phân hóa',
    subject: a.testGroup?.subject ?? 'Toán',
    topic: a.testGroup?.topic ?? '',
    classId: a.classId,
    startTime: a.startTime.toISOString(),
    endTime: a.endTime.toISOString(),
    passScoreThreshold: a.passScoreThreshold,
    lowScoreThreshold: a.lowScoreThreshold,
    studentCompletedCount: a._count.adaptiveSessions,
    studentTotalCount: memberCount,
  }))
}

/** Cached adaptive list — bust via CacheTags.adaptive / submissions on assign+submit. */
export async function listAdaptiveAssignmentsForClass(
  classId: string,
): Promise<AdaptiveAssignmentSummary[]> {
  const cached = cachedQuery(listAdaptiveAssignmentsUncached, {
    keyParts: ['adaptive-list'],
    tags: [CacheTags.adaptive(classId), CacheTags.submissions(classId)],
    revalidate: CacheTTL.adaptive,
  })
  return cached(classId)
}
