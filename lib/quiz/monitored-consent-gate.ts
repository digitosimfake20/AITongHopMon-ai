export type MonitoredConsentOutcome = 'granted' | 'refused'

/**
 * Enter and capture follow the server consent row for this submission.
 * `storedConsent` is ignored: `mathz-anticheat-consent:*` is a UI cache, not authority.
 */
export function openMonitoredQuizGate(input: {
  monitoringEnabled: boolean
  serverOutcome: MonitoredConsentOutcome | null
  storedConsent?: string | null
}): { enter: boolean; capture: boolean } {
  if (!input.monitoringEnabled) return { enter: true, capture: false }
  return {
    enter: input.serverOutcome === 'granted' || input.serverOutcome === 'refused',
    capture: input.serverOutcome === 'granted',
  }
}
