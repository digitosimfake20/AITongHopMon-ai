import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { openMonitorCapture, getMonitoredConsentAction, recordTechnicalIssueUnproctoredAction } =
  vi.hoisted(() => ({
    openMonitorCapture: vi.fn(),
    getMonitoredConsentAction: vi.fn(),
    recordTechnicalIssueUnproctoredAction: vi.fn(),
  }))

vi.mock('@/lib/anticheat', () => ({
  MONITOR_REQUIRED_MESSAGE: 'monitor',
  createCaptureLoop: vi.fn(),
  openMonitorCapture,
}))

vi.mock('@/app/actions/anticheat', () => ({
  getMonitoredConsentAction,
  recordTechnicalIssueUnproctoredAction,
  uploadAnticheatEvidenceAction: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { message: vi.fn() },
}))

import { startAnticheatCapture } from '@/components/quiz/anticheat-capture'
import {
  setMonitoredAttemptId,
  setMonitoredConsentOutcome,
} from '@/components/quiz/anticheat-attempt-session'
import { openMonitoredQuizGate } from '@/lib/quiz/monitored-consent-gate'

const TEST_ID = 'test-1'

function forgeConsentStorage(outcome: 'granted' | 'refused', attemptId = 'forged-attempt') {
  setMonitoredConsentOutcome(TEST_ID, outcome)
  setMonitoredAttemptId(TEST_ID, attemptId)
}

beforeEach(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('window', globalThis)
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  })
  openMonitorCapture.mockReset()
  openMonitorCapture.mockResolvedValue({ ok: false, message: 'no-share' })
  getMonitoredConsentAction.mockReset()
  recordTechnicalIssueUnproctoredAction.mockReset()
  recordTechnicalIssueUnproctoredAction.mockResolvedValue({ success: true })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('openMonitoredQuizGate', () => {
  it('forged mathz-anticheat-consent storage does not open enter or capture', () => {
    for (const forged of ['granted', 'refused', 'yes'] as const) {
      expect(
        openMonitoredQuizGate({
          monitoringEnabled: true,
          serverOutcome: null,
          storedConsent: forged,
        }),
      ).toEqual({ enter: false, capture: false })
    }
  })

  it('server granted opens enter and capture even when storage says refused', () => {
    expect(
      openMonitoredQuizGate({
        monitoringEnabled: true,
        serverOutcome: 'granted',
        storedConsent: 'refused',
      }),
    ).toEqual({ enter: true, capture: true })
  })

  it('server refused opens enter only, even when storage says granted', () => {
    expect(
      openMonitoredQuizGate({
        monitoringEnabled: true,
        serverOutcome: 'refused',
        storedConsent: 'granted',
      }),
    ).toEqual({ enter: true, capture: false })
  })

  it('unmonitored quiz enters without consent and does not capture', () => {
    expect(
      openMonitoredQuizGate({
        monitoringEnabled: false,
        serverOutcome: null,
        storedConsent: 'granted',
      }),
    ).toEqual({ enter: true, capture: false })
  })
})

describe('consent storage is not the enter or capture gate', () => {
  it('pretest, taker, and capture start do not read consent storage', () => {
    for (const rel of [
      'components/quiz/quiz-pretest-gate.tsx',
      'components/quiz/quiz-taker.tsx',
      'components/quiz/anticheat-capture.ts',
    ]) {
      const text = readFileSync(path.join(process.cwd(), rel), 'utf8')
      expect(text, rel).not.toContain('getMonitoredConsentOutcome')
      expect(text, rel).not.toContain('sessionStorage')
      expect(text, rel).toContain('openMonitoredQuizGate')
    }
    const taker = readFileSync(
      path.join(process.cwd(), 'components/quiz/quiz-taker.tsx'),
      'utf8',
    )
    const capture = readFileSync(
      path.join(process.cwd(), 'components/quiz/anticheat-capture.ts'),
      'utf8',
    )
    expect(taker).not.toContain('getMonitoredAttemptId')
    expect(capture).not.toContain('getMonitoredAttemptId')
    expect(capture).toContain('getMonitoredConsentAction')
  })
})

describe('startAnticheatCapture consent authority', () => {
  it('forged mathz-anticheat-consent:granted does not open capture without server consent', async () => {
    forgeConsentStorage('granted')
    getMonitoredConsentAction.mockResolvedValue({
      success: true,
      data: { submissionId: null, outcome: null },
    })

    const handle = await startAnticheatCapture({ testId: TEST_ID })

    expect(handle).toBeNull()
    expect(openMonitorCapture).not.toHaveBeenCalled()
  })

  it('forged granted storage does not open capture when server consent is refused', async () => {
    forgeConsentStorage('granted')
    getMonitoredConsentAction.mockResolvedValue({
      success: true,
      data: { submissionId: 'server-submission', outcome: 'refused' },
    })

    const handle = await startAnticheatCapture({ testId: TEST_ID })

    expect(handle).toBeNull()
    expect(openMonitorCapture).not.toHaveBeenCalled()
  })

  it('server granted opens capture for that submission, ignoring forged storage', async () => {
    forgeConsentStorage('refused', 'forged-attempt')
    getMonitoredConsentAction.mockResolvedValue({
      success: true,
      data: { submissionId: 'server-submission', outcome: 'granted' },
    })

    const handle = await startAnticheatCapture({ testId: TEST_ID })

    expect(handle).toBeNull()
    expect(openMonitorCapture).toHaveBeenCalledOnce()
    expect(recordTechnicalIssueUnproctoredAction).toHaveBeenCalledWith({
      attemptId: 'server-submission',
    })
  })
})
