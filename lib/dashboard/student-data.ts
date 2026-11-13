import type { StudentDashboardData } from '@/lib/dashboard-types'
import prisma from '@/lib/prisma'
import { getInitials } from '@/lib/utils/initials'
import { cachedQuery } from '@/lib/cache/cached-query'
import { CacheTags, CacheTTL } from '@/lib/cache/tags'
import { asDate } from '@/lib/cache/revive'
import { computeStreakDays } from '@/lib/dashboard/streak'
import { MASTERY_STATUS_MASTERED } from '@/lib/knowledge/mastery-labels'
import { getDashboardAssignments } from '@/lib/dashboard/student-assignment-queries'
import {
  mapWeakTopics,
  masteryPercentFromAvg,
  studyHoursFromSeconds,
} from '@/lib/dashboard/student-dashboard-metrics'

/** Server-only relative label (RSC string prop). Not recomputed on the client. */
function formatRelativeTime(date: Date, nowMs = Date.now()): string {
  const diffMs = Math.max(0, nowMs - date.getTime())
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Vừa cập nhật'
  if (minutes < 60) return `Cập nhật ${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Cập nhật ${hours} giờ trước`
  const days = Math.floor(hours / 24)
  return `Cập nhật ${days} ngày trước`
}

export type StudentShellStats = {
  masteryScore: number
  streakDays: number
}

type CachedStudentDash = Omit<
  StudentDashboardData,
  'zenoUpdatedAt' | 'masteryScore' | 'streakDays'
> & {
  zenoUpdatedAtIso: string | null
}

/**
 * Lean chrome stats (mastery avg + streak dates only). Shared by layout shell
 * and dashboard page via unstable_cache; busted with studentDash/knowledge on submit.
 */
async function getStudentShellStatsUncached(userId: string): Promise<StudentShellStats> {
  const [agg, streakSubs] = await Promise.all([
    prisma.studentKnowledgeState.aggregate({
      where: { studentId: userId },
      _avg: { pMastery: true },
      _count: { _all: true },
    }),
    prisma.submission.findMany({
      where: { studentId: userId },
      select: { submittedAt: true },
      orderBy: { submittedAt: 'desc' },
      take: 90,
    }),
  ])

  const masteryScore =
    agg._count._all > 0 && agg._avg.pMastery != null
      ? Math.round(Number(agg._avg.pMastery) * 100) / 10
      : 0

  return {
    masteryScore,
    streakDays: computeStreakDays(streakSubs.map((s) => s.submittedAt)),
  }
}

export async function getStudentShellStats(userId: string): Promise<StudentShellStats> {
  const cached = cachedQuery(getStudentShellStatsUncached, {
    keyParts: ['student-shell-stats'],
    tags: [CacheTags.studentDash(userId), CacheTags.knowledge(userId)],
    revalidate: CacheTTL.studentShell,
  })
  return cached(userId)
}

async function getStudentDashboardDataUncached(
  userId: string,
  classId: string,
  fullName: string,
  classLabel: string,
): Promise<CachedStudentDash> {
  // connection_limit=1: a parallel $transaction (assignments) makes the other
  // reads wait on the pool and throw P2024 once that wait passes 10s.
  const submissionAgg = await prisma.submission.aggregate({
    where: {
      studentId: userId,
      test: { classId },
    },
    _count: { _all: true },
    _sum: { timeSpentSeconds: true },
  })
  const masteryAgg = await prisma.studentKnowledgeState.aggregate({
    where: { studentId: userId },
    _avg: { pMastery: true },
    _count: { _all: true },
  })
  const weakStates = await prisma.studentKnowledgeState.findMany({
    where: {
      studentId: userId,
      pMastery: { lt: MASTERY_STATUS_MASTERED },
    },
    orderBy: { pMastery: 'asc' },
    take: 5,
    select: {
      nodeId: true,
      pMastery: true,
      node: { select: { title: true } },
    },
  })
  const cognitiveProfile = await prisma.studentCognitiveProfile.findUnique({
    where: { studentId: userId },
    select: {
      personaType: true,
      avgSpeedPerQuestion: true,
      carelessErrorRate: true,
      strengthsSummary: true,
      weaknessesSummary: true,
    },
  })
  const globalMemory = await prisma.globalAgentMemory.findUnique({
    where: { studentId: userId },
    select: { keyInsights: true, updatedAt: true },
  })
  const assignments = await getDashboardAssignments(classId, userId)

  const masteryPercent = masteryPercentFromAvg(
    masteryAgg._avg.pMastery != null ? Number(masteryAgg._avg.pMastery) : null,
    masteryAgg._count._all,
  )

  const completedQuizzes = submissionAgg._count._all
  const studyHours = studyHoursFromSeconds(submissionAgg._sum.timeSpentSeconds ?? 0)

  const weakTopics = mapWeakTopics(weakStates)

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
    masteryPercent,
    completedQuizzes,
    studyHours,
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

/** Cached per student (~45s). Mastery/streak come from shared shell-stats cache. */
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
  const shellStats = await getStudentShellStats(userId)
  const { zenoUpdatedAtIso, ...rest } = data
  const updated = asDate(zenoUpdatedAtIso)
  return {
    ...rest,
    masteryScore: shellStats.masteryScore,
    streakDays: shellStats.streakDays,
    zenoUpdatedAt: updated ? formatRelativeTime(updated) : 'Chưa có dữ liệu AI',
  }
}
