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
      <div>
        <h3 className="font-semibold text-foreground">
          Chọn tên của bạn · <span className="text-zeno">{className}</span>
        </h3>
        {alreadyClaimed ? (
          <p className="mt-1 text-sm text-emerald-600">
            Bạn đã liên kết với tên: <strong>{alreadyClaimed.fullName}</strong>
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Tìm và chọn đúng tên của bạn trong danh sách lớp, sau đó bấm Xác nhận.
          </p>
        )}
      </div>

      <div className="relative">
        <label htmlFor="name-picker-search" className="sr-only">
          Tìm tên trong danh sách lớp
        </label>
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          id="name-picker-search"
          type="search"
          placeholder="Tìm tên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-zeno"
        />
      </div>

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
                'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                isLinkedByOther
                  ? 'cursor-not-allowed border-border bg-muted opacity-50'
                  : isLinkedByMe
                    ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30'
                    : isSelected
                      ? 'border-zeno bg-zeno/10 ring-2 ring-zeno dark:bg-zeno/20'
                      : 'border-border bg-card hover:border-zeno/40 hover:bg-zeno/5',
              ].join(' ')}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                {entry.stt}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {entry.fullName}
                </p>
                <p className="text-[11px] text-muted-foreground">{entry.studentCode}</p>
              </div>

              {isLinkedByMe && <UserCheck className="size-4 shrink-0 text-emerald-500" aria-hidden />}
              {isLinkedByOther && <UserX className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
              {isSelected && !isLinkedByMe && <Check className="size-4 shrink-0 text-zeno" aria-hidden />}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">Không tìm thấy tên phù hợp</p>
      )}

      {selected && !alreadyClaimed && (
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-zeno py-3 font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Check className="size-4" aria-hidden />
          )}
          {isPending
            ? 'Đang xác nhận...'
            : `Xác nhận tham gia với tên "${entries.find((e) => e.id === selected)?.fullName}"`}
        </button>
      )}
    </div>
  )
}
