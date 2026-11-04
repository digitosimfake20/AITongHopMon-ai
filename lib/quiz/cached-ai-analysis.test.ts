import { describe, expect, it } from 'vitest'
import {
  isUsableCachedAnalysis,
  parseCachedAnalysis,
} from '@/lib/quiz/cached-ai-analysis'

describe('parseCachedAnalysis', () => {
  it('accepts pipeline-shaped action plans', () => {
    const raw = JSON.stringify({
      praise: 'Làm tốt!',
      knowledgeGaps: [{ issue: 'a', advice: 'b' }],
      topicMastery: [
        {
          topic: 'A',
          topicKey: 'a',
          total: 2,
          correct: 1,
          accuracy: 50,
          status: 'WEAK',
          pMastery: 0.4,
        },
      ],
      nextStep: { type: 'practice', topicKeys: ['a'], topicTitles: ['A'] },
      signals: { carelessCount: 0, stuckCount: 0 },
    })
    const parsed = parseCachedAnalysis(raw)
    expect(parsed?.praise).toBe('Làm tốt!')
    expect(parsed?.nextStep?.topicKeys).toEqual(['a'])
  })

  it('rejects empty / malformed cache', () => {
    expect(parseCachedAnalysis(null)).toBeNull()
    expect(parseCachedAnalysis('{')).toBeNull()
    expect(isUsableCachedAnalysis({ praise: '', knowledgeGaps: [] })).toBe(false)
  })
})
