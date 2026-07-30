import type { StudentDashboardData } from '@/lib/dashboard-types'
import prisma from '@/lib/prisma'
import { getInitials } from '@/lib/utils/initials'

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Vừa cập nhật'
  if (minutes < 60) return `Cập nhật ${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Cập nhật ${hours} giờ trước`
  const days = Math.floor(hours / 24)
  return `Cập nhật ${days} ngày trước`
}

export async function getStudentDashboardData(
  userId: string,
  classId: string,
  fullName: string,
  classLabel: string,
): Promise<StudentDashboardData> {
  const [tests, submissions, knowledgeStates, cognitiveProfile, globalMemory] =
    await Promise.all([
      prisma.test.findMany({
        where: { classId },
        orderBy: { createdAt: 'desc' },
        include: {
          submissions: {
            where: { studentId: userId },
            orderBy: { submittedAt: 'desc' },
            take: 1,
            select: { id: true, score: true, submittedAt: true },
          },
        },
      }),
      prisma.submission.findMany({
        where: {
          studentId: userId,
          test: { classId },
        },
        select: { timeSpentSeconds: true },
      }),
      prisma.studentKnowledgeState.findMany({
        where: { studentId: userId },
        include: { node: true },
        orderBy: { pMastery: 'asc' },
        take: 5,
      }),
      prisma.studentCognitiveProfile.findUnique({ where: { studentId: userId } }),
      prisma.globalAgentMemory.findUnique({ where: { studentId: userId } }),
    ])

  const masteryPercent =
    knowledgeStates.length > 0
      ? Math.round(
          (knowledgeStates.reduce((sum, state) => sum + Number(state.pMastery), 0) /
            knowledgeStates.length) *
            100,
        )
      : 0

  const masteryScore = Math.round((masteryPercent / 100) * 10 * 10) / 10
  const completedQuizzes = submissions.length
  const studyHours =
    Math.round(
      (submissions.reduce((sum, item) => sum + item.timeSpentSeconds, 0) / 3600) * 10,
    ) / 10

  const weakTopics = knowledgeStates
    .filter((state) => Number(state.pMastery) < 0.7)
    .slice(0, 3)
    .map((state) => ({
      id: state.nodeId,
      label: state.node.title,
      accuracy: Math.round(Number(state.pMastery) * 100),
      severity: Number(state.pMastery) < 0.5 ? ('weak' as const) : ('moderate' as const),
    }))

  const adaptiveTitle =
    cognitiveProfile?.strengthsSummary[0] ??
    knowledgeStates[0]?.node.title ??
    'Bài tập thích ứng sắp ra mắt'

  const assignments = tests.map((test) => {
    const latest = test.submissions[0]
    if (latest) {
      return {
        id: test.id,
        title: test.title,
        status: 'completed' as const,
        score: `${Number(latest.score).toFixed(1)}/10`,
        submissionId: latest.id,
      }
    }
    return {
      id: test.id,
      title: test.title,
      status: 'pending' as const,
      deadline: `${test.timeLimitMinutes} phút`,
    }
  })

  const firstName = fullName.split(/\s+/)[0] ?? fullName

  return {
    studentName: firstName,
    initials: getInitials(fullName),
    classLabel,
    masteryScore,
    masteryPercent,
    completedQuizzes,
    studyHours,
    streakDays: 0,
    adaptiveChapter: adaptiveTitle,
    adaptiveTitle,
    adaptiveDescription:
      cognitiveProfile?.weaknessesSummary.join('. ') ??
      'Hệ thống sẽ chọn câu hỏi phù hợp khi bạn bắt đầu luyện tập.',
    weakTopics,
    zenoInsight:
      globalMemory?.longTermSummary ??
      `Chào ${firstName}! Hãy tham gia bài kiểm tra hoặc trò chuyện với Zeno để nhận gợi ý cá nhân hóa.`,
    zenoUpdatedAt: globalMemory
      ? formatRelativeTime(globalMemory.updatedAt)
      : 'Chưa có dữ liệu AI',
    assignments,
    cognitiveProfile: cognitiveProfile
      ? {
          personaType: cognitiveProfile.personaType,
          avgSpeed: Math.round(Number(cognitiveProfile.avgSpeedPerQuestion)),
          carelessRate: Math.round(Number(cognitiveProfile.carelessErrorRate) * 100),
          strengths: cognitiveProfile.strengthsSummary,
          weaknesses: cognitiveProfile.weaknessesSummary,
        }
      : null,
  }
}
