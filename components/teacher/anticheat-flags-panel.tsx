'use client'

import { useEffect, useState, useTransition } from 'react'
import { CheckCircle2, Eye, Loader2, ShieldAlert, ShieldOff, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  listFlagsForSubmissionAction,
  reviewFlagAction,
  setUnproctoredReasonAction,
  type AnticheatFlagItem,
  type FlagReviewDecision,
  type TeacherUnproctoredReason,
  type UnproctoredAttemptInfo,
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

function unproctoredReasonLabel(reason: NonNullable<UnproctoredAttemptInfo['reason']>): string {
  if (reason === 'refused_monitoring') return 'Từ chối giám sát'
  if (reason === 'accommodation') return 'Điều chỉnh / miễn giám sát'
  if (reason === 'technical_issue') return 'Sự cố kỹ thuật'
  if (reason === 'paper_fallback') return 'Làm bài giấy'
  return reason
}

export function AnticheatFlagsPanel({
  submissionId,
  testTitle,
  compact = false,
}: AnticheatFlagsPanelProps) {
  const [flags, setFlags] = useState<AnticheatFlagItem[]>([])
  const [unproctored, setUnproctored] = useState<UnproctoredAttemptInfo | null>(null)
  const [loadedForId, setLoadedForId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [reasonBusy, setReasonBusy] = useState<TeacherUnproctoredReason | null>(null)
  const isLoading = loadedForId !== submissionId

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const result = await listFlagsForSubmissionAction({ submissionId })
      if (cancelled) return
      if (!result.success || !result.data) {
        setLoadError(result.error ?? 'Không tải được tín hiệu giám sát')
        setFlags([])
        setUnproctored({ reason: null, at: null, by: null })
        setLoadedForId(submissionId)
        return
      }
      setFlags(result.data.flags)
      setUnproctored(result.data.unproctored)
      setLoadError(null)
      setLoadedForId(submissionId)
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

  function setReason(reason: TeacherUnproctoredReason) {
    setReasonBusy(reason)
    startTransition(async () => {
      const result = await setUnproctoredReasonAction({ submissionId, reason })
      if (result.success && result.data) {
        setUnproctored({
          reason: result.data.reason,
          at: result.data.unproctoredAt,
          by: null,
        })
        toast.success(
          reason === 'accommodation'
            ? 'Đã ghi nhận điều chỉnh / miễn giám sát'
            : 'Đã ghi nhận sự cố kỹ thuật',
        )
      } else {
        toast.error(result.error ?? 'Không cập nhật được lý do')
      }
      setReasonBusy(null)
    })
  }

  const pendingCount = (flags ?? []).filter((f) => f.reviewStatus === 'pending').length
  const isUnproctored = Boolean(unproctored?.reason)

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

      <div className={compact ? 'space-y-3' : 'space-y-3 px-5 py-4'}>
        {isLoading ? null : (
          <div
            className="rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2.5 dark:border-sky-900 dark:bg-sky-950/30"
            role="status"
          >
            <div className="flex items-start gap-2">
              <ShieldOff
                className="mt-0.5 size-3.5 shrink-0 text-sky-700 dark:text-sky-300"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                {isUnproctored && unproctored?.reason ? (
                  <>
                    <p className="text-sm font-medium text-sky-900 dark:text-sky-100">
                      Bài làm không giám sát · {unproctoredReasonLabel(unproctored.reason)}
                    </p>
                    {unproctored.at ? (
                      <p className="mt-0.5 text-xs text-sky-800/80 dark:text-sky-200/80">
                        Ghi nhận lúc {new Date(unproctored.at).toLocaleString('vi-VN')}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-sky-900 dark:text-sky-100">
                    Chưa ghi nhận lý do làm bài không giám sát.
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending || reasonBusy !== null}
                    className="gap-1.5"
                    onClick={() => setReason('accommodation')}
                  >
                    {reasonBusy === 'accommodation' ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : null}
                    Đánh dấu điều chỉnh
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending || reasonBusy !== null}
                    className="gap-1.5"
                    onClick={() => setReason('technical_issue')}
                  >
                    {reasonBusy === 'technical_issue' ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : null}
                    Đánh dấu sự cố kỹ thuật
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
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
