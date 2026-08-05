import { redirect } from 'next/navigation'
import { resolveTeacherContext } from '@/lib/dashboard/context'
import { listAdaptiveAssignmentsAction } from '@/app/actions/test-group'
import { TeacherAdaptiveListClient } from '@/components/teacher/teacher-adaptive-list-client'

export default async function TeacherAdaptiveListPage() {
  const { classroom } = await resolveTeacherContext()
  const result = await listAdaptiveAssignmentsAction(classroom.id)
  const assignments = result.success && result.data ? result.data : []

  return (
    <TeacherAdaptiveListClient assignments={assignments} classId={classroom.id} />
  )
}
