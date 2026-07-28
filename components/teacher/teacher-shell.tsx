import { TeacherHeader } from '@/components/teacher/teacher-header'
import { MobileTeacherNav } from '@/components/teacher/mobile-teacher-nav'
import { TeacherSidebar } from '@/components/teacher/teacher-sidebar'
import { MOCK_TEACHER_DASHBOARD } from '@/lib/teacher-mock'

interface TeacherShellProps {
  children: React.ReactNode
}

export function TeacherShell({ children }: TeacherShellProps) {
  const data = MOCK_TEACHER_DASHBOARD

  return (
    <div className="flex min-h-dvh bg-background">
      <TeacherSidebar className={data.className} />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTeacherNav className={data.className} />
        <TeacherHeader
          className={data.className}
          subject={data.subject}
          studentCount={data.studentCount}
          teacherInitials={data.initials}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
