import { redirect } from 'next/navigation'
import { resolveTeacherContext } from '@/lib/dashboard/context'
import { getAdaptiveSummaryAction } from '@/app/actions/test-group'
import { AdaptiveSummaryClient } from '@/components/teacher/adaptive-summary-client'

interface PageProps {
  params: Promise<{ classTestId: string }>
}

export default async function TeacherAdaptiveDetailPage({ params }: PageProps) {
  const { classTestId } = await params
  const { classroom } = await resolveTeacherContext()

  const result = await getAdaptiveSummaryAction(classTestId)
  if (!result.success || !result.data) {
    redirect('/teacher/adaptive')
  }

  if (result.data.assignment.classId !== classroom.id) {
    redirect('/teacher/adaptive')
  }

  return (
    <AdaptiveSummaryClient
      assignment={result.data.assignment}
      students={result.data.students}
      classId={classroom.id}
    />
  )
}
