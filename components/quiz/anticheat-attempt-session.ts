'use client'

const ATTEMPT_KEY_PREFIX = 'mathz-anticheat-attempt:'
const CONSENT_KEY_PREFIX = 'mathz-anticheat-consent:'

export type StoredConsentOutcome = 'granted' | 'refused'

export function getMonitoredAttemptId(testId: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(`${ATTEMPT_KEY_PREFIX}${testId}`)
  } catch {
    return null
  }
}

export function setMonitoredAttemptId(testId: string, attemptId: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(`${ATTEMPT_KEY_PREFIX}${testId}`, attemptId)
  } catch {
    // ignore quota / private mode
  }
}

export function clearMonitoredAttemptId(testId: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(`${ATTEMPT_KEY_PREFIX}${testId}`)
  } catch {
    // ignore
  }
}

export function getMonitoredConsentOutcome(
  testId: string,
): StoredConsentOutcome | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(`${CONSENT_KEY_PREFIX}${testId}`)
    if (raw === 'granted' || raw === 'refused') return raw
    return null
  } catch {
    return null
  }
}

export function setMonitoredConsentOutcome(
  testId: string,
  outcome: StoredConsentOutcome,
) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(`${CONSENT_KEY_PREFIX}${testId}`, outcome)
  } catch {
    // ignore
  }
}

export function clearMonitoredConsentOutcome(testId: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(`${CONSENT_KEY_PREFIX}${testId}`)
  } catch {
    // ignore
  }
}

/** Clear attempt + consent session keys after submit or abandon. */
export function clearMonitoredSession(testId: string) {
  clearMonitoredAttemptId(testId)
  clearMonitoredConsentOutcome(testId)
}
