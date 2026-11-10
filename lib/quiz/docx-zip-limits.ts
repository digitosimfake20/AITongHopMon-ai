export const MAX_DOCX_ENTRIES = 256
export const MAX_DOCX_UNCOMPRESSED_BYTES = 40 * 1024 * 1024

export type DocxZipEntryStat = {
  dir: boolean
  uncompressedSize: number
}

/**
 * Reject zip bombs / oversized DOCX payloads before materializing XML.
 * Returns null when within budget; otherwise an English machine reason.
 */
export function assertDocxZipBudget(
  entries: Iterable<DocxZipEntryStat>,
  limits: {
    maxEntries?: number
    maxUncompressedBytes?: number
  } = {},
): string | null {
  const maxEntries = limits.maxEntries ?? MAX_DOCX_ENTRIES
  const maxBytes = limits.maxUncompressedBytes ?? MAX_DOCX_UNCOMPRESSED_BYTES

  let entryCount = 0
  let totalUncompressed = 0

  for (const entry of entries) {
    if (entry.dir) continue
    entryCount += 1
    if (entryCount > maxEntries) {
      return `too_many_entries:${entryCount}`
    }
    const size = Number.isFinite(entry.uncompressedSize)
      ? Math.max(0, entry.uncompressedSize)
      : 0
    totalUncompressed += size
    if (totalUncompressed > maxBytes) {
      return `uncompressed_too_large:${totalUncompressed}`
    }
  }

  return null
}
