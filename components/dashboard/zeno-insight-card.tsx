import { Lightbulb } from 'lucide-react'

interface ZenoInsightCardProps {
  insight: string
  updatedAt: string
}

export function ZenoInsightCard({ insight, updatedAt }: ZenoInsightCardProps) {
  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-28px_rgba(0,0,0,0.18)]">
      <div className="flex items-center gap-2">
        <Lightbulb className="size-4 text-primary" aria-hidden="true" />
        <h2 className="text-base font-semibold text-card-foreground">
          Lời khuyên Zeno AI
        </h2>
      </div>
      <div className="mt-4 flex-1 rounded-xl border border-primary/25 bg-accent/60 p-4">
        <blockquote className="text-sm leading-relaxed text-card-foreground sm:text-base">
          &ldquo;{insight}&rdquo;
        </blockquote>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{updatedAt}</p>
    </article>
  )
}
