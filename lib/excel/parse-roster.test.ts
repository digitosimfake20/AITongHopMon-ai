import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parseRosterBuffer } from '@/lib/excel/parse-roster'

function toArrayBuffer(data: Buffer | Uint8Array | number[]): ArrayBuffer {
  const bytes = data instanceof Buffer || data instanceof Uint8Array
    ? data
    : Uint8Array.from(data)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

function rosterBuffer(opts?: {
  subject?: string
  className?: string
  term?: string
  rows?: Array<[number | string, string, string, string]>
}): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  const aoa: unknown[][] = [
    [null, null, null, opts?.subject ?? 'Toán'],
    [null, null, null, opts?.className ?? '9A1'],
    [null, null, null, opts?.term ?? 'HK1 2025'],
    [],
    [],
    [],
    [],
  ]
  const rows = opts?.rows ?? [
    [1, 'SGD1', 'HS001', 'Nguyen Van A'],
    [2, 'SGD2', 'HS002', 'Tran Thi B'],
  ]
  for (const row of rows) {
    aoa.push([row[0], row[1], row[2], row[3]])
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa as (string | number | null)[][])
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return toArrayBuffer(out)
}

describe('parseRosterBuffer', () => {
  it('reads meta from D1–D3 and students from row 8+', () => {
    const parsed = parseRosterBuffer(
      rosterBuffer({
        subject: 'Vật lý',
        className: '10A',
        term: 'HK2',
      }),
    )
    expect(parsed.meta).toEqual({
      subject: 'Vật lý',
      className: '10A',
      term: 'HK2',
    })
    expect(parsed.students).toEqual([
      { stt: 1, studentCode: 'HS001', fullName: 'Nguyen Van A' },
      { stt: 2, studentCode: 'HS002', fullName: 'Tran Thi B' },
    ])
  })

  it('defaults empty meta cells and synthesizes code from STT when missing', () => {
    const parsed = parseRosterBuffer(
      rosterBuffer({
        subject: '',
        className: '',
        term: '',
        rows: [[3, '', '', 'Le Van C']],
      }),
    )
    expect(parsed.meta.subject).toBe('Toán')
    expect(parsed.meta.className).toBe('Lớp học')
    expect(parsed.meta.term).toBe('')
    expect(parsed.students).toEqual([
      { stt: 3, studentCode: '3', fullName: 'Le Van C' },
    ])
  })

  it('skips non-numeric / non-positive STT and blank names', () => {
    const parsed = parseRosterBuffer(
      rosterBuffer({
        rows: [
          ['x', '', 'C1', 'Skip me'],
          [0, '', 'C2', 'Also skip'],
          [1, '', 'C3', ''],
          [2, '', 'C4', 'Keep'],
        ],
      }),
    )
    expect(parsed.students).toEqual([
      { stt: 2, studentCode: 'C4', fullName: 'Keep' },
    ])
  })

  it('parses string STT when numeric', () => {
    const parsed = parseRosterBuffer(
      rosterBuffer({ rows: [['4', '', 'HS4', 'Pham D']] }),
    )
    expect(parsed.students[0]).toMatchObject({ stt: 4, studentCode: 'HS4' })
  })

  it('throws when no student rows found', () => {
    expect(() =>
      parseRosterBuffer(rosterBuffer({ rows: [['bad', '', '', '']] })),
    ).toThrow(/Không tìm thấy danh sách học sinh/)
  })
})
