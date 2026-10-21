import prisma from '@/lib/prisma'
import { getInitials } from '@/lib/utils/initials'
import {
  getTopicClusterDef,
  inferTopicCluster,
  masteryStatusFromPercent,
  type MasteryStatus,
} from '@/lib/knowledge/topic-clusters'
import {
  ensureTopicsCanonicalized,
  mergeStatsByCanonicalKey,
  resolveTopicCanonicalSync,
} from '@/lib/knowledge/topic-canonicalize-ai'
import { normalizeTopicName } from '@/lib/knowledge/topic-normalize'
import { computeClassCompletionDetail } from '@/lib/quiz/class-completion-stats'
import { criticalGapHeadline } from '@/lib/quiz/critical-gap-display'
import type { QuestionType } from '@/lib/quiz/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClassGapMapStats {
  studentCount: number
  classAverage: number
  completionRate: number
  /** HS×bài đã có ít nhất một lượt nộp / HS×bài được giao */
  completionDetail: { completedSlots: number; expectedSlots: number }
  needsAttentionCount: number
  /** How metrics on this page are computed (not BKT pMastery). */
  aggregationNote: string
}

export interface TopicMasteryRow {
  topic: string
  clusterId: string
  masteryPercent: number
  status: MasteryStatus
  weakStudentCount: number
  totalAttempts: number
}

export interface TopicClusterSummary {
  clusterId: string
  label: string
  topicCount: number
  avgMastery: number
  weakTopics: number
  masteredTopics: number
}

export interface GapStudentChip {
  id: string
  fullName: string
  initials: string
}

export interface CriticalGap {
  id: string
  /** Distinct headline (question stem), not only topic label */
  title: string
  topic: string
  questionType: QuestionType
  wrongPercent: number
  description: string
  sampleQuestion: string
  commonMistake: string | null
  affectedStudents: GapStudentChip[]
}

export interface StudentTierMember {
  id: string
  fullName: string
  initials: string
  avgScore: number
  strongTopics: string[]
}

export interface StudentTierGroup {
  id: 'excellent' | 'good' | 'needsSupport'
  label: string
  description: string
  students: StudentTierMember[]
  percent: number
}

export interface ClassStrengthRow {
  topic: string
  masteryPercent: number
  masteredStudentCount: number
}

export interface ClassGapMapData {
  className: string
  subject: string
  grade: string
  chapterHint: string
  stats: ClassGapMapStats
  strengths: ClassStrengthRow[]
  topicMastery: TopicMasteryRow[]
  topicClusters: TopicClusterSummary[]
  criticalGaps: CriticalGap[]
  tierGroups: StudentTierGroup[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function inferGrade(className: string): string {
  const match = className.match(/\b([6-9]|1[0-2])[A-Za-z]/i)
  return match?.[1] ?? '8'
}

type TopicAggRow = {
  topic_key: string
  topic_label: string
  total: number
  correct: number
}

type StudentTopicRow = {
  student_id: string
  topic_key: string
  topic_label: string
  total: number
  correct: number
}

type QuestionWrongRow = {
  question_id: string
  topic: string
  wrong_count: number
  student_count: number
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

async function getClassGapMapDataUncached(
  classId: string,
  teacherId: string,
): Promise<ClassGapMapData | null> {
  const classroom = await prisma.classroom.findFirst({
    where: { id: classId, teacherId },
    include: { _count: { select: { members: true } } },
  })
  if (!classroom) return null

  const studentCount = classroom._count.members
  const grade = inferGrade(classroom.name)

  const topicRows = await prisma.$queryRaw<TopicAggRow[]>`
    SELECT
      COALESCE(
        NULLIF(TRIM(q.topic_key), ''),
        LOWER(REGEXP_REPLACE(TRIM(COALESCE(NULLIF(q.topic, ''), 'Chủ đề khác')), '\\s+', ' ', 'g'))
      ) AS topic_key,
      MIN(COALESCE(NULLIF(TRIM(q.topic), ''), 'Chủ đề khác')) AS topic_label,
      COUNT(*)::int AS total,
      SUM(CASE WHEN sd.is_correct THEN 1 ELSE 0 END)::int AS correct
    FROM core.submission_details sd
    INNER JOIN core.submissions s ON s.id = sd.submission_id
    INNER JOIN core.tests t ON t.id = s.test_id
    INNER JOIN core.questions q ON q.id = sd.question_id
    WHERE t.class_id = ${classId}::uuid
      AND q.type <> 'ESSAY'::core."QuestionType"
    GROUP BY COALESCE(
      NULLIF(TRIM(q.topic_key), ''),
      LOWER(REGEXP_REPLACE(TRIM(COALESCE(NULLIF(q.topic, ''), 'Chủ đề khác')), '\\s+', ' ', 'g'))
    )
  `

  const studentTopicRows =
    studentCount > 0
      ? await prisma.$queryRaw<StudentTopicRow[]>`
          SELECT
            s.student_id,
            COALESCE(
              NULLIF(TRIM(q.topic_key), ''),
              LOWER(REGEXP_REPLACE(TRIM(COALESCE(NULLIF(q.topic, ''), 'Chủ đề khác')), '\\s+', ' ', 'g'))
            ) AS topic_key,
            MIN(COALESCE(NULLIF(TRIM(q.topic), ''), 'Chủ đề khác')) AS topic_label,
            COUNT(*)::int AS total,
            SUM(CASE WHEN sd.is_correct THEN 1 ELSE 0 END)::int AS correct
          FROM core.submission_details sd
          INNER JOIN core.submissions s ON s.id = sd.submission_id
          INNER JOIN core.tests t ON t.id = s.test_id
          INNER JOIN core.questions q ON q.id = sd.question_id
          WHERE t.class_id = ${classId}::uuid
            AND q.type <> 'ESSAY'::core."QuestionType"
          GROUP BY s.student_id, COALESCE(
            NULLIF(TRIM(q.topic_key), ''),
            LOWER(REGEXP_REPLACE(TRIM(COALESCE(NULLIF(q.topic, ''), 'Chủ đề khác')), '\\s+', ' ', 'g'))
          )
        `
      : []

  const allLabels = [
    ...topicRows.map((r) => r.topic_label),
    ...studentTopicRows.map((r) => r.topic_label),
  ]
  const canon = await ensureTopicsCanonicalized(allLabels, classroom.subject)

  const mergedTopicRows = mergeStatsByCanonicalKey(topicRows, canon)

  const mergedStudentRowsMap = new Map<
    string,
    { student_id: string; topic_key: string; topic_label: string; total: number; correct: number }
  >()
  for (const row of studentTopicRows) {
    const label = normalizeTopicName(row.topic_label)
    const c = canon.get(label) ?? resolveTopicCanonicalSync(label)
    const mapKey = `${row.student_id}:${c.topicKey}`
    const existing = mergedStudentRowsMap.get(mapKey)
    if (!existing) {
      mergedStudentRowsMap.set(mapKey, {
        student_id: row.student_id,
        topic_key: c.topicKey,
        topic_label: c.topicName,
        total: row.total,
        correct: row.correct,
      })
    } else {
      existing.total += row.total
      existing.correct += row.correct
    }
  }
  const mergedStudentTopicRows = [...mergedStudentRowsMap.values()]

  const weakByTopicKey = new Map<string, number>()
  for (const row of mergedStudentTopicRows) {
    const accuracy = row.total > 0 ? (row.correct / row.total) * 100 : 0
    if (accuracy < 50) {
      weakByTopicKey.set(row.topic_key, (weakByTopicKey.get(row.topic_key) ?? 0) + 1)
    }
  }

  const topicMastery: TopicMasteryRow[] = mergedTopicRows
    .map((row) => {
      const topic = normalizeTopicName(row.topic_label)
      const masteryPercent =
        row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0
      return {
        topic,
        clusterId: inferTopicCluster(topic),
        masteryPercent,
        status: masteryStatusFromPercent(masteryPercent),
        weakStudentCount: weakByTopicKey.get(row.topic_key) ?? 0,
        totalAttempts: row.total,
      }
    })
    .sort((a, b) => a.masteryPercent - b.masteryPercent)

  const clusterMap = new Map<string, TopicMasteryRow[]>()
  for (const row of topicMastery) {
    if (!clusterMap.has(row.clusterId)) clusterMap.set(row.clusterId, [])
    clusterMap.get(row.clusterId)!.push(row)
  }

  const topicClusters: TopicClusterSummary[] = [...clusterMap.entries()].map(
    ([clusterId, rows]) => {
      const avgMastery =
        rows.length > 0
          ? Math.round(rows.reduce((s, r) => s + r.masteryPercent, 0) / rows.length)
          : 0
      return {
        clusterId,
        label: getTopicClusterDef(clusterId).label,
        topicCount: rows.length,
        avgMastery,
        weakTopics: rows.filter((r) => r.status === 'GAP').length,
        masteredTopics: rows.filter((r) => r.status === 'MASTERED').length,
      }
    },
  )

  const strengths: ClassStrengthRow[] = topicMastery
    .filter((t) => t.masteryPercent >= 80)
    .sort((a, b) => b.masteryPercent - a.masteryPercent)
    .slice(0, 5)
    .map((t) => ({
      topic: t.topic,
      masteryPercent: t.masteryPercent,
      masteredStudentCount: studentCount - t.weakStudentCount,
    }))

  const chapterHint =
    topicMastery.length > 0
      ? topicMastery.reduce((best, row) =>
          row.totalAttempts > best.totalAttempts ? row : best,
        ).topic
      : 'Tổng hợp kiến thức'

  const questionWrongRows = await prisma.$queryRaw<QuestionWrongRow[]>`
    SELECT
      sd.question_id,
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
    GROUP BY sd.question_id, COALESCE(NULLIF(TRIM(q.topic), ''), 'Chủ đề khác')
    ORDER BY wrong_count DESC
    LIMIT 6
  `

  const questionIds = questionWrongRows.map((r) => r.question_id)
  const questions =
    questionIds.length > 0
      ? await prisma.question.findMany({
          where: { id: { in: questionIds } },
          select: {
            id: true,
            type: true,
            content: true,
            explanation: true,
            topic: true,
          },
        })
      : []
  const questionById = new Map(questions.map((q) => [q.id, q]))

  const wrongStudentRows =
    questionIds.length > 0
      ? await prisma.submissionDetail.findMany({
          where: {
            isCorrect: false,
            questionId: { in: questionIds },
            question: { type: { not: 'ESSAY' } },
            submission: { test: { classId } },
          },
          select: {
            questionId: true,
            submission: { select: { studentId: true } },
          },
          take: 3000,
        })
      : []

  const studentIdsForGaps = [
    ...new Set(wrongStudentRows.map((r) => r.submission.studentId)),
  ]
  const gapStudents =
    studentIdsForGaps.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: studentIdsForGaps } },
          select: { id: true, fullName: true },
        })
      : []
  const studentNameMap = new Map(gapStudents.map((s) => [s.id, s.fullName]))

  const studentsByQuestion = new Map<string, Set<string>>()
  for (const row of wrongStudentRows) {
    if (!studentsByQuestion.has(row.questionId)) {
      studentsByQuestion.set(row.questionId, new Set())
    }
    studentsByQuestion.get(row.questionId)!.add(row.submission.studentId)
  }

  const criticalGaps: CriticalGap[] = questionWrongRows.slice(0, 4).map((row) => {
    const meta = questionById.get(row.question_id)
    const affectedIds = [...(studentsByQuestion.get(row.question_id) ?? [])]
    const wrongPercent =
      studentCount > 0 ? Math.round((row.student_count / studentCount) * 1000) / 10 : 0

    return {
      id: row.question_id,
      title: criticalGapHeadline(meta?.content, row.topic),
      topic: meta?.topic?.trim() || row.topic,
      questionType: (meta?.type ?? 'MULTIPLE_CHOICE') as QuestionType,
      wrongPercent,
      description:
        meta?.explanation?.trim() ||
        `Nhiều học sinh mắc lỗi ở dạng bài "${row.topic}". Cần ôn lại quy tắc và làm thêm ví dụ minh họa.`,
      sampleQuestion: meta?.content?.trim() || row.topic,
      commonMistake: null,
      affectedStudents: affectedIds.slice(0, 24).map((id) => {
        const name = studentNameMap.get(id) ?? 'Học sinh'
        return { id, fullName: name, initials: getInitials(name) }
      }),
    }
  })

  const submissionStats = await prisma.submission.groupBy({
    by: ['studentId'],
    where: { test: { classId } },
    _avg: { score: true },
    _count: { id: true },
  })

  const allStudentIds = submissionStats.map((s) => s.studentId)
  const tierStudentRecords =
    allStudentIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: allStudentIds } },
          select: { id: true, fullName: true },
        })
      : []
  const tierNameMap = new Map(tierStudentRecords.map((s) => [s.id, s.fullName]))

  const studentStrongTopics = new Map<string, string[]>()
  for (const row of mergedStudentTopicRows) {
    const accuracy = row.total > 0 ? (row.correct / row.total) * 100 : 0
    if (accuracy >= 80) {
      if (!studentStrongTopics.has(row.student_id)) {
        studentStrongTopics.set(row.student_id, [])
      }
      const list = studentStrongTopics.get(row.student_id)!
      const label = normalizeTopicName(row.topic_label)
      if (!list.includes(label)) list.push(label)
    }
  }

  const excellent: StudentTierMember[] = []
  const good: StudentTierMember[] = []
  const needsSupport: StudentTierMember[] = []

  for (const stat of submissionStats) {
    const avg = stat._avg.score != null ? Number(stat._avg.score) : 0
    const name = tierNameMap.get(stat.studentId) ?? 'Học sinh'
    const member: StudentTierMember = {
      id: stat.studentId,
      fullName: name,
      initials: getInitials(name),
      avgScore: Math.round(avg * 10) / 10,
      strongTopics: (studentStrongTopics.get(stat.studentId) ?? []).slice(0, 3),
    }
    if (avg >= 8.5) excellent.push(member)
    else if (avg >= 5) good.push(member)
    else needsSupport.push(member)
  }

  const sortByScore = (a: StudentTierMember, b: StudentTierMember) => b.avgScore - a.avgScore
  excellent.sort(sortByScore)
  good.sort(sortByScore)
  needsSupport.sort(sortByScore)

  const pct = (n: number) =>
    studentCount > 0 ? Math.round((n / studentCount) * 100) : 0

  const tierGroups: StudentTierGroup[] = [
    {
      id: 'excellent',
      label: 'Nhóm Giỏi',
      description: 'Điểm TB ≥ 8.5 — sẵn sàng thử thách nâng cao',
      students: excellent,
      percent: pct(excellent.length),
    },
    {
      id: 'good',
      label: 'Nhóm Khá',
      description: 'Điểm TB 5–8.4 — cần luyện thêm dạng bài (theo điểm bài kiểm tra, không phải BKT)',
      students: good,
      percent: pct(good.length),
    },
    {
      id: 'needsSupport',
      label: 'Nhóm Cần củng cố',
      description: 'Điểm TB bài kiểm tra < 5 — ưu tiên phụ đạo (không đồng nghĩa BKT/mastery)',
      students: needsSupport,
      percent: pct(needsSupport.length),
    },
  ]

  const allScores = submissionStats
    .map((s) => (s._avg.score != null ? Number(s._avg.score) : null))
    .filter((s): s is number => s != null)
  const classAverage =
    allScores.length > 0
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
      : 0

  const tests = await prisma.test.findMany({
    where: { classId },
    select: { id: true },
  })
  const completedPairs =
    tests.length > 0 && studentCount > 0
      ? await prisma.$queryRaw<{ cnt: number }[]>`
          SELECT COUNT(*)::int AS cnt FROM (
            SELECT DISTINCT s.student_id, s.test_id
            FROM core.submissions s
            INNER JOIN core.tests t ON t.id = s.test_id
            WHERE t.class_id = ${classId}::uuid
          ) pairs
        `
      : [{ cnt: 0 }]
  const completion = computeClassCompletionDetail(
    studentCount,
    tests.length,
    completedPairs[0]?.cnt ?? 0,
  )

  const aggregationNote =
    'Chỉ số % chủ đề = tỷ lệ câu đúng trên mọi lượt làm (câu tự chấm; ESSAY lịch sử nếu có thì loại). HS yếu = accuracy chủ đề <50% trên lượt làm. Lỗ hổng cấp thiết = từng câu hỏi — % HS từng sai ≥1 lần (nhiều câu cùng chủ đề có thể liệt kê riêng). HS cần chú ý = điểm TB bài <5. Khác BKT trên hồ sơ học sinh.'

  return {
    className: classroom.name,
    subject: `${classroom.subject} ${grade}`,
    grade,
    chapterHint,
    stats: {
      studentCount,
      classAverage,
      completionRate: completion.completionRate,
      completionDetail: {
        completedSlots: completion.completedSlots,
        expectedSlots: completion.expectedSlots,
      },
      needsAttentionCount: needsSupport.length,
      aggregationNote,
    },
    strengths,
    topicMastery,
    topicClusters,
    criticalGaps,
    tierGroups,
  }
}

/** Cached per class (~3m). Bust on submit / assign / roster. */
export async function getClassGapMapData(
  classId: string,
  teacherId: string,
): Promise<ClassGapMapData | null> {
  const { cachedQuery } = await import('@/lib/cache/cached-query')
  const { CacheTags, CacheTTL } = await import('@/lib/cache/tags')

  const cached = cachedQuery(getClassGapMapDataUncached, {
    keyParts: ['class-gap'],
    tags: [
      CacheTags.classGap(classId),
      CacheTags.submissions(classId),
    ],
    revalidate: CacheTTL.classGap,
  })
  const data = await cached(classId, teacherId)
  // Do not treat cached null as authoritative (stale miss / ownership edge cases).
  if (data) return data
  return getClassGapMapDataUncached(classId, teacherId)
}
