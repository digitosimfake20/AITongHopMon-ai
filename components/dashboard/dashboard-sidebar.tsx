import Link from 'next/link'
import { LayoutGrid } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { Badge } from '@/components/ui/badge'
import { StreakWidget } from '@/components/dashboard/streak-widget'
import { DashboardNavLinks } from '@/components/dashboard/dashboard-nav-links'

interface DashboardSidebarProps {
  classLabel: string
  streakDays: number
}

export function DashboardSidebar({
  classLabel,
  streakDays,
}: DashboardSidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/40 lg:flex">
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-center gap-3">
          <Logo showWordmark={false} href="/dashboard" size={40} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">Lớp học đảo ngược</p>
            <Badge variant="secondary" className="mt-1">
              {classLabel}
            </Badge>
          </div>
        </div>
      </div>

      <nav aria-label="Điều hướng học sinh" className="flex-1 space-y-1 px-3 py-4">
        <DashboardNavLinks />
      </nav>

      <div className="space-y-3 border-t border-border p-4">
        <Link
          href="/onboarding"
          prefetch={false}
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LayoutGrid className="size-4 shrink-0" aria-hidden="true" />
          Danh sách lớp
        </Link>
        <StreakWidget days={streakDays} />
      </div>
    </aside>
  )
}
