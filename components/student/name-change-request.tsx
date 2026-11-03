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
    if (!target) { toast.error('Chọn tên cần đổi sang'); return }
    startTransition(async () => {
      const result = await requestNameChangeAction({
        classId,
        targetRosterId: target.id,
        reason: reason.trim(),
      })
      if (result.success) {
        toast.success('Đã gửi yêu cầu đổi tên. Chờ giáo viên duyệt.')
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
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <ArrowRightLeft className="size-3.5" aria-hidden />
        Gửi yêu cầu đổi tên
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-semibold text-amber-900 dark:text-amber-300">Yêu cầu đổi tên</h4>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          aria-label="Đóng yêu cầu đổi tên"
        >
          <X className="size-4 text-amber-700" aria-hidden />
        </button>
      </div>

      <p className="mb-4 text-sm text-amber-800 dark:text-amber-300">
        Tên hiện tại:{' '}
        <strong className="rounded bg-rose-100 px-2 py-0.5 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          {currentEntry.fullName}
        </strong>
        . Chọn tên đúng của bạn bên dưới.
      </p>

      <div className="relative mb-3">
        <label htmlFor="name-change-search" className="sr-only">
          Tìm tên cần đổi sang
        </label>
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          id="name-change-search"
          type="search"
          placeholder="Tìm tên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-zeno"
        />
      </div>

      <div className="mb-4 grid max-h-48 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
        {available.map((e) => (
          <button
            key={e.id}
            type="button"
            aria-pressed={target?.id === e.id}
            onClick={() => setTarget(e.id === target?.id ? null : e)}
            className={[
              'flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zeno focus-visible:ring-offset-2',
              target?.id === e.id
                ? 'border-zeno bg-zeno/10 font-medium text-zeno'
                : 'border-border bg-card hover:border-zeno/40',
            ].join(' ')}
          >
            <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">{e.stt}</span>
            <span className="truncate">{e.fullName}</span>
          </button>
        ))}
        {available.length === 0 && (
          <p className="col-span-2 text-center text-xs text-muted-foreground">
            Không có tên khả dụng
          </p>
        )}
      </div>

      <label htmlFor="name-change-reason" className="sr-only">
        Lý do đổi tên (tùy chọn)
      </label>
      <textarea
        id="name-change-reason"
        placeholder="Lý do đổi tên (tùy chọn, ví dụ: bấm nhầm tên bạn khác)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        className="mb-4 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zeno"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!target || isPending}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-zeno py-2.5 text-sm font-semibold text-zeno-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zeno focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ArrowRightLeft className="size-4" aria-hidden />}
        {target
          ? `Gửi yêu cầu: đổi sang "${target.fullName}"`
          : 'Chọn tên cần đổi sang'}
      </button>
    </div>
  )
}
