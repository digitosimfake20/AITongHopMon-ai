import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, BookOpen, Clock, ExternalLink, Trophy, TrendingUp, AlertTriangle } from 'lucide-react'
import { resolveTeacherContext } from '@/lib/dashboard/context'
import { getStudentDetail, type TopicMasteryItem } from '@/lib/quiz/teacher-student-queries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StudentDetailActions } from '@/components/teacher/student-detail-actions'
import { formatDurationSeconds } from '@/lib/time/format-duration'

interface PageProps {
  params: Promise<{ studentId: string }>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function ScoreBar({ score, total = 10 }: { score: number; total?: number }) {
  const pct = Math.min(100, (score / total) * 100)
  const color = score >= 8 ? 'bg-green-500' : score >= 5 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span
        className={`text-sm font-semibold ${
          score >= 8
            ? 'text-green-700 dark:text-green-400'
            : score >= 5
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-red-700 dark:text-red-400'
        }`}
      >
        {score.toFixed(1)}/10
      </span>
    </div>
  )
}

const MASTERY_CONFIG = {
  WEAK:     { emoji: '🔴', label: 'Yếu',           bar: 'bg-red-500',   badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  MEDIUM:   { emoji: '🟡', label: 'Đang tiến bộ',  bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  MASTERED: { emoji: '🟢', label: 'Thành thạo',   bar: 'bg-green-500', badge: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
}

function TopicRow({ t }: { t: TopicMasteryItem }) {
  const cfg = MASTERY_CONFIG[t.status]
  return (
    <li className="px-4 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-foreground">{t.topic}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.badge}`}>
          {cfg.emoji} {cfg.label}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${t.accuracy}%` }} />
        </div>
        <span className="w-10 text-right font-mono text-xs text-muted-foreground">{t.accuracy}%</span>
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function StudentDetailPage({ params }: PageProps) {
  const { studentId } = await params
  const { shell } = await resolveTeacherContext()
  const student = await getStudentDetail(studentId, shell.classId)

  if (!student) notFound()

  const weakTopicNames = student.weakTopics.map((t) => t.topic)
  const behaviorSignalLabels = student.behaviorSignals.map((s) => `${s.emoji} ${s.label}: ${s.description}`)

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/teacher/students" />}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {student.initials}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{student.fullName}</h1>
              <p className="text-sm text-muted-foreground">{student.email}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm">
            <BookOpen className="size-3.5 text-muted-foreground" />
            <span className="font-semibold text-foreground">{student.quizCount}</span>
            <span className="text-muted-foreground">bài đã nộp</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm">
            <Trophy className="size-3.5 text-muted-foreground" />
            <span className="font-semibold text-foreground">
              {student.avgScore !== null ? student.avgScore.toFixed(1) : '—'}
            </span>
            <span className="text-muted-foreground">trung bình</span>
          </div>
        </div>
      </div>

      {/* ── Behavior signals ───────────────────────────────────────────────── */}
      {student.behaviorSignals.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-card-foreground">Tín hiệu Hành vi Học tập</h2>
          <div className="flex flex-wrap gap-2">
            {student.behaviorSignals.map((sig) => (
              <div
                key={sig.type}
                className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
                  sig.type === 'CARELESS'
                    ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20'
                    : sig.type === 'STUCK'
                      ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'
                      : sig.type === 'CONFIDENT'
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
                        : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20'
                }`}
              >
                <span className="text-lg leading-none">{sig.emoji}</span>
                <div>
                  <p className="font-semibold text-foreground">{sig.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{sig.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── Left column ──────────────────────────────────────────────────── */}
        <div className="space-y-5 lg:col-span-2">
          {/* Score trend */}
          {student.scoreHistory.length > 0 && (
            <div className="rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-6 py-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  <h2 className="font-semibold text-card-foreground">Xu hướng điểm số</h2>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-end gap-2 overflow-x-auto pb-2">
                  {student.scoreHistory.map((entry, i) => {
                    const pct = (entry.score / 10) * 100
                    const color =
                      entry.score >= 8
                        ? 'bg-green-500'
                        : entry.score >= 5
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    return (
                      <div key={entry.submissionId} className="flex shrink-0 flex-col items-center gap-1">
                        <span className="text-xs font-bold text-foreground">{entry.score.toFixed(1)}</span>
                        <div className="relative h-24 w-8 overflow-hidden rounded-md bg-secondary">
                          <div
                            className={`absolute bottom-0 w-full rounded-md transition-all ${color}`}
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                        <span className="w-14 text-center text-[10px] text-muted-foreground leading-tight">
                          {i + 1}. {entry.testTitle.slice(0, 12)}{entry.testTitle.length > 12 ? '…' : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Submissions history */}
          <div className="rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="font-semibold text-card-foreground">Lịch sử nộp bài</h2>
            </div>
            {student.submissions.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                Học sinh chưa nộp bài kiểm tra nào.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {student.submissions.map((sub) => (
                  <li
                    key={sub.submissionId}
                    className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{sub.testTitle}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" /> {formatDurationSeconds(sub.timeSpentSeconds)}
                        </span>
                        <span>{formatDate(sub.submittedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ScoreBar score={sub.score} />
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1.5"
                        nativeButton={false}
                        render={<Link href={`/quiz/result/${sub.submissionId}`} />}
                      >
                        <ExternalLink className="size-3.5" />
                        Chi tiết
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Right sidebar ─────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Topic mastery matrix */}
          <div className="rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-4 py-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-destructive" />
                <h2 className="font-semibold text-card-foreground">Thành thạo theo Chủ đề (BKT)</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Cùng thang đo với lộ trình học sinh (≥85% thành thạo, ≥60% đang tiến bộ).
              </p>
            </div>
            {student.topicMastery.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Học sinh chưa có dữ liệu bài làm.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {student.topicMastery.map((t) => (
                  <TopicRow key={t.topicKey ?? t.topic} t={t} />
                ))}
              </ul>
            )}
          </div>

          {/* AI Actions */}
          <div className="rounded-2xl border border-border bg-card px-5 py-5">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground">Hành động AI</h3>
            <StudentDetailActions
              studentName={student.fullName}
              avgScore={student.avgScore ?? 0}
              weakTopics={weakTopicNames}
              behaviorSignals={behaviorSignalLabels}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
