export type AtRiskAggRow = {
  studentId: string
  avgScore: number
}

/**
 * Pure filter used by teacher dash (and unit tests).
 * SQL path should already LIMIT; this keeps JS behavior identical if raw rows vary.
 */
export function pickAtRiskStudents(
  rows: AtRiskAggRow[],
  limit = 3,
  threshold = 5,
): AtRiskAggRow[] {
  return rows
    .filter((row) => Number.isFinite(row.avgScore) && row.avgScore < threshold)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, limit)
}
