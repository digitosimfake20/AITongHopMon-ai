'use client'

import { useEffect, useState } from 'react'
import {
  getMonitoredConsentAction,
  type ConsentDecision,
} from '@/app/actions/anticheat'

type ConsentSnap = {
  testId: string
  outcome: ConsentDecision | null
  submissionId: string | null
}

/** Server consent for this student's in-progress submission. Storage is not read. */
export function useMonitoredServerConsent(testId: string, enabled: boolean) {
  const [tick, setTick] = useState(0)
  const [snap, setSnap] = useState<ConsentSnap | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void getMonitoredConsentAction({ testId })
      .then((res) => {
        if (cancelled) return
        const data = res.success ? res.data : undefined
        setSnap({
          testId,
          outcome: data?.outcome ?? null,
          submissionId: data?.submissionId ?? null,
        })
      })
      .catch(() => {
        if (cancelled) return
        setSnap({ testId, outcome: null, submissionId: null })
      })
    return () => {
      cancelled = true
    }
  }, [enabled, testId, tick])

  const current = enabled && snap?.testId === testId ? snap : null
  return {
    ready: !enabled || current !== null,
    outcome: current?.outcome ?? null,
    submissionId: current?.submissionId ?? null,
    reload: () => setTick((n) => n + 1),
  }
}
