import { DashboardGrid } from '@/components/dashboard/dashboard-grid'
import { resolveStudentContext } from '@/lib/dashboard/context'
import { getStudentDashboardData } from '@/lib/dashboard/student-data'

export default async function DashboardPage() {
  const { user, classroom, shell } = await resolveStudentContext()
  const data = await getStudentDashboardData(
    user.id,
    classroom.id,
    user.fullName,
    shell.classLabel,
  )

  // streakDays/masteryScore come from shared getStudentShellStats cache (same as layout chrome)
  return (
    <DashboardGrid
      data={data}
      streakDays={data.streakDays}
      fullStudentName={user.fullName}
    />
  )
}
