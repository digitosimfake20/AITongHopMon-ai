/** Revive ISO date strings after unstable_cache JSON round-trip. */
export function asDate(value: unknown): Date | null {
  if (value == null) return null
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

export function asDateRequired(value: unknown, fallback = new Date(0)): Date {
  return asDate(value) ?? fallback
}
