/**
 * Zod schemas for teacher / analyze model JSON — reject empty or partial shapes
 * before the UI maps over them.
 */

import { z } from 'zod'

export const remedialSuggestionSchema = z.object({
  summary: z.string().trim().min(1),
  activities: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
        type: z.enum(['exercise', 'video', 'discussion', 'quiz']),
      }),
    )
    .min(1),
})

export type RemedialSuggestionParsed = z.infer<typeof remedialSuggestionSchema>

/** Personalized remedial quiz items (MC / short-answer only). */
export const generatedQuizQuestionSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(['MULTIPLE_CHOICE', 'SHORT_ANSWER']),
  content: z.string().trim().min(1),
  options: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        content: z.string().trim().min(1),
      }),
    )
    .optional(),
  correctAnswer: z.union([z.number(), z.string()]),
  explanation: z.string(),
  points: z.number(),
  topic: z.string().trim().min(1),
})

export const personalizedQuizResponseSchema = z.object({
  questions: z.array(generatedQuizQuestionSchema).min(1),
})

export const analysisKnowledgeGapSchema = z.object({
  issue: z.string().trim().min(1),
  advice: z.string().trim().min(1),
})

export const analysisModelResponseSchema = z.object({
  praise: z.string().trim().min(1),
  knowledgeGaps: z.array(analysisKnowledgeGapSchema),
  topicAdvice: z
    .array(
      z.object({
        topicKey: z.string().optional(),
        topic: z.string().optional(),
        advice: z.string().trim().min(1),
      }),
    )
    .optional(),
})
