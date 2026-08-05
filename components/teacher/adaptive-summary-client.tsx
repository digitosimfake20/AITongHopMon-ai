'use client'

import Link from 'next/link'
import { ArrowLeft, Sparkles, Users } from 'lucide-react'
import type {
  AdaptiveAssignmentSummary,
  AdaptiveStudentRow,
} from '@/app/actions/test-group'
import { difficultyLabel } from '@/lib/adaptive/adaptive-logic'
import { Button } from '@/components/ui/button'
import { withClassParam } from '@/lib/class/with-class-param'

interface AdaptiveSummaryClientProps {
  assignment: AdaptiveAssignmentSummary
  students: AdaptiveStudentRow[]
  classId: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_LABELS = {
  not_started: { label: 'Chưa làm', color: 'bg-slate-100 text-slate-700' },
  round1_done: { label: 'Đang lượt 2', color: 'bg-cyan-950/50 text-cyan-400' },
  completed: { label: 'Hoàn thành', color: 'bg-green-100 text-green-700' },
}

export function AdaptiveSummaryClient({
  assignment,
  students,
  classId,
}: AdaptiveSummaryClientProps) {
  const completed = students.filter((s) => s.status === 'completed').length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <Button
          type="button"
          variant="outline"
          className="min-h-9 gap-1.5"
          nativeButton={false}
          render={<Link href={withClassParam('/teacher/adaptive', classId)} />}
        >
          <ArrowLeft className="size-4" />
          Danh sách
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-emerald-500" />
            <h1 className="text-xl font-bold">{assignment.title}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {assignment.subject}
            {assignment.topic && ` · ${assignment.topic}`}
            · Mở {formatDate(assignment.startTime)} — Hết hạn {formatDate(assignment.endTime)}
          </p>
          <p className="mt-1 font-mono text-xs text-cyan-500/90">
            Ngưỡng Khó ≥ {assignment.passScoreThreshold} · 2 lượt bắt buộc ·{' '}
            {completed}/{assignment.studentTotalCount} HS hoàn thành
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Học sinh</th>
              <th className="px-4 py-3 font-medium">Lượt 1 (TB)</th>
              <th className="px-4 py-3 font-medium">Lượt 2</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 font-medium">Đánh giá AI</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  <Users className="mx-auto size-8 opacity-40" />
                  <p className="mt-2">Chưa có học sinh trong lớp</p>
                </td>
              </tr>
            ) : (
              students.map((s) => {
                const st = STATUS_LABELS[s.status]
                return (
                  <tr key={s.studentId} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{s.fullName}</td>
                    <td className="px-4 py-3">
                      {s.round1Score != null ? (
                        <span className="font-semibold text-yellow-700">
                          {s.round1Score.toFixed(1)}/10
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.round2Difficulty ? (
                        <div>
                          <span className="rounded-full bg-cyan-950/50 px-2 py-0.5 font-mono text-xs font-medium text-cyan-400">
                            {difficultyLabel(s.round2Difficulty)}
                          </span>
                          {s.round2Score != null && (
                            <span className="ml-2 font-semibold">
                              {s.round2Score.toFixed(1)}/10
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Chờ lượt 1</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                      {s.evaluation}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
