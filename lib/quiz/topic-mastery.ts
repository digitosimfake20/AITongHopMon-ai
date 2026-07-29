import type { TopicMastery } from '@/app/actions/analyze-submission'

/** Compute topic mastery from question results — pure function, safe to run on server or client. */
export function computeTopicMastery(
  questions: Array<{ topic: string; isCorrect: boolean }>,
): TopicMastery[] {
  const map = new Map<string, { total: number; correct: number }>()
  for (const q of questions) {
    const topic = q.topic || 'Chủ đề chung'
    if (!map.has(topic)) map.set(topic, { total: 0, correct: 0 })
    const entry = map.get(topic)!
    entry.total++
    if (q.isCorrect) entry.correct++
  }
  return [...map.entries()]
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
    .map(([topic, stats]) => {
      const accuracy =
        stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
      const status: TopicMastery['status'] =
        accuracy >= 80 ? 'MASTERED' : accuracy >= 50 ? 'MEDIUM' : 'WEAK'
      return { topic, ...stats, accuracy, status }
    })
}
