'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GraduationCap, LayoutGrid } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { TEACHER_NAV } from '@/lib/teacher-nav'
import { cn } from '@/lib/utils'

interface TeacherSidebarProps {
  className: string
}

export function TeacherSidebar({ className }: TeacherSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/40 lg:flex">
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">Mathz Teacher</p>
            <Badge variant="secondary" className="mt-1">
              {className}
            </Badge>
          </div>
        </div>
      </div>

      <nav aria-label="Teacher" className="flex-1 space-y-1 px-3 py-4">
        {TEACHER_NAV.map((item) => {
          const active =
            item.href === '/teacher'
              ? pathname === '/teacher'
              : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-4">
        <Link
          href="/onboarding"
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LayoutGrid className="size-4 shrink-0" aria-hidden="true" />
          Danh sách lớp
        </Link>
      </div>
    </aside>
  )
}
