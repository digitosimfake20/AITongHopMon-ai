/**
 * Versioned Submission.aiFeedbackSummary writes — newer pipeline/analyze
 * polish must not be overwritten by a slower older run.
 */

import prisma from '@/lib/prisma'

export function nextFeedbackVersion(): number {
  return Date.now()
}

export function readFeedbackVersion(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null
  try {
    const parsed = JSON.parse(raw) as { feedbackVersion?: unknown }
    return typeof parsed.feedbackVersion === 'number' && Number.isFinite(parsed.feedbackVersion)
      ? parsed.feedbackVersion
      : null
  } catch {
    return null
  }
}

/** Persist JSON only when this version is not older than the stored one. */
export async function writeAiFeedbackIfNewer(
  submissionId: string,
  payload: { feedbackVersion: number },
): Promise<boolean> {
  const current = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { aiFeedbackSummary: true },
  })
  const stored = readFeedbackVersion(current?.aiFeedbackSummary)
  if (stored != null && stored > payload.feedbackVersion) {
    return false
  }
  await prisma.submission.update({
    where: { id: submissionId },
    data: { aiFeedbackSummary: JSON.stringify(payload) },
  })
  return true
}
