/**
 * Post-submission AI Pipeline
 * Runs after every quiz submission (fire-and-forget from submitQuizAction).
 * Updates:
 *  1. student_knowledge_states  — BKT mastery per topic (unique studentId + nodeId)
 *  2. student_cognitive_profiles — speed, careless rate, persona, strengths/weaknesses
 *  3. Submission.aiFeedbackSummary — structured action plan (+ thin LLM polish)
 *  4. GlobalAgentMemory keyInsights — curated insight (not raw log dump for UI)
 */
import prisma from '@/lib/prisma'
import {
  computeTopicMasteryUpdate,
  contributesToMasteryUpdate,
} from '@/lib/knowledge/mastery-evidence'
import {
  isStrengthMastery,
  MASTERY_STATUS_MASTERED,
  MASTERY_STATUS_PROGRESSING,
} from '@/lib/knowledge/mastery-labels'
import { ensureTopicsCanonicalized } from '@/lib/knowledge/topic-canonicalize-ai'
import { resolveTopicCanonicalSync } from '@/lib/knowledge/topic-canonicalize-ai'
import { normalizeTopicName, resolveTopicKey } from '@/lib/knowledge/topic-normalize'
import {
  buildStudentActionPlan,
  curatedInsightFromPlan,
  enrichActionPlanWithLLM,
  type TopicBatchForPlan,
} from '@/lib/ai/student-action-plan'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubmissionDetailForPipeline {
  questionId: string
  topic: string
  subject: string
  type: string
  isCorrect: boolean
  timeSpentSeconds: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Determine persona string from cognitive signals (exported for unit tests). */
export function computePersona(
  avgSpeed: number,
  carelessRate: number,
  avgMastery: number,
): string {
  if (avgMastery >= MASTERY_STATUS_MASTERED) return 'Thành thạo'
  if (carelessRate > 0.3 && avgSpeed < 20) return 'Nhanh nhạy nhưng ẩu'
  if (avgSpeed > 80) return 'Cẩn thận - Ngâm lâu'
  if (carelessRate < 0.1 && avgMastery >= MASTERY_STATUS_PROGRESSING) {
    return 'Chắc chắn, tốc độ tốt'
  }
  return 'Đang phát triển'
}

// ---------------------------------------------------------------------------
// Main pipeline function
// ---------------------------------------------------------------------------

export async function runPostSubmissionAIPipeline(
  studentId: string,
  details: SubmissionDetailForPipeline[],
  options?: {
    skipAiCanonicalization?: boolean
    /** When set, persist structured action plan onto this submission */
    submissionId?: string
    /** Skip LLM polish (practice quizzes / offline) */
    skipLlmEnrich?: boolean
    /** Persisted submission counts — keeps AI feedback aligned with result page */
    officialStats?: import('@/lib/knowledge/scored-submission-stats').SubmissionOfficialStats
  },
): Promise<void> {
  const t0 = Date.now()
  let topicCount = 0
  let llmEnrich = false

  try {
    const uniqueLabels = [...new Set(details.map((d) => normalizeTopicName(d.topic)))]
    const subject = details[0]?.subject || 'Toán'
    const canonicalMap = options?.skipAiCanonicalization
      ? new Map(uniqueLabels.map((label) => [label, resolveTopicCanonicalSync(label)]))
      : await ensureTopicsCanonicalized(uniqueLabels, subject)

    // ── 1. Group by AI-canonical topicKey ─────────────────────────────────────
    type TopicBatch = {
      topicName: string
      nodeId: string
      subject: string
      answers: Array<{ isCorrect: boolean; timeSpentSeconds: number }>
    }
    const byNodeId = new Map<string, TopicBatch>()

    for (const d of details) {
      // ESSAY: kept as isCorrect=false on SubmissionDetail for scoring UX, but
      // unscored — never feed into BKT / KnowledgeNode mastery.
      if (!contributesToMasteryUpdate(d.type)) continue

      const normalized = normalizeTopicName(d.topic)
      const canonical = canonicalMap.get(normalized) ?? (() => {
        const { topicName, topicKey } = resolveTopicKey(normalized)
        return { topicName, topicKey }
      })()
      const nodeId = canonical.topicKey
      if (!byNodeId.has(nodeId)) {
        byNodeId.set(nodeId, {
          topicName: canonical.topicName,
          nodeId,
          subject: d.subject || 'Toán',
          answers: [],
        })
      }
      byNodeId.get(nodeId)!.answers.push({
        isCorrect: d.isCorrect,
        timeSpentSeconds: d.timeSpentSeconds,
      })
    }

    const batches = [...byNodeId.values()]
    topicCount = batches.length

    // ── 2. Batch-read prior mastery (1 RTT) then upsert nodes + states ─────────
    // Skip per-topic findUnique: upsert create path uses default 0.2; update path
    // needs prior pMastery for correct BKT — load once via findMany.
    const nodeIds = batches.map((b) => b.nodeId)
    const existingStates =
      nodeIds.length > 0
        ? await prisma.studentKnowledgeState.findMany({
            where: { studentId, nodeId: { in: nodeIds } },
            select: { nodeId: true, pMastery: true },
          })
        : []
    const priorMastery = new Map(
      existingStates.map((s) => [s.nodeId, Number(s.pMastery)] as const),
    )

    if (batches.length > 0) {
      await Promise.all(
        batches.map((batch) =>
          prisma.knowledgeNode.upsert({
            where: { id: batch.nodeId },
            create: {
              id: batch.nodeId,
              subject: batch.subject,
              title: batch.topicName,
              difficultyLevel: 1,
            },
            update: {
              title: batch.topicName,
            },
          }),
        ),
      )
    }

    const planBatches: TopicBatchForPlan[] = []
    if (batches.length > 0) {
      const masteryRows = await Promise.all(
        batches.map(async (batch) => {
          const currentMastery = priorMastery.get(batch.nodeId) ?? 0.2
          const mastery = computeTopicMasteryUpdate(currentMastery, batch.answers)

          await prisma.studentKnowledgeState.upsert({
            where: { studentId_nodeId: { studentId, nodeId: batch.nodeId } },
            create: {
              studentId,
              nodeId: batch.nodeId,
              pMastery: mastery,
              lastPracticedAt: new Date(),
            },
            update: {
              pMastery: mastery,
              lastPracticedAt: new Date(),
            },
          })

          return {
            topicName: batch.topicName,
            topicKey: batch.nodeId,
            pMastery: mastery,
            answers: batch.answers,
          } satisfies TopicBatchForPlan
        }),
      )
      planBatches.push(...masteryRows)
    }

    // ── 3. Deterministic plan on hot path (LLM enrich deferred) ───────────────
    let plan = buildStudentActionPlan(planBatches, options?.officialStats)

    // ── 4. Cognitive signals + prefetch profile/memory (parallel reads) ───────
    const scoredDetails = details.filter((d) => contributesToMasteryUpdate(d.type))
    const timed = scoredDetails.filter((d) => d.timeSpentSeconds > 0)
    const avgSpeed =
      timed.length > 0 ? timed.reduce((a, d) => a + d.timeSpentSeconds, 0) / timed.length : 30

    const fastWrong = timed.filter((d) => !d.isCorrect && d.timeSpentSeconds < 15).length
    const carelessRate = timed.length > 0 ? fastWrong / timed.length : 0

    const [allStates, existingProfile, existingMem] = await Promise.all([
      prisma.studentKnowledgeState.findMany({
        where: { studentId },
        include: { node: { select: { title: true } } },
      }),
      prisma.studentCognitiveProfile.findUnique({ where: { studentId } }),
      prisma.globalAgentMemory.findUnique({ where: { studentId } }),
    ])

    const strengths = allStates
      .filter((s) => isStrengthMastery(Number(s.pMastery)))
      .sort((a, b) => Number(b.pMastery) - Number(a.pMastery))
      .slice(0, 5)
      .map((s) => s.node.title)

    const weaknesses = allStates
      .filter((s) => Number(s.pMastery) < MASTERY_STATUS_PROGRESSING)
      .sort((a, b) => Number(a.pMastery) - Number(b.pMastery))
      .slice(0, 5)
      .map((s) => s.node.title)

    const avgMastery =
      allStates.length > 0
        ? allStates.reduce((sum, s) => sum + Number(s.pMastery), 0) / allStates.length
        : 0.3

    const persona = computePersona(avgSpeed, carelessRate, avgMastery)

    const EMA = 0.3
    const blendedSpeed = existingProfile
      ? Number(existingProfile.avgSpeedPerQuestion) * (1 - EMA) + avgSpeed * EMA
      : avgSpeed
    const blendedCareless = existingProfile
      ? Number(existingProfile.carelessErrorRate) * (1 - EMA) + carelessRate * EMA
      : carelessRate

    const memorySnippet = `[${new Date().toLocaleDateString('vi-VN')}] Bài kiểm tra vừa nộp. Điểm yếu hiện tại: ${weaknesses.slice(0, 3).join(', ') || 'Chưa xác định'}. Persona: ${persona}.`
    const curated = curatedInsightFromPlan(plan)

    const keyInsights = {
      weaknesses,
      strengths,
      persona,
      curatedInsight: curated,
      nextPracticeTopics: plan.nextStep?.topicTitles ?? [],
      weakTopicKeys: plan.nextStep?.topicKeys ?? [],
      updatedAt: new Date().toISOString(),
    }

    // ── 5. Persist plan + profile + memory (LLM not required) ────────────────
    await Promise.all([
      options?.submissionId
        ? prisma.submission.update({
            where: { id: options.submissionId },
            data: { aiFeedbackSummary: JSON.stringify(plan) },
          })
        : Promise.resolve(),
      prisma.studentCognitiveProfile.upsert({
        where: { studentId },
        create: {
          studentId,
          personaType: persona,
          avgSpeedPerQuestion: blendedSpeed,
          carelessErrorRate: blendedCareless,
          strengthsSummary: strengths,
          weaknessesSummary: weaknesses,
        },
        update: {
          personaType: persona,
          avgSpeedPerQuestion: blendedSpeed,
          carelessErrorRate: blendedCareless,
          strengthsSummary: strengths,
          weaknessesSummary: weaknesses,
        },
      }),
      existingMem
        ? prisma.globalAgentMemory.update({
            where: { studentId },
            data: {
              longTermSummary: `${existingMem.longTermSummary}\n${memorySnippet}`.slice(-1500),
              keyInsights,
              totalProcessedMessages: existingMem.totalProcessedMessages + details.length,
            },
          })
        : prisma.globalAgentMemory.create({
            data: {
              studentId,
              longTermSummary: memorySnippet,
              keyInsights,
              totalProcessedMessages: details.length,
            },
          }),
    ])

    // ── 6. LLM polish after BKT / profile / deterministic feedback ───────────
    // Practice / offline already skip; keep that. Enrich is off the critical
    // after() budget for mastery + dashboard signals.
    if (!options?.skipLlmEnrich && !options?.skipAiCanonicalization) {
      llmEnrich = true
      plan = await enrichActionPlanWithLLM(plan)
      const curatedEnriched = curatedInsightFromPlan(plan)
      await Promise.all([
        options?.submissionId
          ? prisma.submission.update({
              where: { id: options.submissionId },
              data: { aiFeedbackSummary: JSON.stringify(plan) },
            })
          : Promise.resolve(),
        prisma.globalAgentMemory.update({
          where: { studentId },
          data: {
            keyInsights: {
              ...keyInsights,
              curatedInsight: curatedEnriched,
              nextPracticeTopics: plan.nextStep?.topicTitles ?? [],
              weakTopicKeys: plan.nextStep?.topicKeys ?? [],
              updatedAt: new Date().toISOString(),
            },
          },
        }),
      ])
    }
  } catch (err) {
    console.error('[AI Pipeline] Error:', err)
  } finally {
    console.info(
      `[AI Pipeline] done student=${studentId} topics=${topicCount} llm=${llmEnrich ? 1 : 0} ms=${Date.now() - t0}`,
    )
  }
}
