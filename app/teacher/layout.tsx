import { resolveTeacherContext } from '@/lib/dashboard/context'
import { TeacherShell } from '@/components/teacher/teacher-shell'

export default async function TeacherLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { shell } = await resolveTeacherContext()

  return <TeacherShell shell={shell}>{children}</TeacherShell>
}
