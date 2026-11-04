import type { WeakTopic } from '@/lib/dashboard-types'
import {
  MASTERY_STATUS_MASTERED,
  MASTERY_STATUS_PROGRESSING,
} from '@/lib/knowledge/mastery-labels'

/** Average pMastery (0–1) → dashboard percent (0–100). */
export function masteryPercentFromAvg(
  avg: number | null | undefined,
  count: number,
): number {
  if (count <= 0 || avg == null) return 0
  return Math.round(Number(avg) * 100)
}

export function studyHoursFromSeconds(totalSeconds: number): number {
  return Math.round((totalSeconds / 3600) * 10) / 10
}

type WeakStateRow = {
  nodeId: string
  pMastery: unknown
  node: { title: string }
}

/** Rows must already be ordered by pMastery asc and limited to weak topics. */
export function mapWeakTopics(states: WeakStateRow[], limit = 5): WeakTopic[] {
  return states.slice(0, limit).map((state) => {
    const p = Number(state.pMastery)
    return {
      id: state.nodeId,
      label: state.node.title,
      accuracy: Math.round(p * 100),
      severity: p < MASTERY_STATUS_PROGRESSING ? ('weak' as const) : ('moderate' as const),
    }
  })
}

export function isWeakMastery(pMastery: unknown): boolean {
  return Number(pMastery) < MASTERY_STATUS_MASTERED
}
