import { Suspense } from 'react'
import { DashboardGrid } from '@/components/dashboard/dashboard-grid'
import { resolveStudentContext } from '@/lib/dashboard/context'
import { getStudentDashboardData } from '@/lib/dashboard/student-data'

function DashboardGridFallback() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5" aria-busy>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="min-h-40 animate-pulse rounded-2xl border border-border bg-card/60"
        />
      ))}
    </div>
  )
}

async function DashboardPageContent() {
  const { user, classroom, shell } = await resolveStudentContext()
  const data = await getStudentDashboardData(
    user.id,
    classroom.id,
    user.fullName,
    shell.classLabel,
  )

  return (
    <DashboardGrid
      data={data}
      streakDays={data.streakDays}
      fullStudentName={user.fullName}
    />
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardGridFallback />}>
      <DashboardPageContent />
    </Suspense>
  )
}
