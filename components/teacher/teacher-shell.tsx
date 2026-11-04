import { ShellMain, ShellNavProvider } from '@/components/shell/shell-nav'
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
    <ShellNavProvider>
      <div className="flex min-h-dvh bg-background">
        <TeacherSidebar className={shell.className} classId={shell.classId} />

        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTeacherNav className={shell.className} classId={shell.classId} />
          <TeacherHeader
            className={shell.className}
            subject={shell.subject}
            studentCount={shell.studentCount}
            teacherInitials={shell.initials}
          />
          <ShellMain>{children}</ShellMain>
        </div>
      </div>
    </ShellNavProvider>
  )
}
