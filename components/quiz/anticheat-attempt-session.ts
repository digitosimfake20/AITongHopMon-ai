'use client'

const ATTEMPT_KEY_PREFIX = 'mathz-anticheat-attempt:'

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
