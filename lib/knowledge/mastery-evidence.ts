/**
 * BKT mastery evidence caps — prevent "1 correct answer = 100% mastered".
 */

export const MASTERY_CAP_SINGLE_CORRECT = 0.6
/** Max mastery when fewer than 3 consecutive / total correct in session */
export const MASTERY_CAP_PROGRESSING = 0.84
export const MASTERY_MASTERED_THRESHOLD = 0.85

/**
 * ESSAY is stored as isCorrect=false for scoring placeholders, but is not
 * auto-graded — it must not enter BKT updates.
 */
export function contributesToMasteryUpdate(questionType: string): boolean {
  return questionType !== 'ESSAY'
}

/** Pick only auto-scored answers for computeTopicMasteryUpdate. */
export function masteryAnswersFromDetails(
  details: ReadonlyArray<{ type: string; isCorrect: boolean }>,
): Array<{ isCorrect: boolean }> {
  return details
    .filter((d) => contributesToMasteryUpdate(d.type))
    .map((d) => ({ isCorrect: d.isCorrect }))
}

export function maxConsecutiveCorrect(
  answers: readonly { isCorrect: boolean }[],
): number {
  let max = 0
  let streak = 0
  for (const a of answers) {
    if (a.isCorrect) {
      streak++
      if (streak > max) max = streak
    } else {
      streak = 0
    }
  }
  return max
}

/**
 * Cap BKT output based on evidence in the current submission batch.
 * - ≤1 correct in session → max 0.6 (Đang tiến bộ)
 * - Need ≥2 correct AND (streak ≥2 OR total ≥2) for above 0.6
 * - Need ≥3 consecutive OR ≥3 total correct for 0.85+ (Thành thạo)
 */
export function applyEvidenceCap(
  mastery: number,
  sessionAnswers: readonly { isCorrect: boolean }[],
): number {
  const correctCount = sessionAnswers.filter((a) => a.isCorrect).length
  const maxStreak = maxConsecutiveCorrect(sessionAnswers)

  if (correctCount <= 1) {
    return Math.min(mastery, MASTERY_CAP_SINGLE_CORRECT)
  }

  if (maxStreak < 2 && correctCount < 2) {
    return Math.min(mastery, MASTERY_CAP_SINGLE_CORRECT)
  }

  if (maxStreak < 3 && correctCount < 3) {
    return Math.min(mastery, MASTERY_CAP_PROGRESSING)
  }

  return mastery
}

/** Simple BKT-inspired single-step update */
export function bktUpdate(currentMastery: number, isCorrect: boolean): number {
  const LEARN_RATE = 0.22
  const FORGET_RATE = 0.15
  const updated = isCorrect
    ? currentMastery + (1 - currentMastery) * LEARN_RATE
    : currentMastery * (1 - FORGET_RATE)
  return Math.min(0.99, Math.max(0.05, updated))
}

/**
 * Full mastery update for one topic in a submission: sequential BKT then evidence cap.
 * Evidence caps only limit *growth* from thin sessions — never pull prior mastery down.
 * Declines from incorrect answers still apply via BKT.
 */
export function computeTopicMasteryUpdate(
  currentMastery: number,
  sessionAnswers: readonly { isCorrect: boolean }[],
): number {
  let mastery = currentMastery
  for (const a of sessionAnswers) {
    mastery = bktUpdate(mastery, a.isCorrect)
  }
  if (mastery <= currentMastery) {
    return mastery
  }
  const capped = applyEvidenceCap(mastery, sessionAnswers)
  return Math.max(currentMastery, capped)
}
