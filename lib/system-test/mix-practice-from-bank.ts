import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { publishSystemTestSchema } from '@/lib/validations/system-test'
import { normalizeTopicName, topicToNodeId } from '@/lib/knowledge/topic-normalize'
import type { z } from 'zod'

type ParsedQuestion = z.infer<typeof publishSystemTestSchema.shape.questions>[number]

/** Cap full JSON rows shipped to Node — DB prefilters by topic first. */
export const PRACTICE_BANK_CANDIDATE_LIMIT = 24

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Match bank question topics to weak-topic keys (exported for unit tests). */
export function topicMatches(questionTopic: string, weakTopics: string[]): boolean {
  const qKey = topicToNodeId(normalizeTopicName(questionTopic))
  return weakTopics.some((weak) => {
    const wKey = topicToNodeId(normalizeTopicName(weak))
    return (
      qKey === wKey ||
      qKey.includes(wKey) ||
      wKey.includes(qKey) ||
      normalizeTopicName(questionTopic)
        .toLowerCase()
        .includes(normalizeTopicName(weak).toLowerCase())
    )
  })
}

/** Build ILIKE / equality needles from weak topic titles + optional topicKeys. */
export function buildPracticeTopicNeedles(
  weakTopics: string[],
  topicKeys?: string[],
): string[] {
  const needles = new Set<string>()
  for (const t of weakTopics) {
    const name = normalizeTopicName(t).toLowerCase()
    if (name) needles.add(name)
    needles.add(topicToNodeId(t))
  }
  for (const key of topicKeys ?? []) {
    const k = key.trim().toLowerCase()
    if (k) needles.add(k)
  }
  return [...needles].filter(Boolean)
}

function topicMatchSql(needles: string[]): Prisma.Sql {
  if (needles.length === 0) return Prisma.sql`TRUE`
  const clauses = needles.map((needle) => {
    const pattern = `%${needle}%`
    return Prisma.sql`(
      lower(coalesce(tg.topic, '')) LIKE ${pattern}
      OR lower(coalesce(st.title, '')) LIKE ${pattern}
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(CASE
          WHEN jsonb_typeof(st.questions::jsonb) = 'array' THEN st.questions::jsonb
          ELSE '[]'::jsonb
        END) AS q
        WHERE lower(coalesce(q->>'topic', '')) LIKE ${pattern}
           OR lower(coalesce(q->>'topicKey', '')) LIKE ${pattern}
           OR lower(coalesce(q->>'topic_key', '')) = ${needle}
      )
    )`
  })
  return Prisma.sql`(${Prisma.join(clauses, ' OR ')})`
}

type BankRow = {
  id: string
  title: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | null
  questions: unknown
  group_topic: string | null
}

async function fetchPracticeBankCandidates(needles: string[]): Promise<BankRow[]> {
  return prisma.$queryRaw<BankRow[]>`
    SELECT
      st.id,
      st.title,
      st.difficulty::text AS difficulty,
      st.questions,
      tg.topic AS group_topic
    FROM core.system_tests st
    LEFT JOIN core.test_groups tg ON tg.id = st.group_id
    WHERE st.difficulty IN (
      'EASY'::core."DifficultyLevel",
      'MEDIUM'::core."DifficultyLevel"
    )
      AND ${topicMatchSql(needles)}
    ORDER BY st.created_at DESC
    LIMIT ${PRACTICE_BANK_CANDIDATE_LIMIT}
  `
}

async function fetchFallbackBankRows(): Promise<BankRow[]> {
  return prisma.$queryRaw<BankRow[]>`
    SELECT
      st.id,
      st.title,
      st.difficulty::text AS difficulty,
      st.questions,
      tg.topic AS group_topic
    FROM core.system_tests st
    LEFT JOIN core.test_groups tg ON tg.id = st.group_id
    WHERE st.difficulty IN (
      'EASY'::core."DifficultyLevel",
      'MEDIUM'::core."DifficultyLevel"
    )
    ORDER BY st.created_at DESC
    LIMIT 5
  `
}

export interface MixedPracticeResult {
  questions: ParsedQuestion[]
  sourceTitles: string[]
  primaryWeakTopic: string
  weakFormLabel: string
}

export async function collectPracticeQuestionsFromBank(
  weakTopics: string[],
  options?: { targetCount?: number; topicKeys?: string[] },
): Promise<MixedPracticeResult> {
  const targetCount = options?.targetCount ?? 6
  const easyTarget = Math.ceil(targetCount / 2)
  const mediumTarget = targetCount - easyTarget
  const primaryWeakTopic = weakTopics[0] ?? 'Chủ đề chung'
  const needles = buildPracticeTopicNeedles(weakTopics, options?.topicKeys)

  const systemTests =
    needles.length > 0
      ? await fetchPracticeBankCandidates(needles)
      : await fetchFallbackBankRows()

  const easyPool: ParsedQuestion[] = []
  const mediumPool: ParsedQuestion[] = []
  const sourceTitles = new Set<string>()

  for (const systemTest of systemTests) {
    const parsed = publishSystemTestSchema.shape.questions.safeParse(systemTest.questions)
    if (!parsed.success) continue

    const fallbackTopic = systemTest.group_topic?.trim() || systemTest.title

    for (const question of parsed.data) {
      const questionTopic = question.topic?.trim() || fallbackTopic
      if (!topicMatches(questionTopic, weakTopics)) continue

      const enriched = { ...question, topic: questionTopic }
      if (systemTest.difficulty === 'EASY') {
        easyPool.push(enriched)
      } else {
        mediumPool.push(enriched)
      }
      sourceTitles.add(systemTest.title)
    }
  }

  let picked = [
    ...shuffle(easyPool).slice(0, easyTarget),
    ...shuffle(mediumPool).slice(0, mediumTarget),
  ]

  if (picked.length < targetCount) {
    const combined = shuffle([...easyPool, ...mediumPool])
    for (const q of combined) {
      if (picked.length >= targetCount) break
      if (!picked.includes(q)) picked.push(q)
    }
  }

  if (picked.length === 0) {
    const fallbackTests = await fetchFallbackBankRows()
    for (const systemTest of fallbackTests) {
      const parsed = publishSystemTestSchema.shape.questions.safeParse(systemTest.questions)
      if (!parsed.success) continue
      picked.push(...parsed.data.slice(0, 2))
      sourceTitles.add(systemTest.title)
      if (picked.length >= targetCount) break
    }
  }

  return {
    questions: shuffle(picked).slice(0, targetCount),
    sourceTitles: [...sourceTitles],
    primaryWeakTopic,
    weakFormLabel: primaryWeakTopic,
  }
}
