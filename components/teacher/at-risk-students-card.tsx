import Link from 'next/link'
import { UserRound } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { AtRiskStudent } from '@/lib/teacher-types'

interface AtRiskStudentsCardProps {
  students: AtRiskStudent[]
}

export function AtRiskStudentsCard({ students }: AtRiskStudentsCardProps) {
  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-28px_rgba(0,0,0,0.18)]">
      <div className="flex items-center gap-2">
        <UserRound className="size-4 text-destructive" aria-hidden="true" />
        <h2 className="text-base font-semibold text-card-foreground">
          Học sinh Cần chú ý
        </h2>
      </div>

      <ul className="mt-5 space-y-3">
        {students.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Chưa có học sinh cần chú ý. Dữ liệu cập nhật khi có bài nộp.
          </li>
        ) : (
          students.map((student) => (
            <li
              key={student.id}
              className="rounded-xl border border-border bg-background p-3"
            >
              <div className="flex items-start gap-3">
                <Avatar size="sm">
                  <AvatarFallback className="bg-secondary text-xs font-semibold">
                    {student.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{student.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {student.reason}
                  </p>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      <Button
        variant="outline"
        className="mt-4 min-h-11 w-full"
        nativeButton={false}
        render={<Link href="/teacher/students?filter=at-risk" />}
      >
        Xem danh sách đầy đủ
      </Button>
    </article>
  )
}
