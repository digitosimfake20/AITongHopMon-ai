'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Clock3, Pencil, TrendingUp, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { deleteQuizPackageAction } from '@/lib/quiz/actions'
import type { QuizPackageSummary } from '@/lib/quiz/queries'
import { DIFFICULTY_LABELS } from '@/lib/quiz/types'
import { cn } from '@/lib/utils'

const MODE_LABELS = {
  STANDARD: 'Đề đơn',
  ADAPTIVE_PACKAGE: 'Bộ đề thích ứng',
} as const

interface QuizPackageCardProps {
  pkg: QuizPackageSummary
}

export function QuizPackageCard({ pkg }: QuizPackageCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!window.confirm(`Xóa "${pkg.title}"? Hành động này không thể hoàn tác.`)) return

    setIsDeleting(true)
    const result = await deleteQuizPackageAction(pkg.id)
    if (result.success) {
      toast.success('Đã xóa đề kiểm tra')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Không thể xóa đề')
      setIsDeleting(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">{pkg.title}</h3>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                pkg.mode === 'ADAPTIVE_PACKAGE'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-secondary text-muted-foreground',
              )}
            >
              {MODE_LABELS[pkg.mode]}
            </span>
          </div>
          {pkg.description && <p className="mt-1 text-sm text-muted-foreground">{pkg.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => router.push(`/teacher/assignments/${pkg.id}/edit`)}
            aria-label={`Sửa ${pkg.title}`}
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label={`Xóa ${pkg.title}`}
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={cn('mt-3 grid gap-2', pkg.tests.length > 1 && 'sm:grid-cols-3')}>
        {pkg.tests.map((test) => (
          <div key={test.id} className="rounded-lg bg-secondary/50 px-3 py-2.5">
            {pkg.mode === 'ADAPTIVE_PACKAGE' && (
              <span className="text-xs font-semibold text-foreground">
                {DIFFICULTY_LABELS[test.difficultyLevel]}
              </span>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{test.questionCount} câu</span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3" aria-hidden="true" />
                {test.timeLimitMinutes} phút
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" aria-hidden="true" />
                {test.submittedCount} đã nộp
              </span>
              <span className="inline-flex items-center gap-1">
                <TrendingUp className="size-3" aria-hidden="true" />
                {test.averageScore.toFixed(1)}/10
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
