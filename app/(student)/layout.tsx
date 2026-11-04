import { Suspense } from 'react'
import { resolveStudentContext } from '@/lib/dashboard/context'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar'
import { MobileDashboardNav } from '@/components/dashboard/mobile-dashboard-nav'
import { ActiveQuizBannerLazy } from '@/components/dashboard/active-quiz-banner-lazy'
import { ZenoChatLazy } from '@/components/chat/zeno-chat-lazy'

function SidebarFallback() {
  return (
    <aside
      className="hidden w-64 shrink-0 border-r border-border bg-card/40 lg:block"
      aria-hidden
    />
  )
}

function MobileNavFallback() {
  return <div className="min-h-14 border-b border-border bg-card/40 lg:hidden" aria-hidden />
}

function HeaderFallback() {
  return (
    <header className="border-b border-border bg-background/85 px-4 py-5 sm:px-6 lg:px-8">
      <div className="h-8 w-56 max-w-full animate-pulse rounded-md bg-muted" />
      <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded-md bg-muted" />
    </header>
  )
}

async function StudentSidebarSlot() {
  const { shell } = await resolveStudentContext()
  return (
    <DashboardSidebar classLabel={shell.classLabel} streakDays={shell.streakDays} />
  )
}

async function StudentMobileNavSlot() {
  const { shell } = await resolveStudentContext()
  return (
    <MobileDashboardNav classLabel={shell.classLabel} streakDays={shell.streakDays} />
  )
}

async function StudentHeaderSlot() {
  const { shell } = await resolveStudentContext()
  return (
    <DashboardHeader
      studentName={shell.studentName}
      initials={shell.initials}
      masteryScore={shell.masteryScore}
    />
  )
}

/**
 * Lean streaming shell: chrome slots Suspense independently so page `children`
 * are not gated behind a single layout await. Zeno + active-quiz islands stay deferred.
 */
export default function StudentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <div className="flex min-h-dvh bg-background">
        <Suspense fallback={<SidebarFallback />}>
          <StudentSidebarSlot />
        </Suspense>

        <div className="flex min-w-0 flex-1 flex-col">
          <Suspense fallback={<MobileNavFallback />}>
            <StudentMobileNavSlot />
          </Suspense>
          <ActiveQuizBannerLazy />
          <Suspense fallback={<HeaderFallback />}>
            <StudentHeaderSlot />
          </Suspense>
          <main
            id="main-content"
            className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8"
          >
            {children}
          </main>
        </div>
      </div>
      <ZenoChatLazy />
    </>
  )
}
