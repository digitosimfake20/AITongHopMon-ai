import type { StudentDashboardData } from '@/lib/dashboard-types'
import prisma from '@/lib/prisma'
import { getInitials } from '@/lib/utils/initials'
import { cachedQuery } from '@/lib/cache/cached-query'
import { CacheTags, CacheTTL } from '@/lib/cache/tags'
import { asDate } from '@/lib/cache/revive'
import { computeStreakDays } from '@/lib/dashboard/streak'
import {
  MASTERY_STATUS_MASTERED,
  MASTERY_STATUS_PROGRESSING,
} from '@/lib/knowledge/mastery-labels'

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

type CachedStudentDash = Omit<StudentDashboardData, 'zenoUpdatedAt'> & {
  zenoUpdatedAtIso: string | null
}

async function getStudentDashboardDataUncached(
  userId: string,
  classId: string,
  fullName: string,
  classLabel: string,
): Promise<CachedStudentDash> {
  const [tests, submissions, knowledgeStates, cognitiveProfile, globalMemory] =
    await prisma.$transaction([
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
        select: { timeSpentSeconds: true, submittedAt: true },
      }),
      prisma.studentKnowledgeState.findMany({
        where: { studentId: userId },
        include: { node: true },
        orderBy: { pMastery: 'asc' },
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

  const streakDays = computeStreakDays(submissions.map((s) => s.submittedAt))

  const weakTopics = knowledgeStates
    .filter((state) => Number(state.pMastery) < MASTERY_STATUS_MASTERED)
    .slice(0, 5)
    .map((state) => ({
      id: state.nodeId,
      label: state.node.title,
      accuracy: Math.round(Number(state.pMastery) * 100),
      severity:
        Number(state.pMastery) < MASTERY_STATUS_PROGRESSING
          ? ('weak' as const)
          : ('moderate' as const),
    }))

  const topWeak = weakTopics[0]?.label
  const adaptiveTitle = topWeak
    ? `Luyện theo lỗ hổng: ${topWeak}`
    : cognitiveProfile?.strengthsSummary[0]
      ? `Củng cố điểm mạnh: ${cognitiveProfile.strengthsSummary[0]}`
      : 'Luyện tập theo hồ sơ kiến thức'

  const adaptiveDescription =
    weakTopics.length > 0
      ? `Trộn câu từ kho đề theo ${weakTopics.length} chủ đề còn yếu — không phải AI sinh đề mới.`
      : 'Hoàn thành bài kiểm tra để hệ thống ghi nhận điểm yếu và gợi ý luyện tập.'

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

  const keyInsights = globalMemory?.keyInsights as
    | { curatedInsight?: string }
    | null
    | undefined
  const zenoInsight =
    keyInsights?.curatedInsight?.trim() ||
    (weakTopics.length > 0
      ? `Ưu tiên luyện: ${weakTopics
          .slice(0, 2)
          .map((t) => t.label)
          .join(', ')}.`
      : `Chào ${firstName}! Làm bài kiểm tra để Zeno xây hồ sơ kiến thức của bạn.`)

  return {
    studentName: firstName,
    initials: getInitials(fullName),
    classLabel,
    masteryScore,
    masteryPercent,
    completedQuizzes,
    studyHours,
    streakDays,
    adaptiveChapter: adaptiveTitle,
    adaptiveTitle,
    adaptiveDescription,
    weakTopics,
    zenoInsight,
    zenoUpdatedAtIso: globalMemory?.updatedAt?.toISOString() ?? null,
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

/** Cached per student (~45s). Relative "updated at" is formatted after cache hit. */
export async function getStudentDashboardData(
  userId: string,
  classId: string,
  fullName: string,
  classLabel: string,
): Promise<StudentDashboardData> {
  const cached = cachedQuery(getStudentDashboardDataUncached, {
    keyParts: ['student-dash'],
    tags: [
      CacheTags.studentDash(userId),
      CacheTags.knowledge(userId),
      CacheTags.quizBank(classId),
    ],
    revalidate: CacheTTL.studentDash,
  })
  const data = await cached(userId, classId, fullName, classLabel)
  const { zenoUpdatedAtIso, ...rest } = data
  const updated = asDate(zenoUpdatedAtIso)
  return {
    ...rest,
    zenoUpdatedAt: updated ? formatRelativeTime(updated) : 'Chưa có dữ liệu AI',
  }
}
