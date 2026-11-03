import Link from 'next/link'
import { Users, ChevronRight, Trophy, BookOpen, Clock } from 'lucide-react'
import { resolveTeacherContext } from '@/lib/dashboard/context'
import { getStudentsForClass } from '@/lib/quiz/teacher-student-queries'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/** Matches dashboard at-risk card: average score below 5.0/10. */
const AT_RISK_AVG_THRESHOLD = 5

function formatDate(date: Date | null): string {
  if (!date) return 'Chưa làm bài'
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function ScoreBadge({ avg }: { avg: number | null }) {
  if (avg === null) return <Badge variant="secondary">Chưa có điểm</Badge>
  const val = avg
  if (val >= 8) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">{val.toFixed(1)}/10</Badge>
  if (val >= 5) return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">{val.toFixed(1)}/10</Badge>
  return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">{val.toFixed(1)}/10</Badge>
}

interface PageProps {
  searchParams: Promise<{ filter?: string }>
}

export default async function TeacherStudentsPage({ searchParams }: PageProps) {
  const { filter } = await searchParams
  const atRiskOnly = filter === 'at-risk'
  const { shell } = await resolveTeacherContext()
  const students = await getStudentsForClass(shell.classId)
  const visible = atRiskOnly
    ? students.filter((s) => s.avgScore !== null && s.avgScore < AT_RISK_AVG_THRESHOLD)
    : students

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-primary" aria-hidden />
          <div>
            <h1 className="text-xl font-bold text-foreground">Danh sách học sinh</h1>
            <p className="text-sm text-muted-foreground">
              {shell.className} · {visible.length}
              {atRiskOnly ? ` / ${students.length}` : ''} học sinh
              {atRiskOnly ? ' cần chú ý' : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc danh sách">
          <Link
            href="/teacher/students"
            className={cn(
              'inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              !atRiskOnly
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-foreground hover:bg-muted',
            )}
            aria-current={!atRiskOnly ? 'page' : undefined}
          >
            Tất cả
          </Link>
          <Link
            href="/teacher/students?filter=at-risk"
            className={cn(
              'inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              atRiskOnly
                ? 'bg-destructive text-destructive-foreground'
                : 'border border-border bg-card text-foreground hover:bg-muted',
            )}
            aria-current={atRiskOnly ? 'page' : undefined}
          >
            Cần chú ý
          </Link>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Users className="mx-auto size-10 text-muted-foreground/40" aria-hidden />
          <p className="mt-3 text-sm text-muted-foreground">
            {atRiskOnly
              ? 'Không có học sinh điểm trung bình dưới 5.0 trong lớp này.'
              : 'Chưa có học sinh nào trong lớp này.'}
          </p>
          {atRiskOnly ? (
            <Link
              href="/teacher/students"
              className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Xem tất cả học sinh
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((student) => (
            <li key={student.id}>
              <Link
                href={`/teacher/students/${student.id}`}
                className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {student.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground group-hover:text-primary">
                      {student.fullName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{student.email}</p>
                  </div>
                  <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
                  <div className="flex flex-col items-center gap-0.5">
                    <BookOpen className="size-4 text-muted-foreground" aria-hidden />
                    <p className="text-base font-bold text-foreground">{student.quizCount}</p>
                    <p className="text-xs text-muted-foreground">Bài đã nộp</p>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Trophy className="size-4 text-muted-foreground" aria-hidden />
                    <p className="text-base font-bold text-foreground">
                      {student.avgScore !== null ? student.avgScore.toFixed(1) : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">TB điểm</p>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Clock className="size-4 text-muted-foreground" aria-hidden />
                    <p className="text-center text-xs font-medium leading-tight text-foreground">
                      {formatDate(student.lastActive)}
                    </p>
                    <p className="text-xs text-muted-foreground">Hoạt động</p>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <ScoreBadge avg={student.avgScore} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
