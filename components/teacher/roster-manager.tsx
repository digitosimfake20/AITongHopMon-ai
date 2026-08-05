'use client'

import { useState, useRef, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Upload, Plus, Trash2, Pencil, Check, X, FileSpreadsheet,
  Users, Save, AlertTriangle, Loader2,
} from 'lucide-react'
import {
  parseExcelRosterAction,
  saveRosterAction,
  addRosterEntryAction,
  updateRosterEntryAction,
  deleteRosterEntryAction,
  getClassRosterAction,
} from '@/app/actions/roster'
import type { RosterEntryPublic } from '@/app/actions/roster'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LocalRow {
  id: string          // existing DB id or temp id
  stt: number
  studentCode: string
  fullName: string
  linkedUserId: string | null
  linkedUserName?: string | null
  isDirty?: boolean
  isNew?: boolean
}

interface RosterManagerProps {
  classId: string
  initialRoster: RosterEntryPublic[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function toLocalRows(entries: RosterEntryPublic[]): LocalRow[] {
  return entries.map((e) => ({ ...e, isDirty: false, isNew: false }))
}

export function RosterManager({ classId, initialRoster }: RosterManagerProps) {
  const router = useRouter()
  const [rows, setRows] = useState<LocalRow[]>(toLocalRows(initialRoster))
  const [previewRows, setPreviewRows] = useState<LocalRow[] | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ fullName: '', studentCode: '' })
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [showAddRow, setShowAddRow] = useState(false)
  const [newRow, setNewRow] = useState({ stt: '', studentCode: '', fullName: '' })
  const fileRef = useRef<HTMLInputElement>(null)

  const reloadRoster = useCallback(async () => {
    const result = await getClassRosterAction(classId)
    if (result.success && result.data) {
      setRows(toLocalRows(result.data))
      router.refresh()
      return true
    }
    toast.error(result.error ?? 'Không thể tải lại danh sách')
    return false
  }, [classId, router])

  // ── Excel upload ─────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)

    const fd = new FormData()
    fd.append('file', file)
    const result = await parseExcelRosterAction(fd)

    if (!result.success) {
      toast.error(result.error)
      setIsUploading(false)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    const data = result.data!
    toast.success(
      `Đọc file thành công: ${data.students.length} học sinh — ${data.meta.className}`,
    )
    setPreviewRows(
      data.students.map((s) => ({
        id: `preview-${s.stt}`,
        stt: s.stt,
        studentCode: s.studentCode,
        fullName: s.fullName,
        linkedUserId: null,
        isDirty: false,
        isNew: true,
      })),
    )
    setIsUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function cancelPreview() {
    setPreviewRows(null)
  }

  function confirmPreview() {
    if (!previewRows) return
    startTransition(async () => {
      const result = await saveRosterAction({
        classId,
        students: previewRows.map((r) => ({
          stt: r.stt,
          studentCode: r.studentCode,
          fullName: r.fullName,
        })),
      })
      if (result.success) {
        setPreviewRows(null)
        const reloaded = await reloadRoster()
        if (reloaded) toast.success('Đã lưu danh sách học sinh từ Excel')
      } else {
        toast.error(result.error ?? 'Không thể lưu')
      }
    })
  }

  // ── Inline edit ──────────────────────────────────────────────────────────

  function startEdit(row: LocalRow) {
    setEditingId(row.id)
    setEditValues({ fullName: row.fullName, studentCode: row.studentCode })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function saveEdit(row: LocalRow) {
    if (!editValues.fullName.trim()) {
      toast.error('Họ tên không được để trống')
      return
    }
    if (row.isNew) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, fullName: editValues.fullName.trim(), studentCode: editValues.studentCode.trim() }
            : r,
        ),
      )
      setEditingId(null)
      return
    }
    startTransition(async () => {
      const result = await updateRosterEntryAction({
        entryId: row.id,
        fullName: editValues.fullName,
        studentCode: editValues.studentCode,
      })
      if (result.success) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? { ...r, fullName: editValues.fullName.trim(), studentCode: editValues.studentCode.trim() }
              : r,
          ),
        )
        setEditingId(null)
        toast.success('Đã cập nhật')
      } else {
        toast.error(result.error ?? 'Không thể cập nhật')
      }
    })
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  function deleteRow(row: LocalRow) {
    if (row.isNew) {
      setRows((prev) => prev.filter((r) => r.id !== row.id))
      return
    }
    startTransition(async () => {
      const result = await deleteRosterEntryAction(row.id)
      if (result.success) {
        setRows((prev) => prev.filter((r) => r.id !== row.id))
        toast.success('Đã xóa')
      } else {
        toast.error(result.error ?? 'Không thể xóa')
      }
    })
  }

  // ── Add new row ───────────────────────────────────────────────────────────

  function addRow() {
    const stt = parseInt(newRow.stt, 10)
    if (isNaN(stt) || stt <= 0) { toast.error('STT phải là số dương'); return }
    if (!newRow.fullName.trim()) { toast.error('Họ tên không được để trống'); return }
    if (rows.some((r) => r.stt === stt)) { toast.error(`STT ${stt} đã tồn tại`); return }

    startTransition(async () => {
      const result = await addRosterEntryAction({
        classId,
        stt,
        studentCode: newRow.studentCode.trim() || String(stt),
        fullName: newRow.fullName.trim(),
      })
      if (result.success) {
        setNewRow({ stt: '', studentCode: '', fullName: '' })
        setShowAddRow(false)
        await reloadRoster()
        toast.success('Đã thêm học sinh')
      } else {
        toast.error(result.error ?? 'Không thể thêm')
      }
    })
  }

  const displayRows = previewRows ?? rows

  return (
    <div className="mt-4 space-y-4">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Users className="size-4" />
          Danh sách học sinh ({rows.length} em)
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Excel upload */}
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
            {isUploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
            )}
            {isUploading ? 'Đang đọc...' : 'Upload Excel'}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>

          {/* Add manual */}
          <button
            onClick={() => setShowAddRow((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
          >
            <Plus className="size-3.5" />
            Thêm thủ công
          </button>
        </div>
      </div>

      {/* ── Excel preview banner ─────────────────────────────────────────── */}
      {previewRows && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
          <AlertTriangle className="size-4 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm text-amber-800 dark:text-amber-300">
            Xem trước {previewRows.length} học sinh từ Excel. Nhấn <strong>Lưu danh sách</strong> để thay thế danh sách hiện tại.
          </p>
          <div className="flex gap-2">
            <button
              onClick={cancelPreview}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              onClick={confirmPreview}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
              Lưu danh sách
            </button>
          </div>
        </div>
      )}

      {/* ── Add manual row form ──────────────────────────────────────────── */}
      {showAddRow && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-800 dark:bg-violet-950/30">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-slate-500">STT</label>
            <input
              type="number"
              min={1}
              value={newRow.stt}
              onChange={(e) => setNewRow((p) => ({ ...p, stt: e.target.value }))}
              className="w-16 rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
              placeholder="1"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-slate-500">Mã học sinh</label>
            <input
              value={newRow.studentCode}
              onChange={(e) => setNewRow((p) => ({ ...p, studentCode: e.target.value }))}
              className="w-32 rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
              placeholder="HS001"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-slate-500">Họ và tên *</label>
            <input
              value={newRow.fullName}
              onChange={(e) => setNewRow((p) => ({ ...p, fullName: e.target.value }))}
              className="w-48 rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
              placeholder="Nguyễn Văn A"
            />
          </div>
          <button
            onClick={addRow}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Thêm
          </button>
          <button
            onClick={() => setShowAddRow(false)}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Đóng
          </button>
        </div>
      )}

      {/* ── Roster table ─────────────────────────────────────────────────── */}
      {displayRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
          <Upload className="mx-auto size-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            Chưa có danh sách học sinh. Upload file Excel hoặc thêm thủ công.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <th className="px-3 py-2.5 text-left font-medium text-slate-500">STT</th>
                <th className="px-3 py-2.5 text-left font-medium text-slate-500">Mã HS</th>
                <th className="px-3 py-2.5 text-left font-medium text-slate-500">Họ và Tên</th>
                <th className="px-3 py-2.5 text-left font-medium text-slate-500">Tài khoản</th>
                <th className="px-3 py-2.5 text-center font-medium text-slate-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayRows.map((row) => (
                <tr
                  key={row.id}
                  className={`transition-colors ${previewRows ? 'bg-amber-50/40 dark:bg-amber-950/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}
                >
                  <td className="px-3 py-2 font-mono text-slate-400">{row.stt}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{row.studentCode}</td>

                  {/* Name cell — editable */}
                  <td className="px-3 py-2">
                    {editingId === row.id ? (
                      <input
                        autoFocus
                        value={editValues.fullName}
                        onChange={(e) => setEditValues((p) => ({ ...p, fullName: e.target.value }))}
                        className="w-full rounded border border-violet-400 bg-white px-2 py-1 text-sm focus:outline-none dark:bg-slate-900"
                      />
                    ) : (
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {row.fullName}
                      </span>
                    )}
                  </td>

                  {/* Linked account */}
                  <td className="px-3 py-2">
                    {row.linkedUserId ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {row.linkedUserName ?? 'Đã liên kết'}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Chưa có</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2 text-center">
                    {editingId === row.id ? (
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => saveEdit(row)}
                          className="rounded p-1 hover:bg-emerald-100 dark:hover:bg-emerald-950"
                        >
                          <Check className="size-3.5 text-emerald-600" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <X className="size-3.5 text-slate-500" />
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex gap-1">
                        {!previewRows && (
                          <button
                            onClick={() => startEdit(row)}
                            className="rounded p-1 hover:bg-blue-100 dark:hover:bg-blue-950"
                            title="Sửa"
                          >
                            <Pencil className="size-3.5 text-blue-500" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteRow(row)}
                          disabled={isPending}
                          className="rounded p-1 hover:bg-rose-100 dark:hover:bg-rose-950"
                          title="Xóa"
                        >
                          <Trash2 className="size-3.5 text-rose-500" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
