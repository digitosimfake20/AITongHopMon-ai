import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar'
import { MobileDashboardNav } from '@/components/dashboard/mobile-dashboard-nav'
import { MOCK_STUDENT_DASHBOARD } from '@/lib/dashboard-mock'

interface StudentShellProps {
  children: React.ReactNode
}

export function StudentShell({ children }: StudentShellProps) {
  const data = MOCK_STUDENT_DASHBOARD

  return (
    <div className="flex min-h-dvh bg-background">
      <DashboardSidebar
        classLabel={data.classLabel}
        streakDays={data.streakDays}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileDashboardNav
          classLabel={data.classLabel}
          streakDays={data.streakDays}
        />
        <DashboardHeader
          studentName={data.studentName}
          initials={data.initials}
          masteryScore={data.masteryScore}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
