import { normalizeTopicName, topicToNodeId } from '@/lib/knowledge/topic-normalize'

/** Question-shaped JSON stored on SystemTest.questions. */
export type StampableQuestion = {
  topic?: string | null
  topicKey?: string | null
  [key: string]: unknown
}

/**
 * Stamp normalized topicKey onto each bank question at ingest so practice
 * collection can filter via jsonb without loading every SystemTest row.
 * Does not require a schema migration.
 */
export function stampQuestionTopicKeys<T extends StampableQuestion>(
  questions: T[],
  topicFallback?: string,
): T[] {
  const fallback = normalizeTopicName(topicFallback)
  return questions.map((q) => {
    const topic = normalizeTopicName(q.topic?.trim() || fallback)
    const topicKey =
      typeof q.topicKey === 'string' && q.topicKey.trim().length > 0
        ? topicToNodeId(q.topicKey)
        : topicToNodeId(topic)
    return { ...q, topic, topicKey }
  })
}
