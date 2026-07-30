import { resolveStudentContext } from '@/lib/dashboard/context'
import { StudentShell } from '@/components/dashboard/student-shell'
import { ZenoChatModal } from '@/components/chat/zeno-chat-modal'

export default async function StudentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { shell } = await resolveStudentContext()

  return (
    <>
      <StudentShell shell={shell}>{children}</StudentShell>
      <ZenoChatModal />
    </>
  )
}
