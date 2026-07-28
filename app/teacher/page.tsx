import { TeacherDashboardGrid } from '@/components/teacher/teacher-dashboard-grid'
import { MOCK_TEACHER_DASHBOARD } from '@/lib/teacher-mock'

export default function TeacherOverviewPage() {
  return <TeacherDashboardGrid data={MOCK_TEACHER_DASHBOARD} />
}
