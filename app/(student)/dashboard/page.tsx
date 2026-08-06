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

  return (
    <DashboardGrid
      data={data}
      streakDays={shell.streakDays}
      fullStudentName={user.fullName}
    />
  )
}
