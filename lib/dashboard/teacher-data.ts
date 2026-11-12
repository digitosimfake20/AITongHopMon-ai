import type { TeacherDashboardData } from '@/lib/teacher-types'
import prisma from '@/lib/prisma'
import { getQuizPackagesForClass } from '@/lib/quiz/queries'
import { computeWeeklyCompletionRate } from '@/lib/quiz/class-completion-stats'
import { pickAtRiskStudents } from '@/lib/dashboard/teacher-at-risk'
import { getInitials } from '@/lib/utils/initials'
import { normalizeTopicName, topicToNodeId } from '@/lib/knowledge/topic-normalize'
import { cachedQuery } from '@/lib/cache/cached-query'
import { CacheTags, CacheTTL } from '@/lib/cache/tags'

type AtRiskSqlRow = {
  student_id: string
  avg_score: number
}

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

  const [scoreAgg, weekTestCount, recentSubmissionCount, topicWrongRows, atRiskRows, quizPackages] =
    await Promise.all([
      prisma.submission.aggregate({
        where: { test: { classId } },
        _avg: { score: true },
      }),
      // Week-scoped expected slots: tests created/assigned in the window, not all-time.
      prisma.test.count({ where: { classId, createdAt: { gte: weekAgo } } }),
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
      // Push HAVING / ORDER / LIMIT into SQL — avoid loading every student's avg into JS.
      prisma.$queryRaw<AtRiskSqlRow[]>`
        SELECT
          s.student_id::text AS student_id,
          AVG(s.score)::float AS avg_score
        FROM core.submissions s
        INNER JOIN core.tests t ON t.id = s.test_id
        WHERE t.class_id = ${classId}::uuid
        GROUP BY s.student_id
        HAVING AVG(s.score) < 5
        ORDER BY AVG(s.score) ASC
        LIMIT 3
      `,
      getQuizPackagesForClass(classId, 'dash'),
    ])

  const classAverage =
    scoreAgg._avg.score != null
      ? Math.round(Number(scoreAgg._avg.score) * 10) / 10
      : 0

  const weeklyCompletionRate = computeWeeklyCompletionRate(
    studentCount,
    weekTestCount,
    recentSubmissionCount,
  )

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

  const atRiskAgg = pickAtRiskStudents(
    atRiskRows.map((row) => ({
      studentId: row.student_id,
      avgScore: Number(row.avg_score),
    })),
  )

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
    const avg = item.avgScore.toFixed(1)
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
