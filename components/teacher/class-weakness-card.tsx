'use client'

import { useState } from 'react'
import { AlertTriangle, BookOpen, ChevronDown, ChevronUp, Loader2, Sparkles, Video, Users, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ClassWeakness } from '@/lib/teacher-types'
import {
  generateRemedialSuggestionAction,
  type RemedialSuggestion,
} from '@/app/actions/teacher-ai'

const ACTIVITY_ICON: Record<string, React.ReactNode> = {
  exercise: <BookOpen className="size-3.5 shrink-0 text-blue-500" />,
  video: <Video className="size-3.5 shrink-0 text-teal-500" />,
  discussion: <Users className="size-3.5 shrink-0 text-amber-500" />,
  quiz: <HelpCircle className="size-3.5 shrink-0 text-green-500" />,
}

function RemedialPanel({
  topic,
  wrongCount,
  studentPercent,
}: {
  topic: string
  wrongCount: number
  studentPercent: number
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RemedialSuggestion | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    if (result) {
      setOpen((v) => !v)
      return
    }
    setLoading(true)
    setOpen(true)
    setError(null)
    const res = await generateRemedialSuggestionAction(topic, wrongCount, studentPercent)
    setLoading(false)
    if (res.ok) {
      setResult(res.data)
    } else {
      setError(res.error)
    }
  }

  return (
    <div className="mt-3">
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Sparkles className="size-3.5" />
        )}
        Gợi ý Phụ đạo
        {result && !loading && (open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />)}
      </Button>

      {open && (
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          {loading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Đang tạo gợi ý...
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {result && (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-foreground">{result.summary}</p>
              <ul className="space-y-2">
                {result.activities.map((act, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    {ACTIVITY_ICON[act.type] ?? <BookOpen className="size-3.5 shrink-0 text-muted-foreground" />}
                    <div>
                      <p className="font-medium text-foreground">{act.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{act.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ClassWeaknessCardProps {
  weaknesses: ClassWeakness[]
}

export function ClassWeaknessCard({ weaknesses }: ClassWeaknessCardProps) {
  return (
    <article className="col-span-1 rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-28px_rgba(0,0,0,0.18)] lg:col-span-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />
        <h2 className="text-base font-semibold text-card-foreground">
          Bản đồ Lỗ hổng Kiến thức Cả lớp
        </h2>
      </div>

      <ul className="mt-5 space-y-4">
        {weaknesses.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Chưa có dữ liệu bài làm. Giao bài kiểm tra để xem lỗ hổng cả lớp.
          </li>
        ) : (
          weaknesses.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-foreground">{item.label}</p>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                    {item.wrongCount} lượt sai
                  </span>
                  <span className="font-mono text-sm tabular-nums text-destructive">
                    {item.studentPercent}% lớp gặp khó
                  </span>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.sampleNote}</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-destructive transition-all duration-500"
                  style={{ width: `${item.studentPercent}%` }}
                />
              </div>
              <RemedialPanel
                topic={item.label}
                wrongCount={item.wrongCount}
                studentPercent={item.studentPercent}
              />
            </li>
          ))
        )}
      </ul>
    </article>
  )
}
