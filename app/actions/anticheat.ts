'use server'

import type { ActionResult } from '@/lib/auth/types'

/**
 * TODO(anticheat): Backend worker owns real implementations.
 * These shims keep Phase 1 UI importable and exercisable until actions land.
 */

export type ConsentDecision = 'granted' | 'refused'

export type FlagTrigger = 'hint'

export type FlagReviewDecision = 'confirmed' | 'dismissed'

export type FlagReviewStatus = 'pending' | FlagReviewDecision

export interface AnticheatFlagItem {
  id: string
  trigger: FlagTrigger | string
  detail: string | null
  createdAt: string
  reviewStatus: FlagReviewStatus
}

function stubWarn(name: string) {
  console.warn(`[anticheat] ${name} is a local stub — replace when app/actions/anticheat.ts is implemented`)
}

export async function startMonitoredAttemptAction(input: {
  testId: string
  classTestId?: string | null
}): Promise<ActionResult<{ attemptId: string }>> {
  stubWarn('startMonitoredAttemptAction')
  if (!input.testId) return { success: false, error: 'Thiếu mã đề' }
  return {
    success: true,
    data: { attemptId: crypto.randomUUID() },
  }
}

export async function recordConsentAction(input: {
  attemptId: string
  decision: ConsentDecision
}): Promise<ActionResult> {
  stubWarn('recordConsentAction')
  if (!input.attemptId) return { success: false, error: 'Thiếu phiên giám sát' }
  if (input.decision !== 'granted' && input.decision !== 'refused') {
    return { success: false, error: 'Quyết định đồng ý không hợp lệ' }
  }
  return { success: true }
}

export async function recordFlagAction(input: {
  attemptId: string
  trigger: FlagTrigger
  detail?: string
}): Promise<ActionResult<{ flagId: string }>> {
  stubWarn('recordFlagAction')
  if (!input.attemptId) return { success: false, error: 'Thiếu phiên giám sát' }
  if (input.trigger !== 'hint') return { success: false, error: 'Loại tín hiệu không hỗ trợ' }
  return {
    success: true,
    data: { flagId: crypto.randomUUID() },
  }
}

export async function listFlagsForSubmissionAction(input: {
  submissionId: string
}): Promise<ActionResult<{ flags: AnticheatFlagItem[] }>> {
  stubWarn('listFlagsForSubmissionAction')
  if (!input.submissionId) return { success: false, error: 'Thiếu bài nộp' }
  return { success: true, data: { flags: [] } }
}

export async function reviewFlagAction(input: {
  flagId: string
  decision: FlagReviewDecision
}): Promise<ActionResult> {
  stubWarn('reviewFlagAction')
  if (!input.flagId) return { success: false, error: 'Thiếu tín hiệu' }
  if (input.decision !== 'confirmed' && input.decision !== 'dismissed') {
    return { success: false, error: 'Quyết định duyệt không hợp lệ' }
  }
  return { success: true }
}
