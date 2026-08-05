'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GraduationCap, LayoutGrid, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { TEACHER_NAV } from '@/lib/teacher-nav'
import { withClassParam } from '@/lib/class/with-class-param'
import { cn } from '@/lib/utils'

interface MobileTeacherNavProps {
  className: string
  classId: string
}

export function MobileTeacherNav({ className, classId }: MobileTeacherNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="border-b border-border bg-card/40 lg:hidden">
      <div className="flex min-h-14 items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="size-4" aria-hidden="true" />
          </div>
          <span className="font-semibold text-foreground">Mathz Teacher</span>
          <Badge variant="secondary">{className}</Badge>
        </div>
        <button
          type="button"
          aria-label={open ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open ? (
        <nav
          aria-label="Teacher mobile"
          className="space-y-1 border-t border-border px-3 py-3"
        >
          {TEACHER_NAV.map((item) => {
            const active =
              item.href === '/teacher'
                ? pathname === '/teacher'
                : pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.id}
                href={withClassParam(item.href, classId)}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-secondary',
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
          <Link
            href="/onboarding"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary"
          >
            <LayoutGrid className="size-4" />
            Danh sách lớp
          </Link>
        </nav>
      ) : null}
    </div>
  )
}
