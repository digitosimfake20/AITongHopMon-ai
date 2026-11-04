/**
 * Prefer Submission.aiFeedbackSummary from the Phase E pipeline (or a prior
 * analyze pass) instead of re-running the multi-LLM waterfall.
 */

export type CachedAIAnalysis = {
  praise: string
  knowledgeGaps: Array<{ issue: string; advice: string }>
  topicMastery?: Array<{
    topic: string
    topicKey?: string
    total: number
    correct: number
    accuracy: number
    status: 'WEAK' | 'MEDIUM' | 'MASTERED'
    advice?: string
    pMastery?: number
  }>
  nextStep?: {
    type: 'practice'
    topicKeys: string[]
    topicTitles: string[]
  } | null
  officialStats?: {
    correctCount: number
    totalQuestions: number
    scoredQuestionCount: number
  }
  signals?: {
    carelessCount: number
    stuckCount: number
  }
}

/** True when cached summary is usable as the result-page plan. */
export function isUsableCachedAnalysis(raw: unknown): raw is CachedAIAnalysis {
  if (!raw || typeof raw !== 'object') return false
  const obj = raw as Record<string, unknown>
  const hasPraise = typeof obj.praise === 'string' && obj.praise.trim().length > 0
  const hasGaps = Array.isArray(obj.knowledgeGaps)
  const hasTopics = Array.isArray(obj.topicMastery)
  const next = obj.nextStep
  const hasNext =
    next == null ||
    (typeof next === 'object' &&
      next !== null &&
      (next as { type?: string }).type === 'practice')
  return (hasPraise || hasTopics) && hasGaps && hasNext
}

export function parseCachedAnalysis(raw: string | null | undefined): CachedAIAnalysis | null {
  if (!raw?.trim()) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isUsableCachedAnalysis(parsed)) return null
    return {
      praise: parsed.praise ?? '',
      knowledgeGaps: parsed.knowledgeGaps ?? [],
      topicMastery: parsed.topicMastery,
      nextStep: parsed.nextStep ?? null,
      officialStats: parsed.officialStats,
      signals: parsed.signals,
    }
  } catch {
    return null
  }
}
