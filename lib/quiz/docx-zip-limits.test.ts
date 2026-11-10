import { describe, expect, it } from 'vitest'
import { assertDocxZipBudget } from '@/lib/quiz/docx-zip-limits'

describe('assertDocxZipBudget', () => {
  it('allows a small docx-shaped zip', () => {
    expect(
      assertDocxZipBudget([
        { dir: true, uncompressedSize: 0 },
        { dir: false, uncompressedSize: 12_000 },
        { dir: false, uncompressedSize: 4_000 },
      ]),
    ).toBeNull()
  })

  it('rejects too many file entries', () => {
    const entries = Array.from({ length: 10 }, () => ({
      dir: false,
      uncompressedSize: 10,
    }))
    expect(assertDocxZipBudget(entries, { maxEntries: 5 })).toMatch(
      /^too_many_entries:/,
    )
  })

  it('rejects uncompressed size over the cap', () => {
    expect(
      assertDocxZipBudget(
        [
          { dir: false, uncompressedSize: 3_000_000 },
          { dir: false, uncompressedSize: 3_000_000 },
        ],
        { maxUncompressedBytes: 5_000_000 },
      ),
    ).toMatch(/^uncompressed_too_large:/)
  })
})
