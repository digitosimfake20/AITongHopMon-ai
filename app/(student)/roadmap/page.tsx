import { resolveStudentContext } from '@/lib/dashboard/context'
import { KnowledgeRoadmap } from '@/components/student/knowledge-roadmap'
import prisma from '@/lib/prisma'

export default async function RoadmapPage() {
  const { user } = await resolveStudentContext()

  const knowledgeStates = await prisma.studentKnowledgeState.findMany({
    where: { studentId: user.id },
    include: { node: { select: { title: true, subject: true } } },
    orderBy: { pMastery: 'desc' },
  })

  const globalMemory = await prisma.globalAgentMemory.findUnique({
    where: { studentId: user.id },
    select: { longTermSummary: true, updatedAt: true },
  })

  const states = knowledgeStates.map((s) => ({
    nodeId: s.nodeId,
    pMastery: Number(s.pMastery),
    title: s.node.title,
    subject: s.node.subject,
    lastPracticedAt: s.lastPracticedAt,
  }))

  const overallMastery =
    states.length > 0
      ? Math.round((states.reduce((sum, s) => sum + s.pMastery, 0) / states.length) * 100)
      : 0

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <KnowledgeRoadmap
        states={states}
        overallMastery={overallMastery}
        zenoSummary={globalMemory?.longTermSummary}
        zenoUpdatedAt={globalMemory?.updatedAt}
      />
    </main>
  )
}
