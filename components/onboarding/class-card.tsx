'use client'

import Link from 'next/link'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ClassSummary } from '@/lib/class/actions'

interface ClassCardProps {
  classroom: ClassSummary
  href: string
}

export function ClassCard({ classroom, href }: ClassCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">{classroom.name}</h3>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{classroom.code}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
          <Users className="size-3" />
          {classroom.memberCount}/{classroom.maxCapacity}
        </span>
      </div>
      <Button className="mt-4 min-h-11 w-full" nativeButton={false} render={<Link href={href} />}>
        Vào lớp học
      </Button>
    </div>
  )
}
