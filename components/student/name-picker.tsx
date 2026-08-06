'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Loader2, UserCheck, UserX, Search } from 'lucide-react'
import { claimRosterNameAction } from '@/app/actions/roster'
import type { RosterEntryPublic } from '@/app/actions/roster'

interface NamePickerProps {
  classId: string
  className: string
  entries: RosterEntryPublic[]
  currentUserId: string
}

export function NamePicker({ classId, className, entries, currentUserId }: NamePickerProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = entries.filter((e) =>
    e.fullName.toLowerCase().includes(search.toLowerCase()),
  )

  const alreadyClaimed = entries.find((e) => e.linkedUserId === currentUserId)

  function handleConfirm() {
    if (!selected) return
    startTransition(async () => {
      const result = await claimRosterNameAction({ rosterId: selected, classId })
      if (result.success && result.data) {
        toast.success(`Đã xác nhận tham gia lớp ${result.data.className}`)
        router.push(`/dashboard?class=${result.data.classId}`)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Không thể xác nhận')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="font-semibold text-slate-800 dark:text-slate-200">
          Chọn tên của bạn — <span className="text-teal-600">{className}</span>
        </h3>
        {alreadyClaimed ? (
          <p className="mt-1 text-sm text-emerald-600">
            Bạn đã liên kết với tên: <strong>{alreadyClaimed.fullName}</strong>
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-500">
            Tìm và chọn đúng tên của bạn trong danh sách lớp, sau đó bấm Xác nhận.
          </p>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm tên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Name grid */}
      <div className="grid max-h-[400px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {filtered.map((entry) => {
          const isLinkedByOther = !!entry.linkedUserId && entry.linkedUserId !== currentUserId
          const isLinkedByMe = entry.linkedUserId === currentUserId
          const isSelected = selected === entry.id

          return (
            <button
              key={entry.id}
              type="button"
              disabled={isLinkedByOther}
              onClick={() => !isLinkedByOther && setSelected(isSelected ? null : entry.id)}
              className={[
                'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                isLinkedByOther
                  ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-50 dark:border-slate-800 dark:bg-slate-900'
                  : isLinkedByMe
                    ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30'
                    : isSelected
                      ? 'border-teal-400 bg-teal-50 ring-2 ring-teal-400 dark:border-teal-600 dark:bg-teal-950/30'
                      : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/50 dark:border-slate-700 dark:bg-slate-800/50',
              ].join(' ')}
            >
              {/* STT badge */}
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                {entry.stt}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                  {entry.fullName}
                </p>
                <p className="text-[11px] text-slate-400">{entry.studentCode}</p>
              </div>

              {/* Status icon */}
              {isLinkedByMe && <UserCheck className="size-4 shrink-0 text-emerald-500" />}
              {isLinkedByOther && <UserX className="size-4 shrink-0 text-slate-400" />}
              {isSelected && !isLinkedByMe && <Check className="size-4 shrink-0 text-teal-600" />}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-slate-400">Không tìm thấy tên phù hợp</p>
      )}

      {/* Confirm button */}
      {selected && !alreadyClaimed && (
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          {isPending
            ? 'Đang xác nhận...'
            : `Xác nhận tham gia với tên "${entries.find((e) => e.id === selected)?.fullName}"`}
        </button>
      )}
    </div>
  )
}
