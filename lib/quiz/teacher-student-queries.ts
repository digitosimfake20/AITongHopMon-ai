import prisma from '@/lib/prisma'
import { getInitials } from '@/lib/utils/initials'

export interface StudentListItem {
  id: string
  fullName: string
  email: string
  initials: string
  quizCount: number
  avgScore: number | null
  lastActive: Date | null
}

export interface StudentSubmissionSummary {
  submissionId: string
  testId: string
  testTitle: string
  score: number
  totalPoints: number
  timeSpentSeconds: number
  submittedAt: Date
}

export interface StudentDetail {
  id: string
  fullName: string
  email: string
  initials: string
  quizCount: number
  avgScore: number | null
  submissions: StudentSubmissionSummary[]
  weakTopics: Array<{ topic: string; wrongCount: number }>
}

export async function getStudentsForClass(classId: string): Promise<StudentListItem[]> {
  const members = await prisma.classMember.findMany({
    where: { classId },
    include: {
      student: {
        select: { id: true, fullName: true, email: true },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })

  const studentIds = members.map((m) => m.studentId)

  // Fetch submission stats per student
  const submissionStats = await prisma.submission.groupBy({
    by: ['studentId'],
    where: {
      studentId: { in: studentIds },
      test: { classId },
    },
    _count: { id: true },
    _avg: { score: true },
    _max: { submittedAt: true },
  })

  const statsByStudent = new Map(submissionStats.map((s) => [s.studentId, s]))

  return members.map((m) => {
    const stats = statsByStudent.get(m.studentId)
    return {
      id: m.student.id,
      fullName: m.student.fullName,
      email: m.student.email,
      initials: getInitials(m.student.fullName),
      quizCount: stats?._count.id ?? 0,
      avgScore: stats?._avg.score != null ? Number(stats._avg.score) : null,
      lastActive: stats?._max.submittedAt ?? null,
    }
  })
}

export async function getStudentDetail(
  studentId: string,
  classId: string,
): Promise<StudentDetail | null> {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, fullName: true, email: true },
  })

  if (!student) return null

  const submissions = await prisma.submission.findMany({
    where: {
      studentId,
      test: { classId },
    },
    include: {
      test: { select: { id: true, title: true } },
    },
    orderBy: { submittedAt: 'desc' },
  })

  // Wrong answers grouped by question topic
  const wrongDetails = await prisma.submissionDetail.findMany({
    where: {
      isCorrect: false,
      submission: { studentId, test: { classId } },
    },
    select: { questionId: true },
    take: 500,
  })

  const uniqueQIds = [...new Set(wrongDetails.map((d) => d.questionId))]
  const topicQuestions =
    uniqueQIds.length > 0
      ? await prisma.question.findMany({
          where: { id: { in: uniqueQIds } },
          select: { id: true, topic: true },
        })
      : []
  const topicByQId = new Map(topicQuestions.map((q) => [q.id, q.topic]))

  const topicCount = new Map<string, number>()
  for (const d of wrongDetails) {
    const t = topicByQId.get(d.questionId) ?? 'Chủ đề khác'
    topicCount.set(t, (topicCount.get(t) ?? 0) + 1)
  }

  const weakTopics = [...topicCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, wrongCount]) => ({ topic, wrongCount }))

  const scores = submissions.map((s) => Number(s.score))
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null

  return {
    id: student.id,
    fullName: student.fullName,
    email: student.email,
    initials: getInitials(student.fullName),
    quizCount: submissions.length,
    avgScore,
    submissions: submissions.map((s) => ({
      submissionId: s.id,
      testId: s.test.id,
      testTitle: s.test.title,
      score: Number(s.score),
      totalPoints: 10,
      timeSpentSeconds: s.timeSpentSeconds,
      submittedAt: s.submittedAt,
    })),
    weakTopics,
  }
}
