import Link from 'next/link'
import { ArrowRight, Sparkles, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AssignAdaptiveCard() {
  return (
    <article className="col-span-1 flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-28px_rgba(0,0,0,0.18)] transition-all duration-300 hover:border-accent/30 lg:col-span-2">
      <div>
        <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
          Giao bài tập Thích ứng
        </p>
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-card-foreground sm:text-2xl">
          Giao bài AI tự điều chỉnh độ khó cho cả lớp
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Một cú nhấp để giao bài tập thích ứng theo năng lực từng học sinh, hoặc tạo
          bài kiểm tra 15 phút nhanh cho lớp 8A2.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          className="min-h-11 flex-1"
          nativeButton={false}
          render={<Link href="/teacher/assignments?mode=adaptive" />}
        >
          Giao bài thích ứng
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          className="min-h-11 flex-1"
          nativeButton={false}
          render={<Link href="/teacher/assignments?mode=quick-test" />}
        >
          <Timer className="size-4" aria-hidden="true" />
          Tạo bài test 15 phút
        </Button>
      </div>
    </article>
  )
}
