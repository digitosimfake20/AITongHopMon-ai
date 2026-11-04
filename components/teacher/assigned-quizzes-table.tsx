import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AssignedQuiz } from '@/lib/teacher-types'

interface AssignedQuizzesTableProps {
  quizzes: AssignedQuiz[]
}

export function AssignedQuizzesTable({ quizzes }: AssignedQuizzesTableProps) {
  return (
    <article className="col-span-1 rounded-xl border border-border bg-card p-6 lg:col-span-3">
      <div className="flex items-center gap-2">
        <ClipboardList className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-base font-semibold text-card-foreground">
          Bài đã giao
        </h2>
      </div>

      {quizzes.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border p-8 text-center">
          <ClipboardList className="mx-auto size-8 text-muted-foreground/40" aria-hidden />
          <p className="mt-3 text-sm text-muted-foreground">
            Chưa giao bài nào. Tạo đề hoặc giao từ ngân hàng đề.
          </p>
          <Button
            className="mt-4 min-h-11"
            nativeButton={false}
            render={<Link href="/teacher/assignments" prefetch={false} />}
          >
            Giao bài
          </Button>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Danh sách bài đã giao và tiến độ nộp</caption>
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Tên bài</th>
                <th className="pb-3 pr-4 font-medium">Thời lượng</th>
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
                      className="min-h-11"
                      nativeButton={false}
                      render={<Link href={`/teacher/gaps?quiz=${quiz.id}`} prefetch={false} />}
                    >
                      Xem báo cáo
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  )
}
