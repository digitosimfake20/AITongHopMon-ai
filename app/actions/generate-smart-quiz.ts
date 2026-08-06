'use server'

import prisma, { prismaDirect } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/auth/types'
import {
  PRACTICE_TEST_PREFIX,
  PRACTICE_TIME_LIMIT_MINUTES,
  type GenerateSmartQuizResult,
} from '@/lib/quiz/practice-quiz'
import { createQuestionsInTransaction } from '@/lib/system-test/materialize-questions'
import { collectPracticeQuestionsFromBank } from '@/lib/system-test/mix-practice-from-bank'

export async function generateSmartQuizAction(options?: {
  saveForLater?: boolean
}): Promise<ActionResult<GenerateSmartQuizResult>> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập' }
  if (user.role !== 'student') {
    return { success: false, error: 'Chỉ học sinh mới có thể tạo bài luyện' }
  }

  const weakStates = await prisma.studentKnowledgeState.findMany({
    where: { studentId: user.id },
    include: { node: true },
    orderBy: { pMastery: 'asc' },
    take: 3,
  })

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

  const mixed = await collectPracticeQuestionsFromBank(weakTopics, { targetCount: 6 })

  if (mixed.questions.length === 0) {
    return {
      success: false,
      error: 'Chưa có câu hỏi phù hợp trong kho đề. Hãy liên hệ giáo viên.',
    }
  }

  const membership = await prisma.classMember.findFirst({
    where: { studentId: user.id },
    select: { classId: true },
  })

  if (!membership) {
    return { success: false, error: 'Học sinh chưa tham gia lớp học nào' }
  }

  const timeLimitMinutes = PRACTICE_TIME_LIMIT_MINUTES
  const testTitle = `${PRACTICE_TEST_PREFIX} — ${mixed.primaryWeakTopic}`

  const test = await prismaDirect.$transaction(async (tx) => {
    const createdQuestions = await createQuestionsInTransaction(tx, mixed.questions, {
      subject: 'Toán',
      topicFallback: mixed.primaryWeakTopic,
      difficulty: 'easy',
    })

    return tx.test.create({
      data: {
        title: testTitle,
        classId: membership.classId,
        questionIds: createdQuestions.map((q) => q.id),
        timeLimitMinutes,
        difficultyLevel: 'EASY',
        createdBy: user.id,
      },
    })
  })

  return {
    success: true,
    data: {
      testId: test.id,
      questionCount: mixed.questions.length,
      timeLimitMinutes,
      weakTopic: mixed.primaryWeakTopic,
      weakFormLabel: mixed.weakFormLabel,
      sourceTitles: mixed.sourceTitles,
      saveForLater: options?.saveForLater ?? false,
    },
  }
}
