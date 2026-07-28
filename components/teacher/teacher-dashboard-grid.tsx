import { AssignAdaptiveCard } from '@/components/teacher/assign-adaptive-card'
import { AssignedQuizzesTable } from '@/components/teacher/assigned-quizzes-table'
import { AtRiskStudentsCard } from '@/components/teacher/at-risk-students-card'
import { ClassHealthCard } from '@/components/teacher/class-health-card'
import { ClassWeaknessCard } from '@/components/teacher/class-weakness-card'
import type { TeacherDashboardData } from '@/lib/teacher-types'

interface TeacherDashboardGridProps {
  data: TeacherDashboardData
}

export function TeacherDashboardGrid({ data }: TeacherDashboardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
      <AssignAdaptiveCard />
      <ClassHealthCard
        classAverage={data.classAverage}
        weeklyCompletionRate={data.weeklyCompletionRate}
      />
      <ClassWeaknessCard weaknesses={data.classWeaknesses} />
      <AtRiskStudentsCard students={data.atRiskStudents} />
      <AssignedQuizzesTable quizzes={data.assignedQuizzes} />
    </div>
  )
}
