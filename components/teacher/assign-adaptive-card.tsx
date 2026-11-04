import Link from 'next/link'
import { ArrowRight, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AssignAdaptiveCard() {
  return (
    <article className="col-span-1 flex flex-col justify-between rounded-xl border border-border bg-card p-6 transition-colors duration-200 hover:border-foreground/25 lg:col-span-2">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-card-foreground sm:text-2xl">
          Giao bài phân hóa theo năng lực
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Giao cụm đề 2 lượt (Lượt 1 Trung bình → Lượt 2 Dễ/Khó) cho cả lớp, hoặc tạo bài kiểm tra 15 phút.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          className="min-h-11 flex-1"
          nativeButton={false}
          render={<Link href="/teacher/assignments?mode=adaptive" prefetch={false} />}
        >
          Giao bài phân hóa
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          className="min-h-11 flex-1"
          nativeButton={false}
          render={<Link href="/teacher/assignments?mode=quick-test" prefetch={false} />}
        >
          <Timer className="size-4" aria-hidden="true" />
          Tạo bài 15 phút
        </Button>
      </div>
    </article>
  )
}
