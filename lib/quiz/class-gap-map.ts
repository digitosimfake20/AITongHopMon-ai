import prisma from '@/lib/prisma'
import { getInitials } from '@/lib/utils/initials'
import {
  getTopicClusterDef,
  inferTopicCluster,
  masteryStatusFromPercent,
} from '@/lib/knowledge/topic-clusters'
import {
  mergeStatsByCanonicalKey,
  resolveTopicCanonicalSync,
  type CanonicalTopic,
} from '@/lib/knowledge/topic-canonicalize-ai'
import { normalizeTopicName, topicToNodeId } from '@/lib/knowledge/topic-normalize'
import { computeClassCompletionDetail } from '@/lib/quiz/class-completion-stats'
import { criticalGapHeadline } from '@/lib/quiz/critical-gap-display'
import type { QuestionType } from '@/lib/quiz/types'
import {
  gapWrongPercent,
  inferGrade,
  studentTierFromAvg,
  tierGroupPercent,
  type ClassGapMapData,
  type ClassStrengthRow,
  type CriticalGap,
  type GapStudentChip,
  type StudentTierGroup,
  type StudentTierMember,
  type TopicClusterSummary,
  type TopicMasteryRow,
} from '@/lib/quiz/class-gap-map-shared'

export type {
  ClassGapMapData,
  ClassGapMapStats,
  ClassStrengthRow,
  CriticalGap,
  GapStudentChip,
  StudentTierGroup,
  StudentTierMember,
  TopicClusterSummary,
  TopicMasteryRow,
} from '@/lib/quiz/class-gap-map-shared'

export {
  gapWrongPercent,
  inferGrade,
  pickNeedsSupportRemedialTopic,
  studentTierFromAvg,
  tierGroupPercent,
} from '@/lib/quiz/class-gap-map-shared'

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
  question_type: string | null
  content: string | null
  explanation: string | null
  q_topic: string | null
}

type QuestionStudentRow = {
  question_id: string
  student_id: string
  full_name: string
}

type SubmissionAvgRow = {
  student_id: string
  avg_score: number | null
  full_name: string
}

type GapMapSqlPayload = {
  topics: TopicAggRow[]
  studentTopics: StudentTopicRow[]
  questionWrongs: QuestionWrongRow[]
  wrongStudents: QuestionStudentRow[]
  submissionAvgs: SubmissionAvgRow[]
  completedPairs: number
  testCount: number
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function parseGapMapPayload(raw: unknown): GapMapSqlPayload {
  const obj =
    typeof raw === 'string'
      ? (JSON.parse(raw) as Record<string, unknown>)
      : ((raw ?? {}) as Record<string, unknown>)

  return {
    topics: asArray<TopicAggRow>(obj.topics),
    studentTopics: asArray<StudentTopicRow>(obj.studentTopics),
    questionWrongs: asArray<QuestionWrongRow>(obj.questionWrongs),
    wrongStudents: asArray<QuestionStudentRow>(obj.wrongStudents),
    submissionAvgs: asArray<SubmissionAvgRow>(obj.submissionAvgs),
    completedPairs: Number(obj.completedPairs ?? 0),
    testCount: Number(obj.testCount ?? 0),
  }
}

/**
 * GET/read-safe topic merge: existing TopicCanonicalAlias rows + rule sync only.
 * Never calls OpenAI / ensureTopicsCanonicalized (write/ingest path owns AI).
 */
async function resolveTopicsFromAliasesOnly(
  rawLabels: string[],
): Promise<Map<string, CanonicalTopic>> {
  const normalized = [...new Set(rawLabels.map(normalizeTopicName).filter(Boolean))]
  const result = new Map<string, CanonicalTopic>()
  if (normalized.length === 0) return result

  const aliasKeys = normalized.map((l) => topicToNodeId(l))
  const cached = await prisma.topicCanonicalAlias.findMany({
    where: { aliasKey: { in: aliasKeys } },
    select: { aliasKey: true, canonicalKey: true, canonicalLabel: true },
  })
  const cacheByAlias = new Map(cached.map((r) => [r.aliasKey, r]))

  for (const label of normalized) {
    const hit = cacheByAlias.get(topicToNodeId(label))
    result.set(
      label,
      hit
        ? { topicName: hit.canonicalLabel, topicKey: hit.canonicalKey }
        : resolveTopicCanonicalSync(label),
    )
  }
  return result
}

/**
 * Single round-trip: class-scoped aggregates via shared CTE (avoids scanning
 * submission_details 4–5 times). Safe under PgBouncer connection_limit=1.
 */
async function fetchClassGapMapSql(classId: string): Promise<GapMapSqlPayload> {
  const rows = await prisma.$queryRaw<{ payload: unknown }[]>`
    WITH base AS (
      SELECT
        sd.question_id,
        sd.is_correct,
        s.student_id,
        s.test_id,
        s.score,
        q.topic,
        q.topic_key,
        q.type AS question_type,
        q.content,
        q.explanation,
        COALESCE(
          NULLIF(TRIM(q.topic_key), ''),
          LOWER(REGEXP_REPLACE(TRIM(COALESCE(NULLIF(q.topic, ''), 'Chủ đề khác')), '\\s+', ' ', 'g'))
        ) AS topic_key_resolved,
        COALESCE(NULLIF(TRIM(q.topic), ''), 'Chủ đề khác') AS topic_label_raw
      FROM core.submission_details sd
      INNER JOIN core.submissions s ON s.id = sd.submission_id
      INNER JOIN core.tests t ON t.id = s.test_id
      INNER JOIN core.questions q ON q.id = sd.question_id
      WHERE t.class_id = ${classId}::uuid
    ),
    scorable AS (
      SELECT * FROM base
      WHERE question_type <> 'ESSAY'::core."QuestionType"
    ),
    topic_agg AS (
      SELECT
        topic_key_resolved AS topic_key,
        MIN(topic_label_raw) AS topic_label,
        COUNT(*)::int AS total,
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::int AS correct
      FROM scorable
      GROUP BY topic_key_resolved
    ),
    student_topic_agg AS (
      SELECT
        student_id,
        topic_key_resolved AS topic_key,
        MIN(topic_label_raw) AS topic_label,
        COUNT(*)::int AS total,
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::int AS correct
      FROM scorable
      GROUP BY student_id, topic_key_resolved
    ),
    question_wrong AS (
      SELECT
        question_id,
        topic_label_raw AS topic,
        COUNT(*)::int AS wrong_count,
        COUNT(DISTINCT student_id)::int AS student_count,
        (array_agg(question_type::text))[1] AS question_type,
        (array_agg(content))[1] AS content,
        (array_agg(explanation))[1] AS explanation,
        (array_agg(NULLIF(TRIM(topic), '')))[1] AS q_topic
      FROM scorable
      WHERE is_correct = false
      GROUP BY question_id, topic_label_raw
      ORDER BY wrong_count DESC
      LIMIT 6
    ),
    wrong_students AS (
      SELECT DISTINCT
        sc.question_id,
        sc.student_id,
        u.full_name
      FROM scorable sc
      INNER JOIN question_wrong qw ON qw.question_id = sc.question_id
      INNER JOIN core.users u ON u.id = sc.student_id
      WHERE sc.is_correct = false
    ),
    submission_avgs AS (
      SELECT
        s.student_id,
        AVG(s.score)::float AS avg_score,
        MIN(u.full_name) AS full_name
      FROM core.submissions s
      INNER JOIN core.tests t ON t.id = s.test_id
      INNER JOIN core.users u ON u.id = s.student_id
      WHERE t.class_id = ${classId}::uuid
      GROUP BY s.student_id
    ),
    completion AS (
      SELECT COUNT(*)::int AS cnt FROM (
        SELECT DISTINCT s.student_id, s.test_id
        FROM core.submissions s
        INNER JOIN core.tests t ON t.id = s.test_id
        WHERE t.class_id = ${classId}::uuid
      ) pairs
    ),
    test_count AS (
      SELECT COUNT(*)::int AS cnt
      FROM core.tests
      WHERE class_id = ${classId}::uuid
    )
    SELECT jsonb_build_object(
      'topics', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'topic_key', topic_key,
          'topic_label', topic_label,
          'total', total,
          'correct', correct
        )) FROM topic_agg
      ), '[]'::jsonb),
      'studentTopics', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'student_id', student_id,
          'topic_key', topic_key,
          'topic_label', topic_label,
          'total', total,
          'correct', correct
        )) FROM student_topic_agg
      ), '[]'::jsonb),
      'questionWrongs', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'question_id', question_id,
          'topic', topic,
          'wrong_count', wrong_count,
          'student_count', student_count,
          'question_type', question_type,
          'content', content,
          'explanation', explanation,
          'q_topic', q_topic
        ) ORDER BY wrong_count DESC) FROM question_wrong
      ), '[]'::jsonb),
      'wrongStudents', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'question_id', question_id,
          'student_id', student_id,
          'full_name', full_name
        )) FROM wrong_students
      ), '[]'::jsonb),
      'submissionAvgs', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'student_id', student_id,
          'avg_score', avg_score,
          'full_name', full_name
        )) FROM submission_avgs
      ), '[]'::jsonb),
      'completedPairs', COALESCE((SELECT cnt FROM completion), 0),
      'testCount', COALESCE((SELECT cnt FROM test_count), 0)
    ) AS payload
  `

  return parseGapMapPayload(rows[0]?.payload)
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

  // One SQL RTT for all class-scoped aggregates (serial Prisma waterfall → CTE).
  // Alias lookup stays a second RTT — depends on topic labels from SQL.
  const sql = await fetchClassGapMapSql(classId)

  const allLabels = [
    ...sql.topics.map((r) => r.topic_label),
    ...sql.studentTopics.map((r) => r.topic_label),
  ]
  const canon = await resolveTopicsFromAliasesOnly(allLabels)

  const mergedTopicRows = mergeStatsByCanonicalKey(sql.topics, canon)

  const mergedStudentRowsMap = new Map<
    string,
    { student_id: string; topic_key: string; topic_label: string; total: number; correct: number }
  >()
  for (const row of sql.studentTopics) {
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

  const studentNameMap = new Map<string, string>()
  for (const row of sql.wrongStudents) {
    studentNameMap.set(row.student_id, row.full_name)
  }
  for (const row of sql.submissionAvgs) {
    studentNameMap.set(row.student_id, row.full_name)
  }

  const studentsByQuestion = new Map<string, Set<string>>()
  for (const row of sql.wrongStudents) {
    if (!studentsByQuestion.has(row.question_id)) {
      studentsByQuestion.set(row.question_id, new Set())
    }
    studentsByQuestion.get(row.question_id)!.add(row.student_id)
  }

  const criticalGaps: CriticalGap[] = sql.questionWrongs.slice(0, 4).map((row) => {
    const affectedIds = [...(studentsByQuestion.get(row.question_id) ?? [])]
    const wrongPercent = gapWrongPercent(row.student_count, studentCount)
    const topic = row.q_topic?.trim() || row.topic

    return {
      id: row.question_id,
      title: criticalGapHeadline(row.content, row.topic),
      topic,
      questionType: (row.question_type ?? 'MULTIPLE_CHOICE') as QuestionType,
      wrongPercent,
      description:
        row.explanation?.trim() ||
        `Nhiều học sinh mắc lỗi ở dạng bài "${row.topic}". Cần ôn lại quy tắc và làm thêm ví dụ minh họa.`,
      sampleQuestion: row.content?.trim() || row.topic,
      commonMistake: null,
      affectedStudents: affectedIds.slice(0, 24).map((id) => {
        const name = studentNameMap.get(id) ?? 'Học sinh'
        return { id, fullName: name, initials: getInitials(name) }
      }),
    }
  })

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

  for (const stat of sql.submissionAvgs) {
    const avg = stat.avg_score != null ? Number(stat.avg_score) : 0
    const name = studentNameMap.get(stat.student_id) ?? stat.full_name ?? 'Học sinh'
    const member: StudentTierMember = {
      id: stat.student_id,
      fullName: name,
      initials: getInitials(name),
      avgScore: Math.round(avg * 10) / 10,
      strongTopics: (studentStrongTopics.get(stat.student_id) ?? []).slice(0, 3),
    }
    const tier = studentTierFromAvg(avg)
    if (tier === 'excellent') excellent.push(member)
    else if (tier === 'good') good.push(member)
    else needsSupport.push(member)
  }

  const sortByScore = (a: StudentTierMember, b: StudentTierMember) => b.avgScore - a.avgScore
  excellent.sort(sortByScore)
  good.sort(sortByScore)
  needsSupport.sort(sortByScore)

  const tierGroups: StudentTierGroup[] = [
    {
      id: 'excellent',
      label: 'Nhóm Giỏi',
      description: 'Điểm TB ≥ 8.5 — sẵn sàng thử thách nâng cao',
      students: excellent,
      percent: tierGroupPercent(excellent.length, studentCount),
    },
    {
      id: 'good',
      label: 'Nhóm Khá',
      description: 'Điểm TB 5–8.4 — cần luyện thêm dạng bài (theo điểm bài kiểm tra, không phải BKT)',
      students: good,
      percent: tierGroupPercent(good.length, studentCount),
    },
    {
      id: 'needsSupport',
      label: 'Nhóm Cần củng cố',
      description: 'Điểm TB bài kiểm tra < 5 — ưu tiên phụ đạo (không đồng nghĩa BKT/mastery)',
      students: needsSupport,
      percent: tierGroupPercent(needsSupport.length, studentCount),
    },
  ]

  const allScores = sql.submissionAvgs
    .map((s) => (s.avg_score != null ? Number(s.avg_score) : null))
    .filter((s): s is number => s != null)
  const classAverage =
    allScores.length > 0
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
      : 0

  const completion = computeClassCompletionDetail(
    studentCount,
    sql.testCount,
    sql.completedPairs,
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

/** Cached per class (~5m). Bust on submit / assign / roster via classGap + submissions tags. */
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
  // Trust cached null — re-running uncached on every null doubles cold miss cost.
  // Ownership/empty-class nulls are correct; submit/roster tags bust stale entries.
  return cached(classId, teacherId)
}
