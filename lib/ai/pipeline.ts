/**
 * Post-submission AI Pipeline
 * Runs after every quiz submission (fire-and-forget from submitQuizAction).
 * Updates:
 *  1. student_knowledge_states  — BKT mastery per topic
 *  2. student_cognitive_profiles — speed, careless rate, persona, strengths/weaknesses
 */
import prisma from '@/lib/prisma'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubmissionDetailForPipeline {
  questionId: string
  topic: string       // question.topic (already resolved / auto-fixed)
  subject: string
  type: string
  isCorrect: boolean
  timeSpentSeconds: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Slugify a topic string into a stable node ID */
function topicToNodeId(topic: string): string {
  return topic
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || 'general'
}

/** Simple BKT-inspired mastery update (no external BKT lib needed) */
function bktUpdate(currentMastery: number, isCorrect: boolean): number {
  const LEARN_RATE = 0.22
  const FORGET_RATE = 0.15
  const updated = isCorrect
    ? currentMastery + (1 - currentMastery) * LEARN_RATE
    : currentMastery * (1 - FORGET_RATE)
  return Math.min(0.99, Math.max(0.05, updated))
}

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
    // ── 1. Group details by topic ─────────────────────────────────────────────
    const byTopic = new Map<string, { subject: string; correct: number; total: number; times: number[] }>()
    for (const d of details) {
      const topic = d.topic || 'Chủ đề chung'
      if (!byTopic.has(topic)) {
        byTopic.set(topic, { subject: d.subject, correct: 0, total: 0, times: [] })
      }
      const entry = byTopic.get(topic)!
      entry.total++
      if (d.isCorrect) entry.correct++
      entry.times.push(d.timeSpentSeconds)
    }

    // ── 2. Upsert KnowledgeNodes + StudentKnowledgeStates ────────────────────
    for (const [topic, stats] of byTopic) {
      const nodeId = topicToNodeId(topic)

      // Ensure KnowledgeNode exists
      await prisma.knowledgeNode.upsert({
        where: { id: nodeId },
        create: {
          id: nodeId,
          subject: stats.subject || 'Toán',
          title: topic,
          difficultyLevel: 1,
        },
        update: {}, // don't overwrite existing node metadata
      })

      // Get current mastery
      const existing = await prisma.studentKnowledgeState.findUnique({
        where: { studentId_nodeId: { studentId, nodeId } },
      })
      const currentMastery = existing ? Number(existing.pMastery) : 0.2

      // Apply BKT for each answer in this topic
      let mastery = currentMastery
      const topicDetails = details.filter((d) => (d.topic || 'Chủ đề chung') === topic)
      for (const d of topicDetails) {
        mastery = bktUpdate(mastery, d.isCorrect)
      }

      await prisma.studentKnowledgeState.upsert({
        where: { studentId_nodeId: { studentId, nodeId } },
        create: {
          studentId,
          nodeId,
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
    const avgSpeed = allTimes.length > 0
      ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length
      : 30

    const fastWrong = details.filter((d) => !d.isCorrect && d.timeSpentSeconds < 15).length
    const carelessRate = details.length > 0 ? fastWrong / details.length : 0

    // Fetch all knowledge states for this student to compute strengths/weaknesses
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

    const avgMastery = allStates.length > 0
      ? allStates.reduce((sum, s) => sum + Number(s.pMastery), 0) / allStates.length
      : 0.3

    const persona = computePersona(avgSpeed, carelessRate, avgMastery)

    // ── 4. Upsert StudentCognitiveProfile ─────────────────────────────────────
    // Blend new signals with existing profile using exponential moving average
    const existing = await prisma.studentCognitiveProfile.findUnique({
      where: { studentId },
    })
    const EMA = 0.3 // weight for new data
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
      // Append new entry (keep last ~500 chars of summary)
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
    // Pipeline is non-critical — log but don't crash submission
    console.error('[AI Pipeline] Error:', err)
  }
}
