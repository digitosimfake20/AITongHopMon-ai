import type { DifficultyLevel } from '@prisma/client'
import { formatDurationMs, formatDurationSeconds } from '@/lib/time/format-duration'

/** Per-question median above this (ms) → passed students get EASY round 2 (fluency). */
export const ROUND2_SLOW_MEDIAN_MS = 45_000

export interface Round1TimingInput {
  /** Median per-question response time in milliseconds */
  medianResponseMs: number | null
  /**
   * False for missing or even-split estimates. Those must not change the branch.
   * Omitted means reliable when a positive median is present.
   */
  reliable?: boolean
}

export interface AdaptiveRound2DecisionTrace {
  difficulty: DifficultyLevel
  passScoreThreshold: number
  round1Score: number
  medianResponseMs: number | null
  branches: Array<{ id: string; label: string; taken: boolean }>
  summaryVi: string
}

function medianMsFromQuestionSeconds(seconds: number[]): number | null {
  const ms = seconds.filter((s) => s > 0).map((s) => s * 1000)
  if (ms.length === 0) return null
  ms.sort((a, b) => a - b)
  const mid = Math.floor(ms.length / 2)
  return ms.length % 2 === 1 ? ms[mid]! : Math.round((ms[mid - 1]! + ms[mid]!) / 2)
}

export function medianResponseMsFromTimeSpentSeconds(
  timeSpentSeconds: number[],
): number | null {
  return medianMsFromQuestionSeconds(timeSpentSeconds)
}

/**
 * Round 2 routing: score threshold + median response time (ms).
 * - Below pass score → EASY
 * - At/above pass + fast enough (or unknown time) → HARD
 * - At/above pass + slow median → EASY (consolidate fluency)
 */
export function decideRound2Difficulty(
  round1Score: number,
  passScoreThreshold: number,
  timing?: Round1TimingInput,
): DifficultyLevel {
  return explainAdaptiveRound2Decision(round1Score, passScoreThreshold, timing)
    .difficulty
}

export function explainAdaptiveRound2Decision(
  round1Score: number,
  passScoreThreshold: number,
  timing?: Round1TimingInput,
): AdaptiveRound2DecisionTrace {
  const rawMedian = timing?.medianResponseMs ?? null
  const reliable = timing?.reliable !== false && rawMedian != null && rawMedian > 0
  const medianResponseMs = reliable ? rawMedian : null
  const passed = round1Score >= passScoreThreshold
  const slow = reliable && medianResponseMs! > ROUND2_SLOW_MEDIAN_MS
  const slowLabel = formatDurationSeconds(ROUND2_SLOW_MEDIAN_MS / 1000, { perQuestion: true })

  const branches: AdaptiveRound2DecisionTrace['branches'] = [
    {
      id: 'score_below',
      label: `Điểm lượt 1 < ${passScoreThreshold} → Lượt 2: Dễ`,
      taken: !passed,
    },
    {
      id: 'score_pass_fast',
      label: `Điểm ≥ ${passScoreThreshold} và (chưa đủ TG câu đáng tin, hoặc median ≤ ${slowLabel}) → Lượt 2: Khó`,
      taken: passed && !slow,
    },
    {
      id: 'score_pass_slow',
      label: `Điểm ≥ ${passScoreThreshold} và median TG/câu > ${slowLabel} (đo được) → Lượt 2: Dễ`,
      taken: passed && slow,
    },
  ]

  let difficulty: DifficultyLevel
  let summaryVi: string

  if (!passed) {
    difficulty = 'EASY'
    summaryVi = `Điểm ${round1Score.toFixed(1)}/10 < ngưỡng ${passScoreThreshold} → giao đề Dễ.`
  } else if (slow) {
    difficulty = 'EASY'
    summaryVi = `Điểm ${round1Score.toFixed(1)}/10 đạt ngưỡng; median ${formatDurationMs(medianResponseMs!, { perQuestion: true })} (> ${slowLabel}) → giao đề Dễ để củng cố.`
  } else {
    difficulty = 'HARD'
    const timeNote = reliable
      ? `; median ${formatDurationMs(medianResponseMs!, { perQuestion: true })}`
      : '; thời gian từng câu không đủ tin cậy (chỉ theo điểm)'
    summaryVi = `Điểm ${round1Score.toFixed(1)}/10 ≥ ${passScoreThreshold}${timeNote} → giao đề Khó.`
  }

  return {
    difficulty,
    passScoreThreshold,
    round1Score,
    medianResponseMs,
    branches,
    summaryVi,
  }
}
