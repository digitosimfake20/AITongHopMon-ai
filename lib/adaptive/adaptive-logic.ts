import type { DifficultyLevel } from '@prisma/client'
import {
  decideRound2Difficulty,
  type Round1TimingInput,
} from '@/lib/adaptive/adaptive-round2-decision'

export type { Round1TimingInput }

/** Lượt 2: điểm + median thời gian/câu (ms) — xem adaptive-round2-decision.ts */
export function recommendRound2Difficulty(
  round1Score: number,
  passScoreThreshold: number,
  timing?: Round1TimingInput,
): DifficultyLevel {
  return decideRound2Difficulty(round1Score, passScoreThreshold, timing)
}

export function difficultyLabel(d: DifficultyLevel): string {
  switch (d) {
    case 'EASY':
      return 'Dễ'
    case 'MEDIUM':
      return 'Trung bình'
    case 'HARD':
      return 'Khó'
  }
}

export type AdaptiveRoundStatus = 'not_started' | 'round1_pending' | 'round2_pending' | 'completed'

export interface AdaptiveProgress {
  status: AdaptiveRoundStatus
  round1Score: number | null
  round1SubmissionId: string | null
  round2Difficulty: DifficultyLevel | null
  round2TestId: string | null
  round2Score: number | null
  round2SubmissionId: string | null
  nextTestId: string | null
}

export interface AdaptiveClassTestRef {
  mediumTestId: string
  easyTestId: string
  hardTestId: string
  passScoreThreshold: number
}

export interface AdaptiveSessionRef {
  round1SubmissionId: string | null
  round2TestId: string | null
  round2Difficulty: DifficultyLevel | null
  round2SubmissionId: string | null
}

export function resolveRound2TestId(
  ct: AdaptiveClassTestRef,
  difficulty: DifficultyLevel,
): string {
  return difficulty === 'HARD' ? ct.hardTestId : ct.easyTestId
}

export function computeAdaptiveProgress(
  ct: AdaptiveClassTestRef,
  session: AdaptiveSessionRef | null,
  round1Score: number | null,
  round2Score: number | null,
): AdaptiveProgress {
  if (!session?.round1SubmissionId) {
    return {
      status: 'not_started',
      round1Score: null,
      round1SubmissionId: null,
      round2Difficulty: null,
      round2TestId: null,
      round2Score: null,
      round2SubmissionId: null,
      nextTestId: ct.mediumTestId,
    }
  }

  const round2Difficulty =
    session.round2Difficulty ??
    (round1Score != null
      ? recommendRound2Difficulty(round1Score, ct.passScoreThreshold, undefined)
      : null)

  const round2TestId =
    session.round2TestId ??
    (round2Difficulty ? resolveRound2TestId(ct, round2Difficulty) : null)

  if (!session.round2SubmissionId) {
    return {
      status: 'round2_pending',
      round1Score,
      round1SubmissionId: session.round1SubmissionId,
      round2Difficulty,
      round2TestId,
      round2Score: null,
      round2SubmissionId: null,
      nextTestId: round2TestId,
    }
  }

  return {
    status: 'completed',
    round1Score,
    round1SubmissionId: session.round1SubmissionId,
    round2Difficulty,
    round2TestId,
    round2Score,
    round2SubmissionId: session.round2SubmissionId,
    nextTestId: null,
  }
}

export function buildAdaptiveEvaluation(
  round1Score: number | null,
  round2Difficulty: DifficultyLevel | null,
  round2Score: number | null,
  passScoreThreshold: number,
): string {
  if (round1Score == null) return 'Chưa bắt đầu lượt 1 (MEDIUM).'

  const r1Note =
    round1Score >= passScoreThreshold
      ? `Lượt 1 đạt ${round1Score.toFixed(1)}/10 (≥ ${passScoreThreshold}) — hệ thống giao đề khó hơn.`
      : `Lượt 1 đạt ${round1Score.toFixed(1)}/10 (< ${passScoreThreshold}) — hệ thống giao đề dễ hơn để củng cố.`

  if (round2Score == null || !round2Difficulty) {
    return `${r1Note} Đang chờ lượt 2 (${round2Difficulty ? difficultyLabel(round2Difficulty) : '…'}).`
  }

  const improved = round2Score > round1Score
  const r2Note = improved
    ? `Lượt 2 (${difficultyLabel(round2Difficulty)}): ${round2Score.toFixed(1)}/10 — cải thiện so với lượt 1.`
    : `Lượt 2 (${difficultyLabel(round2Difficulty)}): ${round2Score.toFixed(1)}/10 — cần ôn thêm nội dung lượt 1.`

  return `${r1Note} ${r2Note}`
}
