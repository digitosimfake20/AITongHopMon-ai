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
        {assignments.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
            Chưa có bài kiểm tra nào được giao trong lớp này.
          </li>
        ) : (
          assignments.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{item.title}</p>
                  {item.kind === 'adaptive' ? (
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                      Phân hóa 2 lượt
                    </Badge>
                  ) : null}
                </div>
                {item.subtitle ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.subtitle}</p>
                ) : null}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {item.deadline ? <span>⏱ {item.deadline}</span> : null}
                  {item.statusHint ? <span>· {item.statusHint}</span> : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.status === 'pending' ? (
                  <>
                    <Badge variant="destructive">
                      {item.statusHint === 'Đang tiến hành' ? 'Đang làm dở' : 'Chưa làm'}
                    </Badge>
                    <Button
                      className="min-h-11"
                      nativeButton={false}
                      render={<Link href={`/quiz/take/${item.id}`} />}
                    >
                      {item.kind === 'adaptive' ? 'Tiếp tục phân hóa' : 'Bắt đầu làm bài'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                      {item.kind === 'adaptive' ? `Hoàn thành — ${item.score ?? ''}` : `Đã nộp — ${item.score}`}
                    </Badge>
                    {item.submissionId ? (
                      <Button
                        className="min-h-11"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={`/quiz/result/${item.submissionId}`} />}
                      >
                        Xem kết quả & AI Phân tích
                      </Button>
                    ) : (
                      <Button
                        className="min-h-11"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href="/quizzes" />}
                      >
                        Xem tất cả
                      </Button>
                    )}
                  </>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </article>
  )
}
