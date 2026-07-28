import { ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Assignment } from '@/lib/dashboard-types'

interface AssignmentsCardProps {
  assignments: Assignment[]
}

export function AssignmentsCard({ assignments }: AssignmentsCardProps) {
  return (
    <article className="col-span-1 rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-28px_rgba(0,0,0,0.18)] lg:col-span-3">
      <div className="flex items-center gap-2">
        <ClipboardList className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-base font-semibold text-card-foreground">
          Bài kiểm tra từ Thầy/Cô
        </h2>
      </div>

      <ul className="mt-5 space-y-3">
        {assignments.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground">{item.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {item.deadline ? <span>Hạn: {item.deadline}</span> : null}
                {item.status === 'completed' && item.score ? (
                  <span>Điểm: {item.score}</span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant={item.status === 'pending' ? 'destructive' : 'secondary'}
              >
                {item.status === 'pending' ? 'Chưa làm' : 'Đã hoàn thành'}
              </Badge>
              {item.status === 'pending' ? (
                <Button
                  className="min-h-11"
                  nativeButton={false}
                  render={<Link href="/quizzes" />}
                >
                  Làm bài ngay
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </article>
  )
}
