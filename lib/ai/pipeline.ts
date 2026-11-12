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
import { contributesToMasteryUpdate } from '@/lib/knowledge/mastery-evidence'
import { persistStudentMasteryBatches } from '@/lib/knowledge/persist-student-mastery'
import {
  isStrengthMastery,
  MASTERY_STATUS_MASTERED,
  MASTERY_STATUS_PROGRESSING,
} from '@/lib/knowledge/mastery-labels'
import { ensureTopicsCanonicalized } from '@/lib/knowledge/topic-canonicalize-ai'
import { resolveTopicCanonicalSync } from '@/lib/knowledge/topic-canonicalize-ai'
import {
  DEFAULT_SUBJECT,
  normalizeTopicName,
  resolveTopicKey,
} from '@/lib/knowledge/topic-normalize'
import {
  buildStudentActionPlan,
  curatedInsightFromPlan,
  enrichActionPlanWithLLM,
  type TopicBatchForPlan,
} from '@/lib/ai/student-action-plan'
import {
  nextFeedbackVersion,
  writeAiFeedbackIfNewer,
} from '@/lib/ai/feedback-version'
import type { QuestionTimingQuality } from '@/lib/quiz/question-timing'

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
    /** When estimated/insufficient, do not rewrite persona from this submission. */
    timingQuality?: QuestionTimingQuality
  },
): Promise<void> {
  const t0 = Date.now()
  let topicCount = 0
  let llmEnrich = false
  const feedbackVersion = nextFeedbackVersion()

  try {
    // Canonicalize each subject separately so titles/ids stay subject-scoped.
    const labelsBySubject = new Map<string, string[]>()
    for (const d of details) {
      const subject = d.subject || DEFAULT_SUBJECT
      const label = normalizeTopicName(d.topic)
      const list = labelsBySubject.get(subject) ?? []
      list.push(label)
      labelsBySubject.set(subject, list)
    }

    const canonicalBySubject = new Map<
      string,
      Map<string, { topicName: string; topicKey: string }>
    >()
    for (const [subject, labels] of labelsBySubject) {
      const uniqueLabels = [...new Set(labels)]
      const map = options?.skipAiCanonicalization
        ? new Map(
            uniqueLabels.map((label) => [
              label,
              resolveTopicCanonicalSync(label, subject),
            ]),
          )
        : await ensureTopicsCanonicalized(uniqueLabels, subject)
      canonicalBySubject.set(subject, map)
    }

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

      const subject = d.subject || DEFAULT_SUBJECT
      const normalized = normalizeTopicName(d.topic)
      const canonicalMap = canonicalBySubject.get(subject)
      const canonical = canonicalMap?.get(normalized) ?? (() => {
        const { topicName, topicKey } = resolveTopicKey(normalized, subject)
        return { topicName, topicKey }
      })()
      const nodeId = canonical.topicKey
      if (!byNodeId.has(nodeId)) {
        byNodeId.set(nodeId, {
          topicName: canonical.topicName,
          nodeId,
          subject,
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

    // ── 2. Per-student transactional read→BKT→upsert (no last-write-win) ───────
    const planBatches: TopicBatchForPlan[] = await persistStudentMasteryBatches(
      studentId,
      batches,
    )

    // ── 3. Deterministic plan on hot path (LLM enrich deferred) ───────────────
    let plan = {
      ...buildStudentActionPlan(planBatches, options?.officialStats),
      polished: false,
      feedbackVersion,
    }

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

    // Persona mastery from THIS submission's topics only (not lifetime mean).
    const submissionAvgMastery =
      planBatches.length > 0
        ? planBatches.reduce((sum, b) => sum + b.pMastery, 0) / planBatches.length
        : 0.3

    const EMA = 0.3
    const blendedSpeed = existingProfile
      ? Number(existingProfile.avgSpeedPerQuestion) * (1 - EMA) + avgSpeed * EMA
      : avgSpeed
    const blendedCareless = existingProfile
      ? Number(existingProfile.carelessErrorRate) * (1 - EMA) + carelessRate * EMA
      : carelessRate

    const timingUnreliable =
      options?.timingQuality === 'estimated' ||
      options?.timingQuality === 'insufficient'

    // Estimated timing zeros out per-question seconds — leave persona unchanged.
    const persona =
      timingUnreliable && existingProfile
        ? existingProfile.personaType
        : computePersona(blendedSpeed, blendedCareless, submissionAvgMastery)

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
        ? writeAiFeedbackIfNewer(options.submissionId, plan)
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
      const enriched = await enrichActionPlanWithLLM(plan)
      plan = {
        ...enriched,
        feedbackVersion,
        polished: enriched.polished ?? false,
      }
      const curatedEnriched = curatedInsightFromPlan(plan)
      await Promise.all([
        options?.submissionId
          ? writeAiFeedbackIfNewer(options.submissionId, plan)
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
