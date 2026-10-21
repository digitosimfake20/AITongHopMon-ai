'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { Badge } from '@/components/ui/badge'
import { TEACHER_NAV } from '@/lib/teacher-nav'
import type { TeacherNavItem } from '@/lib/teacher-types'
import { withClassParam } from '@/lib/class/with-class-param'
import { cn } from '@/lib/utils'

function teacherNavHref(item: TeacherNavItem, classId: string): string {
  return withClassParam(item.href, classId)
}

function isTeacherNavActive(item: TeacherNavItem, pathname: string): boolean {
  if (item.id === 'gaps') return pathname.includes('/gaps')
  if (item.href === '/teacher') return pathname === '/teacher'
  return pathname.startsWith(item.href)
}

interface TeacherSidebarProps {
  className: string
  classId: string
}

export function TeacherSidebar({ className, classId }: TeacherSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/40 lg:flex">
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-center gap-3">
          <Logo showWordmark={false} href="/teacher" size={40} />
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
          const active = isTeacherNavActive(item, pathname)
          const Icon = item.icon

          return (
            <Link
              key={item.id}
              href={teacherNavHref(item, classId)}
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
