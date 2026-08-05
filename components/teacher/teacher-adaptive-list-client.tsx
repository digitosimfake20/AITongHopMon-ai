'use client'

import Link from 'next/link'
import { Sparkles, BarChart3, Clock } from 'lucide-react'
import type { AdaptiveAssignmentSummary } from '@/app/actions/test-group'
import { Button } from '@/components/ui/button'
import { withClassParam } from '@/lib/class/with-class-param'

interface TeacherAdaptiveListClientProps {
  assignments: AdaptiveAssignmentSummary[]
  classId: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function TeacherAdaptiveListClient({
  assignments,
  classId,
}: TeacherAdaptiveListClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Sparkles className="size-5 text-emerald-500" />
          Tổng hợp bài giao phân hóa
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Theo dõi tiến trình 2 lượt làm bài của học sinh (L1 TB → L2 Dễ/Khó).
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Chưa giao cụm đề phân hóa nào.{' '}
          <Link href={withClassParam('/teacher/test-bank', classId)} className="text-primary underline">
            Giao tại Ngân hàng đề
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {assignments.map((a) => (
            <article
              key={a.classTestId}
              className="flex flex-col gap-3 rounded-2xl border border-slate-700/40 bg-slate-900/30 p-5"
            >
              <h2 className="font-semibold">{a.title}</h2>
              <p className="text-xs text-muted-foreground">
                {a.subject}
                {a.topic && ` · ${a.topic}`}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                  <Clock className="size-3" />
                  {formatDate(a.startTime)} → {formatDate(a.endTime)}
                </span>
                <span className="rounded-full border px-2 py-0.5">
                  {a.studentCompletedCount}/{a.studentTotalCount} hoàn thành
                </span>
              </div>
              <Button
                type="button"
                className="mt-auto min-h-10 gap-2"
                nativeButton={false}
                render={
                  <Link href={withClassParam(`/teacher/adaptive/${a.classTestId}`, classId)} />
                }
              >
                <BarChart3 className="size-4" />
                Xem chi tiết học sinh
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
