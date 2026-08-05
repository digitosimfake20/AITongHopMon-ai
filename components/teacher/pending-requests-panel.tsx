'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Loader2, Bell } from 'lucide-react'
import { resolveChangeRequestAction } from '@/app/actions/roster'
import type { ChangeRequestDetail } from '@/app/actions/roster'

interface PendingRequestsPanelProps {
  requests: ChangeRequestDetail[]
}

export function PendingRequestsPanel({ requests: initial }: PendingRequestsPanelProps) {
  const [requests, setRequests] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState<string | null>(null)

  function resolve(requestId: string, approve: boolean) {
    setProcessingId(requestId)
    startTransition(async () => {
      const result = await resolveChangeRequestAction({ requestId, approve })
      if (result.success) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId))
        toast.success(approve ? 'Đã đồng ý đổi tên' : 'Đã từ chối yêu cầu')
      } else {
        toast.error(result.error ?? 'Không thể xử lý yêu cầu')
      }
      setProcessingId(null)
    })
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-700">
        <Bell className="mx-auto size-8 text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">Không có yêu cầu nào đang chờ duyệt</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const isProcessing = processingId === req.id && isPending
        return (
          <div
            key={req.id}
            className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800 dark:bg-amber-950/30"
          >
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                <span className="font-semibold">{req.userName}</span> muốn đổi từ{' '}
                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  {req.currentName}
                </span>{' '}
                sang{' '}
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  {req.targetName}
                </span>
              </p>
              {req.reason && (
                <p className="mt-1 text-xs text-slate-500">Lý do: {req.reason}</p>
              )}
              <p className="mt-0.5 text-[11px] text-slate-400">
                {new Date(req.createdAt).toLocaleString('vi-VN')}
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => resolve(req.id, false)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:bg-slate-800"
              >
                {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <XCircle className="size-3.5" />}
                Từ chối
              </button>
              <button
                onClick={() => resolve(req.id, true)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                Đồng ý
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
