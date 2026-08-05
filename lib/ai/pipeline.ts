/**
 * Post-submission AI Pipeline
 * Runs after every quiz submission (fire-and-forget from submitQuizAction).
 * Updates:
 *  1. student_knowledge_states  — BKT mastery per topic (unique studentId + nodeId)
 *  2. student_cognitive_profiles — speed, careless rate, persona, strengths/weaknesses
 */
import prisma from '@/lib/prisma'
import { computeTopicMasteryUpdate } from '@/lib/knowledge/mastery-evidence'
import { ensureTopicsCanonicalized } from '@/lib/knowledge/topic-canonicalize-ai'
import { normalizeTopicName, resolveTopicKey } from '@/lib/knowledge/topic-normalize'

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
  if (avgMastery >= 0.8) return 'Thành thạo'
  if (carelessRate > 0.3 && avgSpeed < 20) return 'Nhanh nhạy nhưng ẩu'
  if (avgSpeed > 80) return 'Cẩn thận - Ngâm lâu'
  if (carelessRate < 0.1 && avgMastery >= 0.6) return 'Chắc chắn, tốc độ tốt'
  return 'Đang phát triển'
}

// ---------------------------------------------------------------------------
// Main pipeline function
// ---------------------------------------------------------------------------

export async function runPostSubmissionAIPipeline(
  studentId: string,
  details: SubmissionDetailForPipeline[],
): Promise<void> {
  try {
    const uniqueLabels = [...new Set(details.map((d) => normalizeTopicName(d.topic)))]
    const subject = details[0]?.subject || 'Toán'
    const canonicalMap = await ensureTopicsCanonicalized(uniqueLabels, subject)

    // ── 1. Group by AI-canonical topicKey ─────────────────────────────────────
    type TopicBatch = {
      topicName: string
      nodeId: string
      subject: string
      answers: Array<{ isCorrect: boolean; timeSpentSeconds: number }>
    }
    const byNodeId = new Map<string, TopicBatch>()

    for (const d of details) {
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

    // ── 2. Upsert KnowledgeNodes + StudentKnowledgeStates (unique student+node) ─
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
          // Keep first title unless empty; node id is the canonical topicKey
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
    }

    // ── 3. Compute overall cognitive signals ──────────────────────────────────
    const allTimes = details.map((d) => d.timeSpentSeconds)
    const avgSpeed =
      allTimes.length > 0 ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length : 30

    const fastWrong = details.filter((d) => !d.isCorrect && d.timeSpentSeconds < 15).length
    const carelessRate = details.length > 0 ? fastWrong / details.length : 0

    const allStates = await prisma.studentKnowledgeState.findMany({
      where: { studentId },
      include: { node: { select: { title: true } } },
    })

    const strengths = allStates
      .filter((s) => Number(s.pMastery) >= 0.8)
      .sort((a, b) => Number(b.pMastery) - Number(a.pMastery))
      .slice(0, 5)
      .map((s) => s.node.title)

    const weaknesses = allStates
      .filter((s) => Number(s.pMastery) < 0.5)
      .sort((a, b) => Number(a.pMastery) - Number(b.pMastery))
      .slice(0, 5)
      .map((s) => s.node.title)

    const avgMastery =
      allStates.length > 0
        ? allStates.reduce((sum, s) => sum + Number(s.pMastery), 0) / allStates.length
        : 0.3

    const persona = computePersona(avgSpeed, carelessRate, avgMastery)

    // ── 4. Upsert StudentCognitiveProfile ─────────────────────────────────────
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

    // ── 5. Update GlobalAgentMemory long-term summary ─────────────────────────
    const memorySnippet = `[${new Date().toLocaleDateString('vi-VN')}] Bài kiểm tra vừa nộp. Điểm yếu hiện tại: ${weaknesses.slice(0, 3).join(', ') || 'Chưa xác định'}. Persona: ${persona}.`

    const existing_mem = await prisma.globalAgentMemory.findUnique({
      where: { studentId },
    })

    if (existing_mem) {
      const combined = `${existing_mem.longTermSummary}\n${memorySnippet}`.slice(-1500)
      await prisma.globalAgentMemory.update({
        where: { studentId },
        data: {
          longTermSummary: combined,
          totalProcessedMessages: existing_mem.totalProcessedMessages + details.length,
        },
      })
    } else {
      await prisma.globalAgentMemory.create({
        data: {
          studentId,
          longTermSummary: memorySnippet,
          keyInsights: { weaknesses, strengths, persona },
          totalProcessedMessages: details.length,
        },
      })
    }
  } catch (err) {
    console.error('[AI Pipeline] Error:', err)
  }
}
