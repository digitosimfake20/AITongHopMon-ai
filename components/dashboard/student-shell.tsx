import { ShellMain, ShellNavProvider } from '@/components/shell/shell-nav'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar'
import { MobileDashboardNav } from '@/components/dashboard/mobile-dashboard-nav'
import { ActiveQuizBannerLazy } from '@/components/dashboard/active-quiz-banner-lazy'
import type { StudentShellContext } from '@/lib/dashboard/context'

interface StudentShellProps {
  shell: StudentShellContext
  children: React.ReactNode
}

/** Sync composition helper (stories/tests). Production student layout streams slots instead. */
export function StudentShell({ shell, children }: StudentShellProps) {
  return (
    <ShellNavProvider>
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
          <ActiveQuizBannerLazy />
          <DashboardHeader
            studentName={shell.studentName}
            initials={shell.initials}
            masteryScore={shell.masteryScore}
          />
          <ShellMain>{children}</ShellMain>
        </div>
      </div>
    </ShellNavProvider>
  )
}
