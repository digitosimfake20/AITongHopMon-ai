import { TeacherHeader } from '@/components/teacher/teacher-header'
import { MobileTeacherNav } from '@/components/teacher/mobile-teacher-nav'
import { TeacherSidebar } from '@/components/teacher/teacher-sidebar'
import type { TeacherShellContext } from '@/lib/dashboard/context'

interface TeacherShellProps {
  shell: TeacherShellContext
  children: React.ReactNode
}

export function TeacherShell({ shell, children }: TeacherShellProps) {
  return (
    <div className="flex min-h-dvh bg-background">
      <TeacherSidebar className={shell.className} />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTeacherNav className={shell.className} />
        <TeacherHeader
          className={shell.className}
          subject={shell.subject}
          studentCount={shell.studentCount}
          teacherInitials={shell.initials}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
