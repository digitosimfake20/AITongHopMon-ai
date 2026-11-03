import { resolveStudentContext } from '@/lib/dashboard/context'
import { StudentShell } from '@/components/dashboard/student-shell'
import { ZenoChatLazy } from '@/components/chat/zeno-chat-lazy'

export default async function StudentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { shell } = await resolveStudentContext()

  return (
    <>
      <StudentShell shell={shell}>{children}</StudentShell>
      <ZenoChatLazy />
    </>
  )
}
