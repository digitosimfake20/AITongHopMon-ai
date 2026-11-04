'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

interface TeacherNavLinksProps {
  classId: string
}

/** Active-state nav only — keeps the teacher sidebar chrome as an RSC. */
export function TeacherNavLinks({ classId }: TeacherNavLinksProps) {
  const pathname = usePathname()

  return (
    <>
      {TEACHER_NAV.map((item) => {
        const active = isTeacherNavActive(item, pathname)
        const Icon = item.icon

        return (
          <Link
            key={item.id}
            href={teacherNavHref(item, classId)}
            aria-current={active ? 'page' : undefined}
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
    </>
  )
}
