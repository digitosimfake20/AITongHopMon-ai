import { AdaptivityHeroCard } from '@/components/dashboard/adaptivity-hero-card'
import { AssignmentsCard } from '@/components/dashboard/assignments-card'
import { MasteryProgressCard } from '@/components/dashboard/mastery-progress-card'
import { WeaknessRadarCard } from '@/components/dashboard/weakness-radar-card'
import { ZenoInsightCard } from '@/components/dashboard/zeno-insight-card'
import type { StudentDashboardData } from '@/lib/dashboard-types'

interface DashboardGridProps {
  data: StudentDashboardData
}

export function DashboardGrid({ data }: DashboardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
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
      <ZenoInsightCard
        insight={data.zenoInsight}
        updatedAt={data.zenoUpdatedAt}
      />
      <AssignmentsCard assignments={data.assignments} />
    </div>
  )
}
