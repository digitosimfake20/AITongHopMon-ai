import prisma from '@/lib/prisma'
import { getInitials } from '@/lib/utils/initials'
import {
  masteryStatusFromP,
  MASTERY_STATUS_PROGRESSING,
  type MasteryLabelStatus,
} from '@/lib/knowledge/mastery-labels'

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
  topicKey?: string
  /** Session / lifetime correct count when from submissions; else estimated from BKT */
  total: number
  correct: number
  /** Percent 0–100 — for BKT rows this is round(pMastery * 100) */
  accuracy: number
  status: MasteryLabelStatus
  pMastery?: number
  source: 'bkt' | 'submission'
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

type BehaviorAggRow = {
  fast_wrong: number
  slow_wrong: number
  correct_fast: number
  correct_steady: number
}

type TopicAggRow = {
  topic: string
  total: number
  correct: number
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getStudentsForClass(classId: string): Promise<StudentListItem[]> {
  const members = await prisma.classMember.findMany({
    where: { classId },
    include: { student: { select: { id: true, fullName: true, email: true } } },
    orderBy: { joinedAt: 'asc' },
  })

  const studentIds = members.map((m) => m.studentId)

  const submissionStats =
    studentIds.length === 0
      ? []
      : await prisma.submission.groupBy({
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

function behaviorAggQuery(studentId: string, classId: string) {
  return prisma.$queryRaw<BehaviorAggRow[]>`
    SELECT
      COALESCE(SUM(CASE WHEN NOT sd.is_correct AND sd.time_spent_seconds < 15 THEN 1 ELSE 0 END), 0)::int AS fast_wrong,
      COALESCE(SUM(CASE WHEN NOT sd.is_correct AND sd.time_spent_seconds > 120 THEN 1 ELSE 0 END), 0)::int AS slow_wrong,
      COALESCE(SUM(CASE WHEN sd.is_correct AND sd.time_spent_seconds < 10 THEN 1 ELSE 0 END), 0)::int AS correct_fast,
      COALESCE(SUM(CASE WHEN sd.is_correct AND sd.time_spent_seconds >= 10 AND sd.time_spent_seconds <= 120 THEN 1 ELSE 0 END), 0)::int AS correct_steady
    FROM core.submission_details sd
    INNER JOIN core.submissions s ON s.id = sd.submission_id
    INNER JOIN core.tests t ON t.id = s.test_id
    WHERE s.student_id = ${studentId}::uuid
      AND t.class_id = ${classId}::uuid
  `
}

function topicAggQuery(studentId: string, classId: string) {
  return prisma.$queryRaw<TopicAggRow[]>`
    SELECT
      MIN(COALESCE(NULLIF(TRIM(q.topic), ''), 'Chủ đề khác')) AS topic,
      COUNT(*)::int AS total,
      SUM(CASE WHEN sd.is_correct THEN 1 ELSE 0 END)::int AS correct
    FROM core.submission_details sd
    INNER JOIN core.submissions s ON s.id = sd.submission_id
    INNER JOIN core.tests t ON t.id = s.test_id
    INNER JOIN core.questions q ON q.id = sd.question_id
    WHERE s.student_id = ${studentId}::uuid
      AND t.class_id = ${classId}::uuid
    GROUP BY COALESCE(
      NULLIF(TRIM(q.topic_key), ''),
      LOWER(REGEXP_REPLACE(TRIM(COALESCE(NULLIF(q.topic, ''), 'Chủ đề khác')), '\\s+', ' ', 'g'))
    )
  `
}

function buildBehaviorSignals(row: BehaviorAggRow): BehaviorSignal[] {
  const signals: BehaviorSignal[] = []
  if (row.fast_wrong >= 2) {
    signals.push({
      type: 'CARELESS',
      emoji: '',
      label: 'Làm ẩu / Đánh lụi',
      description: `${row.fast_wrong} câu sai trong < 15s — có thể đang đoán mò`,
      count: row.fast_wrong,
    })
  }
  if (row.slow_wrong >= 2) {
    signals.push({
      type: 'STUCK',
      emoji: '',
      label: 'Bế tắc / Ngâm lâu',
      description: `${row.slow_wrong} câu sai trong > 120s — gặp lỗ hổng kiến thức nghiêm trọng`,
      count: row.slow_wrong,
    })
  }
  if (row.correct_fast >= 3) {
    signals.push({
      type: 'CONFIDENT',
      emoji: '',
      label: 'Chắc chắn / Tốc độ tốt',
      description: `${row.correct_fast} câu đúng nhanh — nắm vững kiến thức`,
      count: row.correct_fast,
    })
  }
  if (row.correct_steady > 0) {
    signals.push({
      type: 'STEADY',
      emoji: '',
      label: 'Suy nghĩ cẩn thận',
      description: `${row.correct_steady} câu đúng với thời gian hợp lý`,
      count: row.correct_steady,
    })
  }
  return signals
}

function buildTopicMasteryFromBkt(
  states: Array<{
    nodeId: string
    pMastery: unknown
    node: { title: string }
  }>,
): TopicMasteryItem[] {
  return states
    .map((s) => {
      const pMastery = Number(s.pMastery)
      const accuracy = Math.round(pMastery * 100)
      return {
        topic: s.node.title,
        topicKey: s.nodeId,
        total: 0,
        correct: 0,
        accuracy,
        status: masteryStatusFromP(pMastery),
        pMastery,
        source: 'bkt' as const,
      }
    })
    .sort((a, b) => a.accuracy - b.accuracy)
}

/** Fallback when student has submissions but no BKT states yet */
function buildTopicMasteryFromSubmissions(rows: TopicAggRow[]): TopicMasteryItem[] {
  return rows
    .map((row) => {
      const accuracy = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0
      return {
        topic: row.topic,
        total: row.total,
        correct: row.correct,
        accuracy,
        status: masteryStatusFromP(accuracy / 100),
        source: 'submission' as const,
      }
    })
    .sort((a, b) => a.accuracy - b.accuracy)
}

export async function getStudentDetail(
  studentId: string,
  classId: string,
): Promise<StudentDetail | null> {
  // Sequential queries — do NOT wrap in $transaction on PgBouncer (1 connection).
  // Each query releases the pool slot quickly under concurrent load.
  const membership = await prisma.classMember.findFirst({
    where: { classId, studentId },
    include: { student: { select: { id: true, fullName: true, email: true } } },
  })
  if (!membership) return null

  const submissions = await prisma.submission.findMany({
    where: { studentId, test: { classId } },
    include: { test: { select: { id: true, title: true } } },
    orderBy: { submittedAt: 'desc' },
  })
  const behaviorRows = await behaviorAggQuery(studentId, classId)
  const [bktStates, topicRows] = await Promise.all([
    prisma.studentKnowledgeState.findMany({
      where: { studentId },
      include: { node: { select: { title: true } } },
      orderBy: { pMastery: 'asc' },
    }),
    topicAggQuery(studentId, classId),
  ])

  const student = membership.student
  const behavior = behaviorRows[0] ?? {
    fast_wrong: 0,
    slow_wrong: 0,
    correct_fast: 0,
    correct_steady: 0,
  }
  const topicMastery =
    bktStates.length > 0
      ? buildTopicMasteryFromBkt(bktStates)
      : buildTopicMasteryFromSubmissions(topicRows)

  const weakTopics = topicMastery
    .filter((t) => t.status !== 'MASTERED')
    .map((t) => ({
      topic: t.topic,
      wrongCount:
        t.source === 'submission'
          ? Math.max(0, t.total - t.correct)
          : t.pMastery != null && t.pMastery < MASTERY_STATUS_PROGRESSING
            ? 2
            : 1,
    }))
    .slice(0, 5)

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
    behaviorSignals: buildBehaviorSignals(behavior),
    topicMastery,
    scoreHistory,
  }
}
