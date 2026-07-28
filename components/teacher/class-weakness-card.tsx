import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ClassWeakness } from '@/lib/teacher-types'

interface ClassWeaknessCardProps {
  weaknesses: ClassWeakness[]
}

export function ClassWeaknessCard({ weaknesses }: ClassWeaknessCardProps) {
  return (
    <article className="col-span-1 rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-28px_rgba(0,0,0,0.18)] lg:col-span-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />
        <h2 className="text-base font-semibold text-card-foreground">
          Bản đồ Lỗ hổng Kiến thức Cả lớp
        </h2>
      </div>

      <ul className="mt-5 space-y-4">
        {weaknesses.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-border bg-background p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <span className="font-mono text-sm tabular-nums text-destructive">
                    {item.wrongPercent}% lớp sai
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.sampleNote}</p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-destructive"
                    style={{ width: `${item.wrongPercent}%` }}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                className="min-h-11 shrink-0"
                nativeButton={false}
                render={
                  <Link href={`/teacher/assignments?patch=${item.id}`} />
                }
              >
                Giao bài vá lỗi
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </article>
  )
}
