'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogOut, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { leaveClassAction } from '@/lib/class/actions'
import type { ClassSummary } from '@/lib/class/actions'

interface ClassCardProps {
  classroom: ClassSummary
  href: string
  canLeave?: boolean
}

export function ClassCard({ classroom, href, canLeave = false }: ClassCardProps) {
  const router = useRouter()
  const [isLeaving, setIsLeaving] = useState(false)

  async function handleLeave() {
    if (!window.confirm(`Rời khỏi lớp "${classroom.name}"?`)) return

    setIsLeaving(true)
    const result = await leaveClassAction(classroom.id)
    if (result.success) {
      toast.success('Đã rời lớp')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Không thể rời lớp')
    }
    setIsLeaving(false)
  }

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
      <div className={canLeave ? 'mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2' : 'mt-4'}>
        <Button className="min-h-11 w-full" nativeButton={false} render={<Link href={href} />}>
          Vào lớp học
        </Button>
        {canLeave ? (
          <Button
            type="button"
            variant="outline"
            disabled={isLeaving}
            onClick={handleLeave}
            className="min-h-11 w-full"
          >
            <LogOut className="size-4" aria-hidden="true" />
            {isLeaving ? 'Đang rời...' : 'Rời lớp'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
