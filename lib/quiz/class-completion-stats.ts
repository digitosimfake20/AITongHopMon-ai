/** Distinct (student × test) completion — multi-submit same test counts once. */
export function computeClassCompletionDetail(
  studentCount: number,
  testCount: number,
  completedDistinctPairs: number,
): { completedSlots: number; expectedSlots: number; completionRate: number } {
  const expectedSlots = studentCount * Math.max(testCount, 1)
  const completedSlots = Math.max(0, completedDistinctPairs)
  const completionRate =
    expectedSlots > 0 ? Math.round((completedSlots / expectedSlots) * 100) : 0
  return { completedSlots, expectedSlots, completionRate }
}
