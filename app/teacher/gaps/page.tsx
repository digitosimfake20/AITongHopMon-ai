import { redirect } from 'next/navigation'
import { resolveTeacherContext } from '@/lib/dashboard/context'
import { withClassParam } from '@/lib/class/with-class-param'

export default async function TeacherGapsRedirectPage() {
  const { shell } = await resolveTeacherContext()
  redirect(withClassParam(`/teacher/classes/${shell.classId}/gaps`, shell.classId))
}
