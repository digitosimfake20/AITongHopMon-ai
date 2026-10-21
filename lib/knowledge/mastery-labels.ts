/**
 * Single mastery contract for student BKT (pMastery 0–1) and UI labels.
 * Thresholds align with evidence caps in mastery-evidence.ts.
 */

import {
  MASTERY_CAP_SINGLE_CORRECT,
  MASTERY_MASTERED_THRESHOLD,
} from '@/lib/knowledge/mastery-evidence'

export type MasteryLabelStatus = 'WEAK' | 'MEDIUM' | 'MASTERED'

/** pMastery ≥ this → Thành thạo */
export const MASTERY_STATUS_MASTERED = MASTERY_MASTERED_THRESHOLD
/** pMastery ≥ this (and < mastered) → Đang tiến bộ */
export const MASTERY_STATUS_PROGRESSING = MASTERY_CAP_SINGLE_CORRECT

export function masteryStatusFromP(pMastery: number): MasteryLabelStatus {
  if (pMastery >= MASTERY_STATUS_MASTERED) return 'MASTERED'
  if (pMastery >= MASTERY_STATUS_PROGRESSING) return 'MEDIUM'
  return 'WEAK'
}

/** Session / aggregate accuracy 0–100 → same bands as BKT. */
export function masteryStatusFromAccuracyPercent(percent: number): MasteryLabelStatus {
  return masteryStatusFromP(percent / 100)
}

export function masteryStatusLabelVi(status: MasteryLabelStatus): string {
  switch (status) {
    case 'MASTERED':
      return 'Thành thạo'
    case 'MEDIUM':
      return 'Đang tiến bộ'
    case 'WEAK':
      return 'Yếu'
  }
}

export function isWeakMastery(pMastery: number): boolean {
  return pMastery < MASTERY_STATUS_MASTERED
}

export function isStrengthMastery(pMastery: number): boolean {
  return pMastery >= MASTERY_STATUS_MASTERED
}
