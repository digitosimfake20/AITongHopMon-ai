import type { TeacherDashboardData } from '@/lib/teacher-types'
import prisma from '@/lib/prisma'
import { getQuizPackagesForClass } from '@/lib/quiz/queries'
import { getInitials } from '@/lib/utils/initials'
import { normalizeTopicName, topicToNodeId } from '@/lib/knowledge/topic-normalize'
import { cachedQuery } from '@/lib/cache/cached-query'
import { CacheTags, CacheTTL } from '@/lib/cache/tags'

async function getTeacherDashboardDataUncached(
  teacherId: string,
  classId: string,
  fullName: string,
  className: string,
  studentCount: number,
): Promise<TeacherDashboardData> {
  const tests = await prisma.test.findMany({
    where: { classId },
    orderBy: { createdAt: 'desc' },
    include: {
      submissions: {
        select: { score: true, submittedAt: true },
      },
    },
  })

  const allScores = tests.flatMap((test) =>
    test.submissions.map((submission) => Number(submission.score)),
  )

  const classAverage =
    allScores.length > 0
      ? Math.round((allScores.reduce((sum, score) => sum + score, 0) / allScores.length) * 10) / 10
      : 0

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const recentSubmissions = tests.flatMap((test) =>
    test.submissions.filter((submission) => submission.submittedAt >= weekAgo),
  )
  const weeklyTarget = studentCount * Math.max(tests.length, 1)
  const weeklyCompletionRate =
    weeklyTarget > 0
      ? Math.min(100, Math.round((recentSubmissions.length / weeklyTarget) * 100))
      : 0
  // Fetch all wrong answers for this class (capped to avoid OOM on large datasets)
  const wrongDetails = await prisma.submissionDetail.findMany({
    where: {
      isCorrect: false,
      submission: { test: { classId } },
    },
    select: {
      questionId: true,
      submission: { select: { studentId: true } },
    },
    take: 2000,
  })

  // Build topic map from unique questionIds
  const uniqueQIds = [...new Set(wrongDetails.map((d) => d.questionId))]
  const topicQuestions =
    uniqueQIds.length > 0
      ? await prisma.question.findMany({
          where: { id: { in: uniqueQIds } },
          select: { id: true, topic: true },
        })
      : []
  const topicByQId = new Map(topicQuestions.map((q) => [q.id, q.topic]))

  // Aggregate by canonical topicKey (dedupe casing / whitespace variants)
  const byTopicKey = new Map<
    string,
    { label: string; wrongCount: number; studentIds: Set<string> }
  >()
  for (const d of wrongDetails) {
    const raw = topicByQId.get(d.questionId) ?? 'Chủ đề khác'
    const label = normalizeTopicName(raw)
    const key = topicToNodeId(label)
    if (!byTopicKey.has(key)) {
      byTopicKey.set(key, { label, wrongCount: 0, studentIds: new Set() })
    }
    const entry = byTopicKey.get(key)!
    entry.wrongCount++
    entry.studentIds.add(d.submission.studentId)
  }

  const classWeaknesses = [...byTopicKey.values()]
    .sort((a, b) => b.wrongCount - a.wrongCount)
    .slice(0, 5)
    .map((stats) => {
      const pct = studentCount > 0 ? Math.round((stats.studentIds.size / studentCount) * 100) : 0
      return {
        id: topicToNodeId(stats.label),
        label: stats.label,
        wrongCount: stats.wrongCount,
        studentPercent: pct,
        wrongPercent: pct,
        sampleNote: `${stats.wrongCount} lượt sai — ${stats.studentIds.size}/${studentCount} học sinh gặp khó`,
      }
    })

  const lowScorers = (
    await prisma.submission.groupBy({
      by: ['studentId'],
      where: { test: { classId } },
      _avg: { score: true },
    })
  )
    .filter((item) => item._avg.score !== null && Number(item._avg.score) < 5)
    .sort((a, b) => Number(a._avg.score) - Number(b._avg.score))
    .slice(0, 3)

  const studentIds = lowScorers.map((item) => item.studentId)
  const students =
    studentIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: studentIds } },
          select: { id: true, fullName: true },
        })
      : []

  const studentMap = new Map(students.map((student) => [student.id, student.fullName]))
  const atRiskStudents = lowScorers.map((item) => {
    const name = studentMap.get(item.studentId) ?? 'Học sinh'
    const avg = item._avg.score ? Number(item._avg.score).toFixed(1) : '—'
    return {
      id: item.studentId,
      name,
      initials: getInitials(name),
      reason: `Điểm trung bình ${avg}/10 — cần hỗ trợ thêm`,
    }
  })

  const quizPackages = await getQuizPackagesForClass(classId)
  const assignedQuizzes = quizPackages.map((pkg) => {
    const totalSubmitted = pkg.tests.reduce((sum, test) => sum + test.submittedCount, 0)
    const gradedScores = pkg.tests.filter((test) => test.submittedCount > 0).map((test) => test.averageScore)
    const averageScore =
      gradedScores.length > 0
        ? Math.round((gradedScores.reduce((sum, score) => sum + score, 0) / gradedScores.length) * 10) / 10
        : 0

    return {
      id: pkg.id,
      title: pkg.mode === 'ADAPTIVE_PACKAGE' ? `${pkg.title} (Dễ/TB/Khó)` : pkg.title,
      deadline: pkg.mode === 'ADAPTIVE_PACKAGE' ? '3 mức độ' : `${pkg.tests[0]?.timeLimitMinutes ?? 0} phút`,
      submitted: totalSubmitted,
      total: studentCount * Math.max(pkg.tests.length, 1),
      averageScore,
    }
  })

  return {
    teacherName: fullName,
    initials: getInitials(fullName),
    className,
    subject: 'Môn Toán',
    studentCount,
    classAverage,
    weeklyCompletionRate,
    classWeaknesses,
    atRiskStudents,
    assignedQuizzes,
  }
}

/** Cached per class (~90s). Bust via bustClassCaches / invalidateAfterSubmit. */
export async function getTeacherDashboardData(
  teacherId: string,
  classId: string,
  fullName: string,
  className: string,
  studentCount: number,
): Promise<TeacherDashboardData> {
  const cached = cachedQuery(getTeacherDashboardDataUncached, {
    keyParts: ['teacher-dash'],
    tags: [
      CacheTags.teacherDash(classId),
      CacheTags.submissions(classId),
      CacheTags.packages(classId),
    ],
    revalidate: CacheTTL.teacherDash,
  })
  return cached(teacherId, classId, fullName, className, studentCount)
}
