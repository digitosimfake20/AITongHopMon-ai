import { resolveTeacherContext } from '@/lib/dashboard/context'
import { loadTeacherTestBankPageData } from '@/lib/test-bank/load-teacher-page'
import { TeacherTestBankClient } from '@/components/teacher/teacher-test-bank-client'

export default async function TeacherTestBankPage() {
  const { classroom } = await resolveTeacherContext()
  const { tests, groups, classes, adaptiveAssignments } =
    await loadTeacherTestBankPageData(classroom.teacherId, classroom.id)

  return (
    <TeacherTestBankClient
      tests={tests}
      groups={groups}
      adaptiveAssignments={adaptiveAssignments}
      classes={classes.map((c) => ({ id: c.id, name: c.name, code: c.code }))}
      defaultClassId={classroom.id}
    />
  )
}
