'use client'

import { useEffect, useState, useTransition } from 'react'
import { CheckCircle2, Eye, Loader2, ShieldAlert, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  listFlagsForSubmissionAction,
  reviewFlagAction,
  type AnticheatFlagItem,
  type FlagReviewDecision,
} from '@/app/actions/anticheat'
import { Button } from '@/components/ui/button'

interface AnticheatFlagsPanelProps {
  submissionId: string
  testTitle?: string
  /** Compact row under a submission list item */
  compact?: boolean
}

function triggerLabel(trigger: string): string {
  if (trigger === 'hint') return 'Gợi ý chuyển tab / rời trang'
  return trigger
}

function statusLabel(status: AnticheatFlagItem['reviewStatus']): string {
  if (status === 'confirmed') return 'Đã xác nhận'
  if (status === 'dismissed') return 'Đã bỏ qua'
  return 'Chờ xem'
}

export function AnticheatFlagsPanel({
  submissionId,
  testTitle,
  compact = false,
}: AnticheatFlagsPanelProps) {
  const [flags, setFlags] = useState<AnticheatFlagItem[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setFlags(null)
    setLoadError(null)

    void (async () => {
      const result = await listFlagsForSubmissionAction({ submissionId })
      if (cancelled) return
      if (!result.success || !result.data) {
        setLoadError(result.error ?? 'Không tải được tín hiệu giám sát')
        setFlags([])
        return
      }
      setFlags(result.data.flags)
    })()

    return () => {
      cancelled = true
    }
  }, [submissionId])

  function review(flagId: string, decision: FlagReviewDecision) {
    setProcessingId(flagId)
    startTransition(async () => {
      const result = await reviewFlagAction({ flagId, decision })
      if (result.success) {
        setFlags((prev) =>
          (prev ?? []).map((f) =>
            f.id === flagId ? { ...f, reviewStatus: decision } : f,
          ),
        )
        toast.success(decision === 'confirmed' ? 'Đã xác nhận tín hiệu' : 'Đã bỏ qua tín hiệu')
      } else {
        toast.error(result.error ?? 'Không cập nhật được tín hiệu')
      }
      setProcessingId(null)
    })
  }

  const pendingCount = (flags ?? []).filter((f) => f.reviewStatus === 'pending').length

  return (
    <section
      className={
        compact
          ? 'mt-3 rounded-xl border border-border bg-muted/20 p-3'
          : 'rounded-2xl border border-border bg-card'
      }
      aria-labelledby={`anticheat-flags-${submissionId}`}
    >
      <div className={compact ? 'mb-2' : 'border-b border-border px-5 py-4'}>
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
          <h3
            id={`anticheat-flags-${submissionId}`}
            className={compact ? 'text-sm font-semibold text-foreground' : 'font-semibold text-card-foreground'}
          >
            Tín hiệu giám sát
            {testTitle ? (
              <span className="ml-1 font-normal text-muted-foreground">· {testTitle}</span>
            ) : null}
          </h3>
          {pendingCount > 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              {pendingCount} chờ xem
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Chỉ mang tính tham khảo — không tự trừ điểm. Xác nhận hoặc bỏ qua sau khi xem lại.
        </p>
      </div>

      <div className={compact ? '' : 'px-5 py-4'}>
        {flags === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Đang tải tín hiệu...
          </div>
        ) : loadError ? (
          <p className="text-sm text-destructive" role="alert">
            {loadError}
          </p>
        ) : flags.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có tín hiệu nào được ghi nhận cho bài nộp này.
          </p>
        ) : (
          <ul className="space-y-3">
            {flags.map((flag) => {
              const busy = processingId === flag.id && isPending
              const reviewed = flag.reviewStatus !== 'pending'
              return (
                <li
                  key={flag.id}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-background px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Eye className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      {triggerLabel(flag.trigger)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(flag.createdAt).toLocaleString('vi-VN')}
                      {flag.detail ? ` · ${flag.detail}` : ''}
                      {' · '}
                      {statusLabel(flag.reviewStatus)}
                    </p>
                  </div>
                  {!reviewed ? (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        className="gap-1.5"
                        onClick={() => review(flag.id, 'dismissed')}
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        ) : (
                          <XCircle className="size-3.5" aria-hidden />
                        )}
                        Bỏ qua
                      </Button>
                      <Button
                        size="sm"
                        disabled={busy}
                        className="gap-1.5"
                        onClick={() => review(flag.id, 'confirmed')}
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        ) : (
                          <CheckCircle2 className="size-3.5" aria-hidden />
                        )}
                        Xác nhận
                      </Button>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
