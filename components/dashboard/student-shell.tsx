import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar'
import { MobileDashboardNav } from '@/components/dashboard/mobile-dashboard-nav'
import type { StudentShellContext } from '@/lib/dashboard/context'

interface StudentShellProps {
  shell: StudentShellContext
  children: React.ReactNode
}

export function StudentShell({ shell, children }: StudentShellProps) {
  return (
    <div className="flex min-h-dvh bg-background">
      <DashboardSidebar
        classLabel={shell.classLabel}
        streakDays={shell.streakDays}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileDashboardNav
          classLabel={shell.classLabel}
          streakDays={shell.streakDays}
        />
        <DashboardHeader
          studentName={shell.studentName}
          initials={shell.initials}
          masteryScore={shell.masteryScore}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
