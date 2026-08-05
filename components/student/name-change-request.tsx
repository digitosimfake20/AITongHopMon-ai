'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ArrowRightLeft, Loader2, Search, X } from 'lucide-react'
import { requestNameChangeAction } from '@/app/actions/roster'
import type { RosterEntryPublic } from '@/app/actions/roster'

interface NameChangeRequestProps {
  classId: string
  currentEntry: RosterEntryPublic
  allEntries: RosterEntryPublic[]
}

export function NameChangeRequest({ classId, currentEntry, allEntries }: NameChangeRequestProps) {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<RosterEntryPublic | null>(null)
  const [reason, setReason] = useState('')
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  const available = allEntries.filter(
    (e) =>
      e.id !== currentEntry.id &&
      !e.linkedUserId &&
      e.fullName.toLowerCase().includes(search.toLowerCase()),
  )

  function handleSubmit() {
    if (!target) { toast.error('Vui lòng chọn tên cần đổi sang'); return }
    startTransition(async () => {
      const result = await requestNameChangeAction({
        classId,
        targetRosterId: target.id,
        reason: reason.trim(),
      })
      if (result.success) {
        toast.success('Đã gửi yêu cầu đổi tên. Vui lòng đợi giáo viên duyệt.')
        setOpen(false)
        setTarget(null)
        setReason('')
      } else {
        toast.error(result.error ?? 'Không thể gửi yêu cầu')
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <ArrowRightLeft className="size-3.5" />
        Gửi yêu cầu đổi tên
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-semibold text-amber-900 dark:text-amber-300">Yêu cầu đổi tên</h4>
        <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-amber-100">
          <X className="size-4 text-amber-700" />
        </button>
      </div>

      <p className="mb-4 text-sm text-amber-800 dark:text-amber-300">
        Tên hiện tại:{' '}
        <strong className="rounded bg-rose-100 px-2 py-0.5 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          {currentEntry.fullName}
        </strong>
        . Hãy chọn tên đúng của bạn bên dưới.
      </p>

      {/* Search + picker */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Tìm tên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-white py-2 pl-9 pr-4 text-sm dark:bg-slate-900"
        />
      </div>

      <div className="mb-4 grid max-h-48 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
        {available.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setTarget(e.id === target?.id ? null : e)}
            className={[
              'flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-all',
              target?.id === e.id
                ? 'border-violet-400 bg-violet-50 font-medium text-violet-700 dark:border-violet-600 dark:bg-violet-950/40 dark:text-violet-300'
                : 'border-slate-200 bg-white hover:border-violet-300 dark:border-slate-700 dark:bg-slate-800',
            ].join(' ')}
          >
            <span className="w-5 shrink-0 text-center text-[10px] text-slate-400">{e.stt}</span>
            <span className="truncate">{e.fullName}</span>
          </button>
        ))}
        {available.length === 0 && (
          <p className="col-span-2 text-center text-xs text-slate-400">
            Không có tên khả dụng
          </p>
        )}
      </div>

      {/* Reason */}
      <textarea
        placeholder="Lý do đổi tên (tùy chọn, ví dụ: bấm nhầm tên bạn khác)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        className="mb-4 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm dark:bg-slate-900"
      />

      <button
        onClick={handleSubmit}
        disabled={!target || isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRightLeft className="size-4" />}
        {target
          ? `Gửi yêu cầu: đổi sang "${target.fullName}"`
          : 'Chọn tên cần đổi sang'}
      </button>
    </div>
  )
}
