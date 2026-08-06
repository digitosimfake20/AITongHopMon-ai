import { AdaptivityHeroCard } from '@/components/dashboard/adaptivity-hero-card'
import { AssignmentsCard } from '@/components/dashboard/assignments-card'
import { MasteryProgressCard } from '@/components/dashboard/mastery-progress-card'
import { WeaknessRadarCard } from '@/components/dashboard/weakness-radar-card'
import { AiProfileCard } from '@/components/student/ai-profile-card'
import { ZenoProactivePanel } from '@/components/student/zeno-proactive-panel'
import type { StudentDashboardData } from '@/lib/dashboard-types'

interface DashboardGridProps {
  data: StudentDashboardData
  streakDays: number
  fullStudentName: string
}

export function DashboardGrid({ data, streakDays, fullStudentName }: DashboardGridProps) {
  const primaryWeakTopic =
    data.cognitiveProfile?.weaknesses[0] ?? data.weakTopics[0]?.label ?? null

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
      <ZenoProactivePanel
        studentName={fullStudentName}
        streakDays={streakDays}
        weakTopic={primaryWeakTopic}
      />
      <AdaptivityHeroCard
        title={data.adaptiveTitle}
        description={data.adaptiveDescription}
      />
      <MasteryProgressCard
        percent={data.masteryPercent}
        completedQuizzes={data.completedQuizzes}
        studyHours={data.studyHours}
      />
      <WeaknessRadarCard topics={data.weakTopics} />
      <AssignmentsCard assignments={data.assignments} />
      <AiProfileCard profile={data.cognitiveProfile} />
    </div>
  )
}
