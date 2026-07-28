import { TeacherDashboardGrid } from '@/components/teacher/teacher-dashboard-grid'
import { resolveTeacherContext } from '@/lib/dashboard/context'
import { getTeacherDashboardData } from '@/lib/dashboard/teacher-data'

export default async function TeacherOverviewPage() {
  const { user, classroom, shell } = await resolveTeacherContext()
  const data = await getTeacherDashboardData(
    user.id,
    classroom.id,
    user.fullName,
    shell.className,
    shell.studentCount,
  )

  return <TeacherDashboardGrid data={data} />
}
