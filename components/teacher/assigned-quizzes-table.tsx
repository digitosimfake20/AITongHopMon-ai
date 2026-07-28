import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AssignedQuiz } from '@/lib/teacher-types'

interface AssignedQuizzesTableProps {
  quizzes: AssignedQuiz[]
}

export function AssignedQuizzesTable({ quizzes }: AssignedQuizzesTableProps) {
  return (
    <article className="col-span-1 rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-28px_rgba(0,0,0,0.18)] lg:col-span-3">
      <div className="flex items-center gap-2">
        <ClipboardList className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-base font-semibold text-card-foreground">
          Bài test / Quiz đã giao
        </h2>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="pb-3 pr-4 font-medium">Tên bài</th>
              <th className="pb-3 pr-4 font-medium">Hạn nộp</th>
              <th className="pb-3 pr-4 font-medium">Đã nộp</th>
              <th className="pb-3 pr-4 font-medium">Điểm TB</th>
              <th className="pb-3 font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.map((quiz) => (
              <tr key={quiz.id} className="border-b border-border/60 last:border-0">
                <td className="py-4 pr-4 font-medium text-foreground">{quiz.title}</td>
                <td className="py-4 pr-4 text-muted-foreground">{quiz.deadline}</td>
                <td className="py-4 pr-4 font-mono tabular-nums text-foreground">
                  {quiz.submitted}/{quiz.total}
                </td>
                <td className="py-4 pr-4 font-mono tabular-nums text-foreground">
                  {quiz.averageScore.toFixed(1)}/10
                </td>
                <td className="py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-9"
                    nativeButton={false}
                    render={<Link href={`/teacher/gaps?quiz=${quiz.id}`} />}
                  >
                    Xem báo cáo chi tiết
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}
