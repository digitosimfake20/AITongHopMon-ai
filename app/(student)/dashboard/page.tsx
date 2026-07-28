import { DashboardGrid } from '@/components/dashboard/dashboard-grid'
import { MOCK_STUDENT_DASHBOARD } from '@/lib/dashboard-mock'

export default function DashboardPage() {
  return <DashboardGrid data={MOCK_STUDENT_DASHBOARD} />
}
