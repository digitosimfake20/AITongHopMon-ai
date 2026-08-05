/**
 * AI-assisted topic canonicalization — merges semantically equivalent labels
 * that rule-based slugging cannot dedupe (e.g. "Nhân phân thức" ≈ "Phép nhân phân thức").
 *
 * Results are cached in `TopicCanonicalAlias` so reads stay fast.
 */
import prisma from '@/lib/prisma'
import { getOpenAIClient, OPENAI_MODEL_CHAT } from '@/lib/ai/openai'
import {
  normalizeTopicName,
  resolveTopicKey,
  topicToNodeId,
  type TopicMergeRow,
} from '@/lib/knowledge/topic-normalize'

export type CanonicalTopic = TopicMergeRow & { topicName: string }

const CANONICALIZE_SYSTEM = `Bạn là chuyên gia phân loại chủ đề Toán THCS Việt Nam.
Nhiệm vụ: gom các nhãn chủ đề TRÙNG NGHĨA thành một tên chuẩn duy nhất.

QUY TẮC:
- Chỉ gom khi thực sự cùng dạng bài / cùng kiến thức (không gom "Đại số" với "Phân thức").
- Tên chuẩn (canonicalLabel): ngắn gọn 2-5 từ, tiếng Việt.
- Mỗi nhãn đầu vào xuất hiện ĐÚNG MỘT LẦN trong đúng một nhóm.
- Nhãn không trùng nghĩa với ai → nhóm riêng 1 phần tử.

OUTPUT JSON thuần:
{
  "groups": [
    {
      "canonicalLabel": "Cộng trừ phân thức đại số",
      "variants": ["Cộng, trừ phân thức", "Phép trừ phân thức đại số"]
    }
  ]
}`

type AiGroup = { canonicalLabel: string; variants: string[] }

export async function lookupCanonicalAlias(
  aliasKey: string,
): Promise<CanonicalTopic | null> {
  const row = await prisma.topicCanonicalAlias.findUnique({
    where: { aliasKey },
  })
  if (!row) return null
  return {
    topicKey: row.canonicalKey,
    topicName: row.canonicalLabel,
  }
}

export function resolveTopicCanonicalSync(raw: string | null | undefined): CanonicalTopic {
  const { topicName, topicKey } = resolveTopicKey(raw)
  return { topicName, topicKey }
}

export async function resolveTopicCanonical(
  raw: string | null | undefined,
  subject = 'Toán',
): Promise<CanonicalTopic> {
  const normalized = normalizeTopicName(raw)
  const aliasKey = topicToNodeId(normalized)
  const cached = await lookupCanonicalAlias(aliasKey)
  if (cached) return cached

  await ensureTopicsCanonicalized([normalized], subject)
  return (await lookupCanonicalAlias(aliasKey)) ?? resolveTopicCanonicalSync(normalized)
}

async function groupTopicsWithAI(
  labels: string[],
  subject: string,
): Promise<AiGroup[]> {
  if (labels.length === 0) return []
  if (!process.env.OPENAI_API_KEY) {
    return labels.map((label) => ({ canonicalLabel: label, variants: [label] }))
  }

  try {
    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL_CHAT,
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: CANONICALIZE_SYSTEM },
        {
          role: 'user',
          content: `Môn: ${subject}\nCác nhãn cần gom:\n${labels.map((l, i) => `${i + 1}. ${l}`).join('\n')}`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as { groups?: AiGroup[] }
    const groups = parsed.groups ?? []

    const assigned = new Set<string>()
    const valid: AiGroup[] = []
    for (const g of groups) {
      const canonical = normalizeTopicName(g.canonicalLabel)
      const variants = (g.variants ?? []).map(normalizeTopicName).filter(Boolean)
      if (!canonical || variants.length === 0) continue
      if (!variants.includes(canonical)) variants.unshift(canonical)
      for (const v of variants) {
        if (labels.includes(v)) assigned.add(v)
      }
      valid.push({ canonicalLabel: canonical, variants: [...new Set(variants)] })
    }

    for (const label of labels) {
      if (!assigned.has(label)) {
        valid.push({ canonicalLabel: label, variants: [label] })
      }
    }

    return valid.length > 0 ? valid : labels.map((l) => ({ canonicalLabel: l, variants: [l] }))
  } catch (err) {
    console.error('[topic-canonicalize-ai] AI grouping failed:', err)
    return labels.map((label) => ({ canonicalLabel: label, variants: [label] }))
  }
}

async function persistCanonicalGroups(groups: AiGroup[], subject: string, source: string) {
  for (const group of groups) {
    const canonicalLabel = normalizeTopicName(group.canonicalLabel)
    const canonicalKey = topicToNodeId(canonicalLabel)

    await prisma.knowledgeNode.upsert({
      where: { id: canonicalKey },
      create: {
        id: canonicalKey,
        subject,
        title: canonicalLabel,
        difficultyLevel: 1,
      },
      update: { title: canonicalLabel },
    })

    for (const variant of group.variants) {
      const normalized = normalizeTopicName(variant)
      const aliasKey = topicToNodeId(normalized)
      await prisma.topicCanonicalAlias.upsert({
        where: { aliasKey },
        create: {
          aliasKey,
          canonicalKey,
          canonicalLabel,
          subject,
          source,
        },
        update: {
          canonicalKey,
          canonicalLabel,
          subject,
          source,
        },
      })
    }
  }
}

export async function ensureTopicsCanonicalized(
  rawLabels: string[],
  subject = 'Toán',
): Promise<Map<string, CanonicalTopic>> {
  const normalized = [...new Set(rawLabels.map(normalizeTopicName).filter(Boolean))]
  const result = new Map<string, CanonicalTopic>()

  if (normalized.length === 0) return result

  const aliasKeys = normalized.map((l) => topicToNodeId(l))
  const cached = await prisma.topicCanonicalAlias.findMany({
    where: { aliasKey: { in: aliasKeys } },
  })
  const cacheByAlias = new Map(cached.map((r) => [r.aliasKey, r]))

  const unresolved: string[] = []
  for (const label of normalized) {
    const aliasKey = topicToNodeId(label)
    const hit = cacheByAlias.get(aliasKey)
    if (hit) {
      result.set(label, { topicName: hit.canonicalLabel, topicKey: hit.canonicalKey })
    } else {
      unresolved.push(label)
    }
  }

  if (unresolved.length >= 2) {
    const groups = await groupTopicsWithAI(unresolved, subject)
    await persistCanonicalGroups(groups, subject, 'ai')

    for (const label of unresolved) {
      const aliasKey = topicToNodeId(label)
      const hit = await lookupCanonicalAlias(aliasKey)
      result.set(label, hit ?? resolveTopicCanonicalSync(label))
    }
  } else if (unresolved.length === 1) {
    const label = unresolved[0]!
    const sync = resolveTopicCanonicalSync(label)
    result.set(label, sync)
    await prisma.topicCanonicalAlias.upsert({
      where: { aliasKey: topicToNodeId(label) },
      create: {
        aliasKey: topicToNodeId(label),
        canonicalKey: sync.topicKey,
        canonicalLabel: sync.topicName,
        subject,
        source: 'rule',
      },
      update: {},
    })
  }

  return result
}

/** Merge aggregated stats by AI-canonical topicKey. */
export function mergeStatsByCanonicalKey<T extends { total: number; correct: number }>(
  rows: Array<T & { topic_label: string }>,
  canon: Map<string, CanonicalTopic>,
): Array<T & { topic_key: string; topic_label: string }> {
  const merged = new Map<string, T & { topic_key: string; topic_label: string }>()

  for (const row of rows) {
    const label = normalizeTopicName(row.topic_label)
    const c = canon.get(label) ?? resolveTopicCanonicalSync(label)
    const existing = merged.get(c.topicKey)
    if (!existing) {
      merged.set(c.topicKey, {
        ...row,
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

  return [...merged.values()]
}
