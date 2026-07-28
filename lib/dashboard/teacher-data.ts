import type { TeacherDashboardData } from '@/lib/teacher-types'
import prisma from '@/lib/prisma'
import { getInitials } from '@/lib/utils/initials'

export async function getTeacherDashboardData(
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

  const topicErrors = (
    await prisma.submissionDetail.groupBy({
      by: ['questionId'],
      where: {
        isCorrect: false,
        submission: { test: { classId } },
      },
      _count: { questionId: true },
      orderBy: { _count: { questionId: 'desc' } },
    })
  ).slice(0, 3)

  const questionIds = topicErrors.map((item) => item.questionId)
  const questions =
    questionIds.length > 0
      ? await prisma.question.findMany({
          where: { id: { in: questionIds } },
          select: { id: true, topic: true },
        })
      : []

  const questionMap = new Map(questions.map((question) => [question.id, question.topic]))
  const totalWrong = topicErrors.reduce((sum, item) => sum + item._count.questionId, 0)

  const classWeaknesses = topicErrors.map((item) => ({
    id: item.questionId,
    label: questionMap.get(item.questionId) ?? 'Chủ đề chưa xác định',
    wrongPercent:
      totalWrong > 0 ? Math.round((item._count.questionId / totalWrong) * 100) : 0,
    sampleNote: `${item._count.questionId} lượt trả lời sai trong lớp`,
  }))

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

  const assignedQuizzes = tests.map((test) => {
    const scores = test.submissions.map((submission) => Number(submission.score))
    const averageScore =
      scores.length > 0
        ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
        : 0

    return {
      id: test.id,
      title: test.title,
      deadline: `${test.timeLimitMinutes} phút`,
      submitted: test.submissions.length,
      total: studentCount,
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
