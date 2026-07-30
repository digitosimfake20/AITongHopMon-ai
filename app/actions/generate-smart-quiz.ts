'use server'

import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth/session'
import { getOpenAIClient, OPENAI_MODEL_CHAT } from '@/lib/ai/openai'
import type { ActionResult } from '@/lib/auth/types'
import type { ParsedQuestion } from '@/lib/quiz/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeneratedQuestion {
  content: string
  type: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER'
  options?: string[]
  correctOption: string
  explanation: string
  topic: string
  points: number
}

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

export async function generateSmartQuizAction(): Promise<
  ActionResult<{ testId: string; questionCount: number }>
> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập' }
  if (user.role !== 'student') return { success: false, error: 'Chỉ học sinh mới có thể tạo bài luyện' }

  // ── 1. Fetch student's weak topics ────────────────────────────────────────
  const weakStates = await prisma.studentKnowledgeState.findMany({
    where: { studentId: user.id },
    include: { node: true },
    orderBy: { pMastery: 'asc' },
    take: 3,
  })

  // Fall back to cognitive profile weaknesses if no knowledge states yet
  let weakTopics: string[] = weakStates.map((s) => s.node.title)

  if (weakTopics.length === 0) {
    const profile = await prisma.studentCognitiveProfile.findUnique({
      where: { studentId: user.id },
    })
    weakTopics = profile?.weaknessesSummary?.slice(0, 3) ?? []
  }

  if (weakTopics.length === 0) {
    weakTopics = ['Phân thức đại số', 'Phương trình', 'Bất phương trình']
  }

  // ── 2. Try to find existing questions matching weak topics ─────────────────
  const existingQuestions = await prisma.question.findMany({
    where: {
      topic: { in: weakTopics },
      type: { in: ['MULTIPLE_CHOICE', 'SHORT_ANSWER'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  // ── 3. Generate AI questions for remaining quota ───────────────────────────
  const REQUIRED = 5
  let questionsToUse = existingQuestions.slice(0, REQUIRED)
  const generatedQuestions: GeneratedQuestion[] = []

  if (questionsToUse.length < REQUIRED) {
    const needed = REQUIRED - questionsToUse.length
    const topicsForGeneration = weakTopics.join(', ')

    const openai = getOpenAIClient()
    const resp = await openai.chat.completions.create({
      model: OPENAI_MODEL_CHAT,
      messages: [
        {
          role: 'system',
          content: `Bạn là giáo viên Toán lớp 8 Việt Nam. Hãy tạo ${needed} câu hỏi luyện tập (trắc nghiệm 4 lựa chọn hoặc điền ngắn) tập trung vào các chủ đề: ${topicsForGeneration}.

QUY TẮC:
- Mỗi câu có độ khó vừa phải (phù hợp học sinh đang ôn yếu).
- Công thức toán học viết theo cú pháp LaTeX: $inline$ hoặc $$display$$.
- Câu trắc nghiệm: 4 lựa chọn A, B, C, D; correctOption là "A"|"B"|"C"|"D".
- Câu điền ngắn: correctOption là đáp án dạng số hoặc cụm từ ngắn.
- Cung cấp giải thích chi tiết cho đáp án đúng.

Trả về JSON hợp lệ theo schema:
{
  "questions": [
    {
      "content": "Nội dung câu hỏi (LaTeX)",
      "type": "MULTIPLE_CHOICE" | "SHORT_ANSWER",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."] (chỉ cho MULTIPLE_CHOICE),
      "correctOption": "A",
      "explanation": "Giải thích chi tiết",
      "topic": "Tên chủ đề ngắn gọn 2-4 từ"
    }
  ]
}`,
        },
        {
          role: 'user',
          content: `Tạo ${needed} câu hỏi ôn luyện cho học sinh yếu về: ${topicsForGeneration}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    })

    const parsed = JSON.parse(resp.choices[0]?.message?.content ?? '{"questions":[]}')
    generatedQuestions.push(...(parsed.questions ?? []).slice(0, needed))
  }

  // ── 4. Find student's class ────────────────────────────────────────────────
  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: user.id },
    select: { classId: true, class: { select: { subject: true } } },
  })

  if (!enrollment) {
    return { success: false, error: 'Học sinh chưa tham gia lớp học nào' }
  }
  const classId = enrollment.classId
  const subject = enrollment.class.subject ?? 'Toán'

  // ── 5. Persist generated questions to DB ───────────────────────────────────
  const newQuestionIds: string[] = []

  for (const gq of generatedQuestions) {
    const options = gq.options ?? null
    const created = await prisma.question.create({
      data: {
        subject,
        topic: gq.topic || weakTopics[0] || 'Chủ đề chung',
        difficulty: 'easy',
        type: gq.type,
        content: gq.content,
        options: options as any,
        correctOption: gq.correctOption,
        explanation: gq.explanation,
        points: 1.0,
      },
    })
    newQuestionIds.push(created.id)
  }

  // ── 6. Collect all question IDs ────────────────────────────────────────────
  const allQuestionIds = [
    ...questionsToUse.map((q) => q.id),
    ...newQuestionIds,
  ]

  // ── 7. Create a personalized test ─────────────────────────────────────────
  const testTitle = `Luyện tập cá nhân hóa — ${weakTopics.slice(0, 2).join(', ')}`

  const test = await prisma.test.create({
    data: {
      title: testTitle,
      subject,
      classId,
      questionIds: allQuestionIds,
      durationMinutes: 15,
      status: 'PUBLISHED',
      difficultyLevel: 'EASY',
      mode: 'STANDARD',
    },
  })

  return {
    success: true,
    data: { testId: test.id, questionCount: allQuestionIds.length },
  }
}
