import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface AdaptivityHeroCardProps {
  title: string
  description: string
}

export function AdaptivityHeroCard({ title, description }: AdaptivityHeroCardProps) {
  return (
    <article className="col-span-1 flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-28px_rgba(0,0,0,0.18)] transition-all duration-300 hover:border-accent/30 lg:col-span-2">
      <div>
        <Badge variant="outline" className="gap-1.5">
          <Sparkles className="size-3 text-primary" aria-hidden="true" />
          Bài tập thích ứng dành chuyên cho bạn
        </Badge>
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-card-foreground sm:text-2xl">
          {title}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
      <Button
        className="mt-6 h-11 w-full px-5 text-[15px] sm:w-auto"
        nativeButton={false}
        render={<Link href="/adaptive" />}
      >
        Vào học ngay
        <ArrowRight className="size-4" aria-hidden="true" />
      </Button>
    </article>
  )
}
