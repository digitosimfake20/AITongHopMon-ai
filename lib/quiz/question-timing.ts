import { medianResponseMsFromTimeSpentSeconds } from '@/lib/adaptive/adaptive-round2-decision'

export type QuestionTimingQuality = 'measured' | 'estimated' | 'insufficient'

export interface QuestionTimingAssessment {
  quality: QuestionTimingQuality
  /** Null when timing must not drive adaptive routing. */
  medianMs: number | null
  measuredCount: number
  reliable: boolean
}

/**
 * Even-split fallback (total / n on every question) is estimated, not measured.
 * Zeros are missing telemetry, not a real 0-second answer.
 */
export function assessQuestionTiming(input: {
  perQuestionSeconds: number[]
  totalSeconds: number | null
  questionCount: number
}): QuestionTimingAssessment {
  const n = input.questionCount > 0 ? input.questionCount : input.perQuestionSeconds.length
  const positive = input.perQuestionSeconds.filter((s) => s > 0)
  const measuredCount = positive.length

  if (measuredCount === 0 || n === 0) {
    return { quality: 'insufficient', medianMs: null, measuredCount: 0, reliable: false }
  }

  const evenSlice =
    input.totalSeconds != null && n > 0 ? Math.round(input.totalSeconds / n) : null
  const allFilledEqual =
    positive.length === n && positive.every((s) => s === positive[0])
  const looksEvenSplit =
    allFilledEqual &&
    evenSlice != null &&
    evenSlice > 0 &&
    Math.abs(positive[0]! - evenSlice) <= 1

  if (looksEvenSplit) {
    return { quality: 'estimated', medianMs: null, measuredCount, reliable: false }
  }

  if (measuredCount < Math.ceil(n / 2)) {
    return { quality: 'insufficient', medianMs: null, measuredCount, reliable: false }
  }

  return {
    quality: 'measured',
    medianMs: medianResponseMsFromTimeSpentSeconds(positive),
    measuredCount,
    reliable: true,
  }
}
