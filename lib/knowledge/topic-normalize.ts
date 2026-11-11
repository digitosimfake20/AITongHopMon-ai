/**
 * Canonical topic normalization — single source of truth for mastery keys,
 * KnowledgeNode IDs, and class-gap aggregation (avoids duplicate topics from
 * casing / whitespace / empty strings).
 */

import { createHash } from 'node:crypto'

export const DEFAULT_TOPIC = 'Chủ đề khác'
export const DEFAULT_SUBJECT = 'Toán'

/** Collapse whitespace, trim, fallback for empty. Does NOT change Vietnamese casing. */
export function normalizeTopicName(raw: string | null | undefined): string {
  if (raw == null) return DEFAULT_TOPIC
  const collapsed = raw.replace(/\s+/g, ' ').trim()
  return collapsed.length > 0 ? collapsed : DEFAULT_TOPIC
}

function slugifyTopic(normalized: string): string {
  return normalized
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Stable KnowledgeNode.id / topicKey.
 * Short slugs stay as-is (migration-safe for existing rows). Labels whose slug
 * would exceed 64 chars use a subject-scoped hash of the full normalized label
 * so truncate collisions cannot merge distinct topics; `title` stays on the node.
 */
export function topicToNodeId(topic: string, subject: string = DEFAULT_SUBJECT): string {
  const normalized = normalizeTopicName(topic)
  const slug = slugifyTopic(normalized)
  if (!slug) return 'chua-de-khac'
  if (slug.length <= 64) return slug
  const digest = createHash('sha256')
    .update(`${subject}\u0000${normalized}`)
    .digest('hex')
    .slice(0, 32)
  return `t_${digest}`
}

/** Resolve display label + node id from any raw topic string. */
export function resolveTopicKey(
  raw: string | null | undefined,
  subject: string = DEFAULT_SUBJECT,
): {
  topicName: string
  topicKey: string
} {
  const topicName = normalizeTopicName(raw)
  return { topicName, topicKey: topicToNodeId(topicName, subject) }
}

/** SQL expression fragment for Postgres — group questions by normalized topic key. */
export const SQL_TOPIC_KEY_EXPR = `
  LOWER(REGEXP_REPLACE(TRIM(COALESCE(NULLIF(q.topic, ''), '${DEFAULT_TOPIC}')), '\\s+', ' ', 'g'))
`.trim()

/** Pick a stable display label when merging rows that share the same topicKey. */
export function pickCanonicalTopicLabel(candidates: string[]): string {
  const normalized = candidates.map(normalizeTopicName)
  if (normalized.length === 0) return DEFAULT_TOPIC
  const counts = new Map<string, number>()
  for (const name of normalized) {
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'vi'))[0]![0]
}

export type TopicMergeRow = { topicKey: string; topicName: string }

/** Merge stats keyed by topicKey; combines duplicate raw topic strings. */
export function mergeByTopicKey<T extends { topic: string }>(
  rows: T[],
  pick: (merged: T, row: T) => T,
): Array<T & TopicMergeRow> {
  const map = new Map<string, { row: T; labels: string[] }>()
  for (const row of rows) {
    const { topicName, topicKey } = resolveTopicKey(row.topic)
    const existing = map.get(topicKey)
    if (!existing) {
      map.set(topicKey, { row: { ...row, topic: topicName } as T, labels: [topicName] })
    } else {
      existing.labels.push(topicName)
      existing.row = pick(existing.row, { ...row, topic: topicName } as T)
    }
  }
  return [...map.entries()].map(([topicKey, { row, labels }]) => ({
    ...row,
    topicKey,
    topicName: pickCanonicalTopicLabel(labels),
    topic: pickCanonicalTopicLabel(labels),
  }))
}
