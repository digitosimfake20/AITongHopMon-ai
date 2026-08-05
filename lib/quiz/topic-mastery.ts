import type { TopicMastery } from '@/app/actions/analyze-submission'
import { normalizeTopicName, topicToNodeId } from '@/lib/knowledge/topic-normalize'

/** Compute topic mastery from question results — grouped by canonical topicKey. */
export function computeTopicMastery(
  questions: Array<{ topic: string; isCorrect: boolean }>,
): TopicMastery[] {
  const map = new Map<string, { topic: string; total: number; correct: number }>()
  for (const q of questions) {
    const topic = normalizeTopicName(q.topic)
    const key = topicToNodeId(topic)
    if (!map.has(key)) map.set(key, { topic, total: 0, correct: 0 })
    const entry = map.get(key)!
    entry.total++
    if (q.isCorrect) entry.correct++
  }
  return [...map.values()]
    .sort((a, b) => a.correct / a.total - b.correct / b.total)
    .map((stats) => {
      const accuracy =
        stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
      const status: TopicMastery['status'] =
        accuracy >= 80 ? 'MASTERED' : accuracy >= 50 ? 'MEDIUM' : 'WEAK'
      return { topic: stats.topic, total: stats.total, correct: stats.correct, accuracy, status }
    })
}
