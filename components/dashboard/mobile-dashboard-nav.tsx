'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Menu, X } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { useEffect, useId, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { StreakWidget } from '@/components/dashboard/streak-widget'
import { ShellNavLink } from '@/components/shell/shell-nav'
import { DASHBOARD_NAV } from '@/lib/dashboard-nav'

interface MobileDashboardNavProps {
  classLabel: string
  streakDays: number
}

export function MobileDashboardNav({
  classLabel,
  streakDays,
}: MobileDashboardNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const menuId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="border-b border-border bg-card/40 lg:hidden">
      <div className="flex min-h-14 items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <Logo showWordmark={false} href="/dashboard" size={32} />
          <span className="font-semibold text-foreground">Lớp học đảo ngược</span>
          <Badge variant="secondary">{classLabel}</Badge>
        </div>
        <button
          ref={toggleRef}
          type="button"
          aria-label={open ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
        >
          {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
        </button>
      </div>

      {open ? (
        <div id={menuId} className="space-y-3 border-t border-border px-3 py-3">
          <nav aria-label="Điều hướng học sinh" className="space-y-1">
            {DASHBOARD_NAV.map((item) => {
              const active =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href)
              const Icon = item.icon

              return (
                <ShellNavLink
                  key={item.id}
                  href={item.href}
                  active={active}
                  onNavigate={() => setOpen(false)}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                >
                  <Icon className="size-4" aria-hidden />
                  {item.label}
                </ShellNavLink>
              )
            })}
          </nav>
          <Link
            href="/onboarding"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LayoutGrid className="size-4" aria-hidden />
            Danh sách lớp
          </Link>
          <StreakWidget days={streakDays} />
        </div>
      ) : null}
    </div>
  )
}
