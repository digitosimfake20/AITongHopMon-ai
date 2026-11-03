import type { TeacherDashboardData } from '@/lib/teacher-types'
import prisma from '@/lib/prisma'
import { getQuizPackagesForClass } from '@/lib/quiz/queries'
import { getInitials } from '@/lib/utils/initials'
import { normalizeTopicName, topicToNodeId } from '@/lib/knowledge/topic-normalize'
import { cachedQuery } from '@/lib/cache/cached-query'
import { CacheTags, CacheTTL } from '@/lib/cache/tags'

type TopicWrongAgg = {
  topic: string
  wrong_count: number
  student_count: number
}

async function getTeacherDashboardDataUncached(
  teacherId: string,
  classId: string,
  fullName: string,
  className: string,
  studentCount: number,
): Promise<TeacherDashboardData> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [scoreAgg, testCount, recentSubmissionCount, topicWrongRows, lowScorers, quizPackages] =
    await Promise.all([
      prisma.submission.aggregate({
        where: { test: { classId } },
        _avg: { score: true },
      }),
      prisma.test.count({ where: { classId } }),
      prisma.submission.count({
        where: { test: { classId }, submittedAt: { gte: weekAgo } },
      }),
      prisma.$queryRaw<TopicWrongAgg[]>`
        SELECT
          COALESCE(NULLIF(TRIM(q.topic), ''), 'Chủ đề khác') AS topic,
          COUNT(*)::int AS wrong_count,
          COUNT(DISTINCT s.student_id)::int AS student_count
        FROM core.submission_details sd
        INNER JOIN core.submissions s ON s.id = sd.submission_id
        INNER JOIN core.tests t ON t.id = s.test_id
        INNER JOIN core.questions q ON q.id = sd.question_id
        WHERE t.class_id = ${classId}::uuid
          AND sd.is_correct = false
          AND q.type <> 'ESSAY'::core."QuestionType"
        GROUP BY COALESCE(NULLIF(TRIM(q.topic), ''), 'Chủ đề khác')
        ORDER BY wrong_count DESC
        LIMIT 12
      `,
      prisma.submission.groupBy({
        by: ['studentId'],
        where: { test: { classId } },
        _avg: { score: true },
      }),
      getQuizPackagesForClass(classId),
    ])

  const classAverage =
    scoreAgg._avg.score != null
      ? Math.round(Number(scoreAgg._avg.score) * 10) / 10
      : 0

  const weeklyTarget = studentCount * Math.max(testCount, 1)
  const weeklyCompletionRate =
    weeklyTarget > 0
      ? Math.min(100, Math.round((recentSubmissionCount / weeklyTarget) * 100))
      : 0

  // Aggregate by canonical topicKey (dedupe casing / whitespace variants)
  const byTopicKey = new Map<
    string,
    { label: string; wrongCount: number; studentIds: number }
  >()
  for (const row of topicWrongRows) {
    const label = normalizeTopicName(row.topic)
    const key = topicToNodeId(label)
    if (!byTopicKey.has(key)) {
      byTopicKey.set(key, { label, wrongCount: 0, studentIds: 0 })
    }
    const entry = byTopicKey.get(key)!
    entry.wrongCount += row.wrong_count
    // Distinct students per raw topic; summing across variants is a slight overcount
    // vs exact set-union, acceptable for the top-5 weakness chips.
    entry.studentIds += row.student_count
  }

  const classWeaknesses = [...byTopicKey.values()]
    .sort((a, b) => b.wrongCount - a.wrongCount)
    .slice(0, 5)
    .map((stats) => {
      const affected = Math.min(stats.studentIds, studentCount)
      const pct = studentCount > 0 ? Math.round((affected / studentCount) * 100) : 0
      return {
        id: topicToNodeId(stats.label),
        label: stats.label,
        wrongCount: stats.wrongCount,
        studentPercent: pct,
        wrongPercent: pct,
        sampleNote: `${stats.wrongCount} lượt sai · ${affected}/${studentCount} học sinh gặp khó`,
      }
    })

  const atRiskAgg = lowScorers
    .filter((item) => item._avg.score !== null && Number(item._avg.score) < 5)
    .sort((a, b) => Number(a._avg.score) - Number(b._avg.score))
    .slice(0, 3)

  const studentIds = atRiskAgg.map((item) => item.studentId)
  const students =
    studentIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: studentIds } },
          select: { id: true, fullName: true },
        })
      : []

  const studentMap = new Map(students.map((student) => [student.id, student.fullName]))
  const atRiskStudents = atRiskAgg.map((item) => {
    const name = studentMap.get(item.studentId) ?? 'Học sinh'
    const avg = item._avg.score ? Number(item._avg.score).toFixed(1) : '—'
    return {
      id: item.studentId,
      name,
      initials: getInitials(name),
      reason: `Điểm trung bình ${avg}/10 · cần hỗ trợ thêm`,
    }
  })

  const assignedQuizzes = quizPackages.map((pkg) => {
    const totalSubmitted = pkg.tests.reduce((sum, test) => sum + test.submittedCount, 0)
    const gradedScores = pkg.tests.filter((test) => test.submittedCount > 0).map((test) => test.averageScore)
    const averageScore =
      gradedScores.length > 0
        ? Math.round((gradedScores.reduce((sum, score) => sum + score, 0) / gradedScores.length) * 10) / 10
        : 0

    // Packages do not store submission deadlines here — surface time limits honestly.
    const durationMinutes =
      pkg.mode === 'ADAPTIVE_PACKAGE'
        ? pkg.tests.find((t) => t.difficultyLevel === 'MEDIUM')?.timeLimitMinutes ??
          pkg.tests[0]?.timeLimitMinutes ??
          0
        : pkg.tests[0]?.timeLimitMinutes ?? 0

    return {
      id: pkg.id,
      title: pkg.mode === 'ADAPTIVE_PACKAGE' ? `${pkg.title} (Dễ/TB/Khó)` : pkg.title,
      deadline: durationMinutes > 0 ? `${durationMinutes} phút` : 'Chưa đặt',
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

/** Cached per class. Bust via bustClassCaches / invalidateAfterSubmit. */
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
