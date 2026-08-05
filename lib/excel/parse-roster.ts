/**
 * Server-side Excel roster parser.
 * Expects a sổ điểm (grade-book) layout:
 *   D1 = subject name
 *   D2 = class name
 *   D3 = term / school year
 *   Row 8+ = student rows:  STT | Mã Sở GD | Mã Học Sinh | Họ và Tên | …
 */
import * as XLSX from 'xlsx'

export interface RosterMeta {
  subject: string
  className: string
  term: string
}

export interface RosterRow {
  stt: number
  studentCode: string   // Mã học sinh (col C = index 2)
  fullName: string
}

export interface ParsedRoster {
  meta: RosterMeta
  students: RosterRow[]
}

// ---------------------------------------------------------------------------
// Cell helpers
// ---------------------------------------------------------------------------

function cellText(ws: XLSX.WorkSheet, address: string): string {
  const cell = ws[address]
  if (!cell) return ''
  return String(cell.v ?? '').trim()
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseRosterBuffer(buffer: ArrayBuffer): ParsedRoster {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('File Excel không có sheet nào')

  const ws = workbook.Sheets[sheetName]!

  // ── Metadata ──────────────────────────────────────────────────────────────
  const meta: RosterMeta = {
    subject: cellText(ws, 'D1') || 'Toán',
    className: cellText(ws, 'D2') || 'Lớp học',
    term: cellText(ws, 'D3') || '',
  }

  // ── Student rows: start at row 8 (1-indexed → row index 7) ───────────────
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  const students: RosterRow[] = []

  for (let r = 7; r <= range.e.r; r++) {
    // Column A (index 0) = STT
    const sttCell = ws[XLSX.utils.encode_cell({ r, c: 0 })]
    const rawStt = sttCell?.v

    // Skip rows without a numeric STT
    if (rawStt === undefined || rawStt === null || rawStt === '') continue
    const stt = typeof rawStt === 'number' ? rawStt : parseInt(String(rawStt), 10)
    if (isNaN(stt) || stt <= 0) continue

    // Column C (index 2) = Mã học sinh
    const codeCell = ws[XLSX.utils.encode_cell({ r, c: 2 })]
    const studentCode = String(codeCell?.v ?? '').trim()

    // Column D (index 3) = Họ và tên
    const nameCell = ws[XLSX.utils.encode_cell({ r, c: 3 })]
    const fullName = String(nameCell?.v ?? '').trim()

    if (!fullName) continue  // skip empty rows

    students.push({ stt, studentCode: studentCode || `${stt}`, fullName })
  }

  if (students.length === 0) {
    throw new Error('Không tìm thấy danh sách học sinh. Hãy kiểm tra cấu trúc file Excel.')
  }

  return { meta, students }
}
