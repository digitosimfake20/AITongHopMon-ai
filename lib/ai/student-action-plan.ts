/**
 * Deterministic post-submit action plan + optional thin LLM polish.
 * Numbers come from BKT; LLM only writes short praise/advice keyed by topicKey.
 */

import { getOpenAIClient, OPENAI_MODEL_CHAT } from '@/lib/ai/openai'
import {
  isWeakMastery,
  masteryStatusFromP,
  type MasteryLabelStatus,
} from '@/lib/knowledge/mastery-labels'
import {
  formatOfficialScoreLine,
  type SubmissionOfficialStats,
} from '@/lib/knowledge/scored-submission-stats'

export interface ActionPlanTopic {
  topic: string
  topicKey: string
  total: number
  correct: number
  accuracy: number
  pMastery: number
  status: MasteryLabelStatus
  advice?: string
}

export interface StudentActionPlan {
  /** Authoritative counts from Submission — UI should prefer this over LLM prose. */
  officialStats?: SubmissionOfficialStats
  praise: string
  knowledgeGaps: Array<{ issue: string; advice: string }>
  topicMastery: ActionPlanTopic[]
  nextStep: {
    type: 'practice'
    topicKeys: string[]
    topicTitles: string[]
  } | null
  signals: {
    carelessCount: number
    stuckCount: number
  }
}

export interface TopicBatchForPlan {
  topicName: string
  topicKey: string
  pMastery: number
  answers: Array<{ isCorrect: boolean; timeSpentSeconds: number }>
}

function defaultPraise(scoreHint: { correct: number; total: number }): string {
  if (scoreHint.total === 0) return 'Bạn đã hoàn thành bài. Tiếp tục luyện để Zeno nắm rõ hơn điểm mạnh của bạn.'
  const ratio = scoreHint.correct / scoreHint.total
  if (ratio >= 0.85) return 'Làm tốt! Nhiều chủ đề đang ở mức vững — hãy thử bài luyện nâng cao hơn một chút.'
  if (ratio >= 0.6) return 'Tiến bộ rõ. Một vài chủ đề còn lệch — luyện đúng chỗ sẽ nhanh hơn ôn lan man.'
  return 'Đừng nản. Hệ thống đã ghi nhận chỗ còn yếu — luyện tập ngắn theo chủ đề sẽ giúp bạn lấy lại đà.'
}

/** Build structured plan from updated BKT batches (no LLM). */
export function buildStudentActionPlan(
  batches: TopicBatchForPlan[],
  officialStats?: SubmissionOfficialStats,
): StudentActionPlan {
  let sessionCorrect = 0
  let sessionTotal = 0
  let carelessCount = 0
  let stuckCount = 0

  const topicMastery: ActionPlanTopic[] = batches.map((b) => {
    const total = b.answers.length
    const correct = b.answers.filter((a) => a.isCorrect).length
    sessionTotal += total
    sessionCorrect += correct
    for (const a of b.answers) {
      if (a.timeSpentSeconds <= 0) continue
      if (!a.isCorrect && a.timeSpentSeconds < 15) carelessCount++
      if (!a.isCorrect && a.timeSpentSeconds > 120) stuckCount++
    }
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
    return {
      topic: b.topicName,
      topicKey: b.topicKey,
      total,
      correct,
      accuracy,
      pMastery: b.pMastery,
      status: masteryStatusFromP(b.pMastery),
    }
  }).sort((a, b) => a.pMastery - b.pMastery)

  const weakForPractice = topicMastery
    .filter((t) => isWeakMastery(t.pMastery))
    .slice(0, 3)

  const knowledgeGaps = weakForPractice.map((t) => {
    const issues: string[] = []
    if (t.accuracy < 60) {
      issues.push(`Chỉ đúng ${t.correct}/${t.total} câu trong bài vừa làm`)
    } else {
      issues.push(`Độ thành thạo còn ${Math.round(t.pMastery * 100)}% — chưa đủ vững`)
    }
    return {
      issue: `${t.topic}: ${issues.join('; ')}`,
      advice: `Luyện thêm vài câu cùng dạng từ kho đề cho chủ đề "${t.topic}".`,
    }
  })

  if (carelessCount >= 2) {
    knowledgeGaps.unshift({
      issue: `${carelessCount} câu sai trong dưới 15 giây — có thể đang làm ẩu hoặc đoán`,
      advice: 'Đọc lại đề trước khi chọn đáp án; dành thêm vài giây kiểm tra.',
    })
  }
  if (stuckCount >= 2) {
    knowledgeGaps.push({
      issue: `${stuckCount} câu sai sau hơn 120 giây — dấu hiệu lỗ hổng kiến thức`,
      advice: 'Ôn lại lý thuyết chủ đề đó trước khi làm thêm bài tương tự.',
    })
  }

  const praiseBase = officialStats
    ? formatOfficialScoreLine(officialStats)
    : defaultPraise({ correct: sessionCorrect, total: sessionTotal })

  return {
    officialStats,
    praise: praiseBase,
    knowledgeGaps,
    topicMastery,
    nextStep:
      weakForPractice.length > 0
        ? {
            type: 'practice',
            topicKeys: weakForPractice.map((t) => t.topicKey),
            topicTitles: weakForPractice.map((t) => t.topic),
          }
        : null,
    signals: { carelessCount, stuckCount },
  }
}

const THIN_ANALYSIS_PROMPT = `Bạn là gia sư Zeno. Viết phản hồi ngắn bằng tiếng Việt cho học sinh sau bài kiểm tra.
CHỈ trả JSON thuần:
{
  "encouragement": "1 câu động viên (KHÔNG nêu số câu đúng/sai — hệ thống đã có số chính thức)",
  "topicAdvice": [{ "topicKey": "...", "advice": "1 câu gợi ý cụ thể" }]
}
topicKey phải khớp đúng danh sách được cung cấp. Không bịa chủ đề mới. Không đếm lại câu đúng.
Nếu prompt có "toneHint" báo còn chủ đề yếu hoặc điểm trung bình: KHÔNG dùng "vững chắc", "nền tảng vững", "xuất sắc" — hãy thừa nhận còn dạng cần luyện và động viên tiếp tục.`

/** One-line encouragement aligned with official stats + weak topics (no LLM counting). */
export function deterministicEncouragement(plan: StudentActionPlan): string {
  const weak = plan.topicMastery.filter((t) => t.status !== 'MASTERED')
  const hasSevereWeak = weak.some((t) => t.accuracy < 50)
  const scored = plan.officialStats?.scoredQuestionCount ?? 0
  const ratio =
    scored > 0 && plan.officialStats
      ? plan.officialStats.correctCount / scored
      : weak.length > 0
        ? weak.reduce((s, t) => s + t.accuracy, 0) / (weak.length * 100)
        : 1

  if (hasSevereWeak || ratio < 0.65) {
    return 'Em đã hoàn thành bài — vẫn còn vài dạng cần ôn thêm; luyện đúng chủ đề sẽ giúp điểm và độ tự tin tăng nhanh hơn.'
  }
  if (ratio < 0.85 || weak.length >= 2) {
    return 'Tiến bộ rõ. Một số chủ đề còn lệch — tập trung luyện các dạng đó trước khi làm đề mới.'
  }
  return 'Làm tốt! Có thể thử thêm bài khó hơn một chút để củng cố.'
}

const OVERPRAISE_WHEN_WEAK = /vững chắc|nền tảng.*vững|xuất sắc|rất tốt.*toàn diện/i

/** Optional LLM polish — merges advice by topicKey; keeps deterministic structure. */
export async function enrichActionPlanWithLLM(
  plan: StudentActionPlan,
): Promise<StudentActionPlan> {
  const weak = plan.topicMastery.filter((t) => t.status !== 'MASTERED')
  if (weak.length === 0) return plan

  try {
    const openai = getOpenAIClient()
    const toneHint = deterministicEncouragement(plan)
    const userPrompt = `Lời khen mặc định: ${plan.praise}
toneHint (bắt buộc phù hợp, không mâu thuẫn): ${toneHint}

Chủ đề cần advice (dùng đúng topicKey):
${weak
  .map(
    (t) =>
      `- topicKey="${t.topicKey}" title="${t.topic}" session=${t.correct}/${t.total} pMastery=${Math.round(t.pMastery * 100)}%`,
  )
  .join('\n')}`

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL_CHAT,
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 500,
      messages: [
        { role: 'system', content: THIN_ANALYSIS_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) return plan

    const parsed = JSON.parse(raw) as {
      encouragement?: string
      praise?: string
      topicAdvice?: Array<{ topicKey: string; advice: string }>
    }

    const adviceMap = new Map(
      (parsed.topicAdvice ?? [])
        .filter((t) => t.topicKey && t.advice)
        .map((t) => [t.topicKey, t.advice]),
    )

    const topicMastery = plan.topicMastery.map((t) => ({
      ...t,
      advice: adviceMap.get(t.topicKey) ?? t.advice,
    }))

    const knowledgeGaps = plan.knowledgeGaps.map((gap) => {
      const match = topicMastery.find(
        (t) => gap.issue.startsWith(t.topic) && t.advice,
      )
      return match?.advice ? { ...gap, advice: match.advice } : gap
    })

    let encouragement = (parsed.encouragement ?? parsed.praise)?.trim()
    const needsCaution =
      weak.some((t) => t.accuracy < 50) ||
      (plan.officialStats &&
        plan.officialStats.scoredQuestionCount > 0 &&
        plan.officialStats.correctCount / plan.officialStats.scoredQuestionCount < 0.7)
    if (!encouragement || (needsCaution && encouragement && OVERPRAISE_WHEN_WEAK.test(encouragement))) {
      encouragement = deterministicEncouragement(plan)
    }
    const praise = encouragement ? `${plan.praise} ${encouragement}` : plan.praise

    return {
      ...plan,
      praise,
      topicMastery,
      knowledgeGaps,
    }
  } catch (err) {
    console.error('[action-plan] LLM enrich failed, using deterministic plan:', err)
    return plan
  }
}

/** Curated one-liner for dashboard / Zeno insight (not raw memory dump). */
export function curatedInsightFromPlan(plan: StudentActionPlan): string {
  if (plan.nextStep && plan.nextStep.topicTitles.length > 0) {
    const topics = plan.nextStep.topicTitles.slice(0, 2).join(', ')
    return `${plan.praise} Nên luyện tiếp: ${topics}.`
  }
  return plan.praise
}
