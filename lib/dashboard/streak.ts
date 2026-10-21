/** Consecutive calendar days (local) with ≥1 submission, ending today or yesterday. */

export function computeStreakDays(submittedAtDates: Date[], now = new Date()): number {
  if (submittedAtDates.length === 0) return 0

  const dayKeys = new Set(
    submittedAtDates.map((d) => {
      const x = new Date(d)
      return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`
    }),
  )

  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayKey = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`

  // Streak may start from yesterday if nothing submitted today yet
  if (!dayKeys.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (true) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`
    if (!dayKeys.has(key)) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
