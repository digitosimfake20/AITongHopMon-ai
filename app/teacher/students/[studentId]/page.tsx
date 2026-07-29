import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, AlertTriangle, BookOpen, Clock, ExternalLink, Trophy } from 'lucide-react'
import { resolveTeacherContext } from '@/lib/dashboard/context'
import { getStudentDetail } from '@/lib/quiz/teacher-student-queries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ studentId: string }>
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}p ${s}s` : `${s}s`
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
        className={`text-sm font-semibold ${score >= 8 ? 'text-green-700 dark:text-green-400' : score >= 5 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400'}`}
      >
        {score.toFixed(1)}/10
      </span>
    </div>
  )
}

export default async function StudentDetailPage({ params }: PageProps) {
  const { studentId } = await params
  const { shell } = await resolveTeacherContext()
  const student = await getStudentDetail(studentId, shell.classId)

  if (!student) notFound()

  return (
    <div className="space-y-6">
      {/* Back + header */}
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

        {/* Summary badges */}
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

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Submissions table */}
        <div className="lg:col-span-2">
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
                  <li key={sub.submissionId} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{sub.testTitle}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" /> {formatTime(sub.timeSpentSeconds)}
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
                        Xem chi tiết
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Weak topics sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-destructive" />
                <h2 className="font-semibold text-card-foreground">Điểm yếu kiến thức</h2>
              </div>
            </div>
            {student.weakTopics.length === 0 ? (
              <div className="px-6 py-6 text-center text-sm text-muted-foreground">
                Học sinh chưa có dữ liệu bài làm.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {student.weakTopics.map((t, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-6 py-3">
                    <p className="text-sm text-foreground">{t.topic}</p>
                    <Badge variant="destructive" className="shrink-0 text-[10px]">
                      {t.wrongCount} lỗi
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card px-6 py-5">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground">Hành động nhanh</h3>
            <div className="space-y-2">
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                nativeButton={false}
                render={<Link href={`/teacher/assignments?student=${studentId}`} />}
              >
                <BookOpen className="size-4" />
                Giao thêm bài tập
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                nativeButton={false}
                render={<Link href="/teacher/gaps" />}
              >
                <AlertTriangle className="size-4" />
                Xem bản đồ lỗ hổng
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
