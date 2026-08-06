import prisma from '@/lib/prisma'
import { publishSystemTestSchema } from '@/lib/validations/system-test'
import { normalizeTopicName, topicToNodeId } from '@/lib/knowledge/topic-normalize'
import type { z } from 'zod'

type ParsedQuestion = z.infer<typeof publishSystemTestSchema.shape.questions>[number]

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function topicMatches(questionTopic: string, weakTopics: string[]): boolean {
  const qKey = topicToNodeId(normalizeTopicName(questionTopic))
  return weakTopics.some((weak) => {
    const wKey = topicToNodeId(normalizeTopicName(weak))
    return (
      qKey === wKey ||
      qKey.includes(wKey) ||
      wKey.includes(qKey) ||
      normalizeTopicName(questionTopic)
        .toLowerCase()
        .includes(normalizeTopicName(weak).toLowerCase())
    )
  })
}

export interface MixedPracticeResult {
  questions: ParsedQuestion[]
  sourceTitles: string[]
  primaryWeakTopic: string
  weakFormLabel: string
}

export async function collectPracticeQuestionsFromBank(
  weakTopics: string[],
  options?: { targetCount?: number },
): Promise<MixedPracticeResult> {
  const targetCount = options?.targetCount ?? 6
  const easyTarget = Math.ceil(targetCount / 2)
  const mediumTarget = targetCount - easyTarget
  const primaryWeakTopic = weakTopics[0] ?? 'Chủ đề chung'

  const systemTests = await prisma.systemTest.findMany({
    where: {
      difficulty: { in: ['EASY', 'MEDIUM'] },
    },
    include: {
      group: { select: { topic: true, title: true, subject: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 80,
  })

  const easyPool: ParsedQuestion[] = []
  const mediumPool: ParsedQuestion[] = []
  const sourceTitles = new Set<string>()

  for (const systemTest of systemTests) {
    const parsed = publishSystemTestSchema.shape.questions.safeParse(systemTest.questions)
    if (!parsed.success) continue

    const fallbackTopic =
      systemTest.group?.topic?.trim() || systemTest.title

    for (const question of parsed.data) {
      const questionTopic = question.topic?.trim() || fallbackTopic
      if (!topicMatches(questionTopic, weakTopics)) continue

      const enriched = { ...question, topic: questionTopic }
      if (systemTest.difficulty === 'EASY') {
        easyPool.push(enriched)
      } else {
        mediumPool.push(enriched)
      }
      sourceTitles.add(systemTest.title)
    }
  }

  let picked = [
    ...shuffle(easyPool).slice(0, easyTarget),
    ...shuffle(mediumPool).slice(0, mediumTarget),
  ]

  if (picked.length < targetCount) {
    const combined = shuffle([...easyPool, ...mediumPool])
    for (const q of combined) {
      if (picked.length >= targetCount) break
      if (!picked.includes(q)) picked.push(q)
    }
  }

  if (picked.length === 0) {
    const fallbackTests = await prisma.systemTest.findMany({
      where: { difficulty: { in: ['EASY', 'MEDIUM'] } },
      take: 5,
      orderBy: { createdAt: 'desc' },
    })

    for (const systemTest of fallbackTests) {
      const parsed = publishSystemTestSchema.shape.questions.safeParse(systemTest.questions)
      if (!parsed.success) continue
      picked.push(...parsed.data.slice(0, 2))
      sourceTitles.add(systemTest.title)
      if (picked.length >= targetCount) break
    }
  }

  return {
    questions: shuffle(picked).slice(0, targetCount),
    sourceTitles: [...sourceTitles],
    primaryWeakTopic,
    weakFormLabel: primaryWeakTopic,
  }
}
