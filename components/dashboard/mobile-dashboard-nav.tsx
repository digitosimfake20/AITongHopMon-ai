'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Menu, X } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { StreakWidget } from '@/components/dashboard/streak-widget'
import { DASHBOARD_NAV } from '@/lib/dashboard-nav'
import { cn } from '@/lib/utils'

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

  return (
    <div className="border-b border-border bg-card/40 lg:hidden">
      <div className="flex min-h-14 items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <Logo showWordmark={false} href="/dashboard" size={32} />
          <span className="font-semibold text-foreground">Edtech Platform</span>
          <Badge variant="secondary">{classLabel}</Badge>
        </div>
        <button
          type="button"
          aria-label={open ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open ? (
        <div className="space-y-3 border-t border-border px-3 py-3">
          <nav aria-label="Dashboard mobile" className="space-y-1">
            {DASHBOARD_NAV.map((item) => {
              const active =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href)
              const Icon = item.icon

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <Link
            href="/onboarding"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LayoutGrid className="size-4" />
            Danh sách lớp
          </Link>
          <StreakWidget days={streakDays} />
        </div>
      ) : null}
    </div>
  )
}
