import { StudentShell } from '@/components/dashboard/student-shell'

export default function StudentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <StudentShell>{children}</StudentShell>
}
