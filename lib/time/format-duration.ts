/**
 * Human duration for teachers and students. Never emit raw milliseconds.
 * Storage stays in seconds (DB) or ms (decision math); this is display only.
 */
export function formatDurationSeconds(
  seconds: number,
  opts?: { perQuestion?: boolean },
): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  const suffix = opts?.perQuestion ? '/câu' : ''
  const tenths = Math.round(seconds * 10) / 10

  if (tenths >= 60 && Number.isInteger(tenths)) {
    const minutes = Math.floor(tenths / 60)
    const rest = tenths % 60
    const clock = rest === 0 ? `${minutes} phút` : `${minutes} phút ${rest} giây`
    return `${clock}${suffix}`
  }

  const body = Number.isInteger(tenths)
    ? `${tenths} giây`
    : `${tenths.toFixed(1).replace('.', ',')} giây`
  return `${body}${suffix}`
}

export function formatDurationMs(ms: number, opts?: { perQuestion?: boolean }): string {
  return formatDurationSeconds(ms / 1000, opts)
}
