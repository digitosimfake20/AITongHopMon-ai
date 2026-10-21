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

/** Determine persona string from cognitive signals */
function computePersona(
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

    // ── 2. Upsert KnowledgeNodes + StudentKnowledgeStates ─────────────────────
    const planBatches: TopicBatchForPlan[] = []

    for (const batch of byNodeId.values()) {
      await prisma.knowledgeNode.upsert({
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
      })

      const existing = await prisma.studentKnowledgeState.findUnique({
        where: { studentId_nodeId: { studentId, nodeId: batch.nodeId } },
      })
      const currentMastery = existing ? Number(existing.pMastery) : 0.2

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

      planBatches.push({
        topicName: batch.topicName,
        topicKey: batch.nodeId,
        pMastery: mastery,
        answers: batch.answers,
      })
    }

    // ── 3. Action plan → Submission.aiFeedbackSummary ─────────────────────────
    let plan = buildStudentActionPlan(planBatches, options?.officialStats)
    if (!options?.skipLlmEnrich && !options?.skipAiCanonicalization) {
      plan = await enrichActionPlanWithLLM(plan)
    }

    if (options?.submissionId) {
      await prisma.submission.update({
        where: { id: options.submissionId },
        data: { aiFeedbackSummary: JSON.stringify(plan) },
      })
    }

    // ── 4. Cognitive signals (auto-scored items only — ESSAY is unscored) ─────
    const scoredDetails = details.filter((d) => contributesToMasteryUpdate(d.type))
    const allTimes = scoredDetails.map((d) => d.timeSpentSeconds)
    const avgSpeed =
      allTimes.length > 0 ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length : 30

    const fastWrong = scoredDetails.filter((d) => !d.isCorrect && d.timeSpentSeconds < 15).length
    const carelessRate = scoredDetails.length > 0 ? fastWrong / scoredDetails.length : 0

    const allStates = await prisma.studentKnowledgeState.findMany({
      where: { studentId },
      include: { node: { select: { title: true } } },
    })

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

    // ── 5. Upsert StudentCognitiveProfile ─────────────────────────────────────
    const existing = await prisma.studentCognitiveProfile.findUnique({
      where: { studentId },
    })
    const EMA = 0.3
    const blendedSpeed = existing
      ? Number(existing.avgSpeedPerQuestion) * (1 - EMA) + avgSpeed * EMA
      : avgSpeed
    const blendedCareless = existing
      ? Number(existing.carelessErrorRate) * (1 - EMA) + carelessRate * EMA
      : carelessRate

    await prisma.studentCognitiveProfile.upsert({
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
    })

    // ── 6. GlobalAgentMemory — keep log + curated keyInsights for UI ───────────
    const memorySnippet = `[${new Date().toLocaleDateString('vi-VN')}] Bài kiểm tra vừa nộp. Điểm yếu hiện tại: ${weaknesses.slice(0, 3).join(', ') || 'Chưa xác định'}. Persona: ${persona}.`
    const curated = curatedInsightFromPlan(plan)

    const existing_mem = await prisma.globalAgentMemory.findUnique({
      where: { studentId },
    })

    const keyInsights = {
      weaknesses,
      strengths,
      persona,
      curatedInsight: curated,
      nextPracticeTopics: plan.nextStep?.topicTitles ?? [],
      weakTopicKeys: plan.nextStep?.topicKeys ?? [],
      updatedAt: new Date().toISOString(),
    }

    if (existing_mem) {
      const combined = `${existing_mem.longTermSummary}\n${memorySnippet}`.slice(-1500)
      await prisma.globalAgentMemory.update({
        where: { studentId },
        data: {
          longTermSummary: combined,
          keyInsights,
          totalProcessedMessages: existing_mem.totalProcessedMessages + details.length,
        },
      })
    } else {
      await prisma.globalAgentMemory.create({
        data: {
          studentId,
          longTermSummary: memorySnippet,
          keyInsights,
          totalProcessedMessages: details.length,
        },
      })
    }
  } catch (err) {
    console.error('[AI Pipeline] Error:', err)
  }
}
