import Link from 'next/link'
import { Users, ChevronRight, Trophy, BookOpen, Clock } from 'lucide-react'
import { resolveTeacherContext } from '@/lib/dashboard/context'
import { getStudentsForClass } from '@/lib/quiz/teacher-student-queries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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

export default async function TeacherStudentsPage() {
  const { shell } = await resolveTeacherContext()
  const students = await getStudentsForClass(shell.classId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Danh sách Học sinh</h1>
            <p className="text-sm text-muted-foreground">
              {shell.className} · {students.length} học sinh
            </p>
          </div>
        </div>
      </div>

      {/* Student grid */}
      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Users className="mx-auto size-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Chưa có học sinh nào trong lớp này.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => (
            <li key={student.id}>
              <Link
                href={`/teacher/students/${student.id}`}
                className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
              >
                {/* Avatar + name */}
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
                  <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
                  <div className="flex flex-col items-center gap-0.5">
                    <BookOpen className="size-4 text-muted-foreground" />
                    <p className="text-base font-bold text-foreground">{student.quizCount}</p>
                    <p className="text-[10px] text-muted-foreground">Bài đã nộp</p>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Trophy className="size-4 text-muted-foreground" />
                    <p className="text-base font-bold text-foreground">
                      {student.avgScore !== null ? student.avgScore.toFixed(1) : '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">TB điểm</p>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Clock className="size-4 text-muted-foreground" />
                    <p className="text-[11px] font-medium text-foreground text-center leading-tight">
                      {formatDate(student.lastActive)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Hoạt động</p>
                  </div>
                </div>

                {/* Score badge */}
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
