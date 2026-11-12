import prisma from '@/lib/prisma'
import { recommendRound2Difficulty } from '@/lib/adaptive/adaptive-logic'
import type { Round1TimingInput } from '@/lib/adaptive/adaptive-round2-decision'

/**
 * Trusted-server-only mutators for adaptive sessions.
 * Not a Server Action module — call only from submitQuizAction with session-bound studentId.
 * Returns the query unawaited so the caller can commit it in the same
 * prisma.$transaction batch as the COMPLETED submission (pooler-safe).
 */
export function recordAdaptiveRound1Submit(
  classTestId: string,
  studentId: string,
  submissionId: string,
  round1Score: number,
  passScoreThreshold: number,
  easyTestId: string,
  hardTestId: string,
  timing?: Round1TimingInput,
) {
  const round2Difficulty = recommendRound2Difficulty(
    round1Score,
    passScoreThreshold,
    timing,
  )
  const round2TestId = round2Difficulty === 'HARD' ? hardTestId : easyTestId

  return prisma.adaptiveStudentSession.upsert({
    where: { classTestId_studentId: { classTestId, studentId } },
    create: {
      classTestId,
      studentId,
      round1SubmissionId: submissionId,
      round2Difficulty,
      round2TestId,
    },
    update: {
      round1SubmissionId: submissionId,
      round2Difficulty,
      round2TestId,
    },
  })
}

export function recordAdaptiveRound2Submit(
  classTestId: string,
  studentId: string,
  submissionId: string,
) {
  return prisma.adaptiveStudentSession.update({
    where: { classTestId_studentId: { classTestId, studentId } },
    data: { round2SubmissionId: submissionId },
  })
}
