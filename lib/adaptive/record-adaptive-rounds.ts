import prisma from '@/lib/prisma'
import { recommendRound2Difficulty } from '@/lib/adaptive/adaptive-logic'
import type { Round1TimingInput } from '@/lib/adaptive/adaptive-round2-decision'

/**
 * Trusted-server-only mutators for adaptive sessions.
 * Not a Server Action module — call only from submitQuizAction with session-bound studentId.
 */
export async function recordAdaptiveRound1Submit(
  classTestId: string,
  studentId: string,
  submissionId: string,
  round1Score: number,
  passScoreThreshold: number,
  easyTestId: string,
  hardTestId: string,
  timing?: Round1TimingInput,
): Promise<void> {
  const round2Difficulty = recommendRound2Difficulty(
    round1Score,
    passScoreThreshold,
    timing,
  )
  const round2TestId = round2Difficulty === 'HARD' ? hardTestId : easyTestId

  await prisma.adaptiveStudentSession.upsert({
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

export async function recordAdaptiveRound2Submit(
  classTestId: string,
  studentId: string,
  submissionId: string,
): Promise<void> {
  await prisma.adaptiveStudentSession.update({
    where: { classTestId_studentId: { classTestId, studentId } },
    data: { round2SubmissionId: submissionId },
  })
}
