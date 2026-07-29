import prisma from '@/lib/prisma'
import { getInitials } from '@/lib/utils/initials'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StudentListItem {
  id: string
  fullName: string
  email: string
  initials: string
  quizCount: number
  avgScore: number | null
  lastActive: Date | null
}

export interface BehaviorSignal {
  type: 'CARELESS' | 'STUCK' | 'CONFIDENT' | 'STEADY'
  emoji: string
  label: string
  description: string
  count: number
}

export interface TopicMasteryItem {
  topic: string
  total: number
  correct: number
  accuracy: number  // 0-100
  status: 'WEAK' | 'MEDIUM' | 'MASTERED'
}

export interface ScoreHistoryEntry {
  submissionId: string
  testTitle: string
  score: number
  submittedAt: Date
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
  behaviorSignals: BehaviorSignal[]
  topicMastery: TopicMasteryItem[]
  scoreHistory: ScoreHistoryEntry[]
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getStudentsForClass(classId: string): Promise<StudentListItem[]> {
  const members = await prisma.classMember.findMany({
    where: { classId },
    include: {
      student: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { joinedAt: 'asc' },
  })

  const studentIds = members.map((m) => m.studentId)

  const submissionStats = await prisma.submission.groupBy({
    by: ['studentId'],
    where: { studentId: { in: studentIds }, test: { classId } },
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

  // All submissions
  const submissions = await prisma.submission.findMany({
    where: { studentId, test: { classId } },
    include: { test: { select: { id: true, title: true } } },
    orderBy: { submittedAt: 'desc' },
  })

  // All submission details (for behavior analysis + topic mastery)
  const allDetails = await prisma.submissionDetail.findMany({
    where: { submission: { studentId, test: { classId } } },
    select: {
      isCorrect: true,
      timeSpentSeconds: true,
      question: { select: { topic: true } },
    },
    take: 2000,
  })

  // ── Behavior signals ────────────────────────────────────────────────────────
  let fastWrong = 0   // wrong + < 15s → careless
  let slowWrong = 0   // wrong + > 120s → stuck
  let correctFast = 0 // correct + < 10s → confident
  let correctSteady = 0 // correct + 10-120s → steady

  for (const d of allDetails) {
    if (!d.isCorrect && d.timeSpentSeconds < 15) fastWrong++
    else if (!d.isCorrect && d.timeSpentSeconds > 120) slowWrong++
    else if (d.isCorrect && d.timeSpentSeconds < 10) correctFast++
    else if (d.isCorrect) correctSteady++
  }

  const behaviorSignals: BehaviorSignal[] = []
  if (fastWrong >= 2) behaviorSignals.push({
    type: 'CARELESS',
    emoji: '',
    label: 'Làm ẩu / Đánh lụi',
    description: `${fastWrong} câu sai trong < 15s — có thể đang đoán mò`,
    count: fastWrong,
  })
  if (slowWrong >= 2) behaviorSignals.push({
    type: 'STUCK',
    emoji: '',
    label: 'Bế tắc / Ngâm lâu',
    description: `${slowWrong} câu sai trong > 120s — gặp lỗ hổng kiến thức nghiêm trọng`,
    count: slowWrong,
  })
  if (correctFast >= 3) behaviorSignals.push({
    type: 'CONFIDENT',
    emoji: '',
    label: 'Chắc chắn / Tốc độ tốt',
    description: `${correctFast} câu đúng nhanh — nắm vững kiến thức`,
    count: correctFast,
  })
  if (correctSteady > 0) behaviorSignals.push({
    type: 'STEADY',
    emoji: '',
    label: 'Suy nghĩ cẩn thận',
    description: `${correctSteady} câu đúng với thời gian hợp lý`,
    count: correctSteady,
  })

  // ── Topic mastery matrix ────────────────────────────────────────────────────
  const topicMap = new Map<string, { total: number; correct: number }>()
  for (const d of allDetails) {
    const topic = d.question.topic || 'Chủ đề khác'
    if (!topicMap.has(topic)) topicMap.set(topic, { total: 0, correct: 0 })
    const entry = topicMap.get(topic)!
    entry.total++
    if (d.isCorrect) entry.correct++
  }

  const topicMastery: TopicMasteryItem[] = [...topicMap.entries()]
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
    .map(([topic, stats]) => {
      const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
      const status: TopicMasteryItem['status'] =
        accuracy >= 80 ? 'MASTERED' : accuracy >= 50 ? 'MEDIUM' : 'WEAK'
      return { topic, ...stats, accuracy, status }
    })

  // ── Weak topics (for AI prompt) ─────────────────────────────────────────────
  const wrongTopicMap = new Map<string, number>()
  for (const d of allDetails) {
    if (!d.isCorrect) {
      const t = d.question.topic || 'Chủ đề khác'
      wrongTopicMap.set(t, (wrongTopicMap.get(t) ?? 0) + 1)
    }
  }
  const weakTopics = [...wrongTopicMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, wrongCount]) => ({ topic, wrongCount }))

  // ── Score history (oldest first for trend chart) ────────────────────────────
  const scoreHistory: ScoreHistoryEntry[] = [...submissions]
    .reverse()
    .map((s) => ({
      submissionId: s.id,
      testTitle: s.test.title,
      score: Number(s.score),
      submittedAt: s.submittedAt,
    }))

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
    behaviorSignals,
    topicMastery,
    scoreHistory,
  }
}
