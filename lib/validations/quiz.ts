import { z } from 'zod'

const basePointsAndExplanation = {
  explanation: z.string().trim().optional(),
  points: z.number().min(0).max(100).optional(),
}

export const multipleChoiceSchema = z.object({
  type: z.literal('MULTIPLE_CHOICE'),
  content: z.string().trim().min(1, 'Câu hỏi không được để trống'),
  options: z
    .array(z.string().trim().min(1, 'Lựa chọn không được để trống'))
    .length(4, 'Phải có đúng 4 lựa chọn'),
  correctAnswer: z.number().int().min(0).max(3),
  ...basePointsAndExplanation,
})

export const trueFalseGroupSchema = z.object({
  type: z.literal('TRUE_FALSE_GROUP'),
  content: z.string().trim().min(1, 'Câu hỏi không được để trống'),
  subQuestions: z
    .array(
      z.object({
        label: z.string().trim().min(1, 'Nhãn ý không được để trống'),
        content: z.string().trim().min(1, 'Nội dung ý không được để trống'),
        correctAnswer: z.boolean(),
      }),
    )
    .min(1, 'Cần ít nhất 1 ý Đúng/Sai'),
  ...basePointsAndExplanation,
})

export const shortAnswerSchema = z.object({
  type: z.literal('SHORT_ANSWER'),
  content: z.string().trim().min(1, 'Câu hỏi không được để trống'),
  correctAnswer: z.string().trim().min(1, 'Đáp án không được để trống'),
  ...basePointsAndExplanation,
})

export const essaySchema = z.object({
  type: z.literal('ESSAY'),
  content: z.string().trim().min(1, 'Câu hỏi không được để trống'),
  ...basePointsAndExplanation,
})

export const parsedQuestionSchema = z.discriminatedUnion('type', [
  multipleChoiceSchema,
  trueFalseGroupSchema,
  shortAnswerSchema,
  essaySchema,
])

export const saveQuizSchema = z.object({
  classId: z.string().uuid(),
  title: z.string().trim().min(2, 'Tên đề quá ngắn'),
  subject: z.string().trim().min(1, 'Chọn môn học'),
  topic: z.string().trim().min(1, 'Nhập chủ đề'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  timeLimitMinutes: z.coerce.number().int().min(1).max(300),
  questions: z.array(parsedQuestionSchema).min(1, 'Cần ít nhất 1 câu hỏi'),
})

export type SaveQuizInput = z.infer<typeof saveQuizSchema>

const tierInputSchema = z.object({
  timeLimitMinutes: z.coerce.number().int().min(1).max(300),
  questions: z.array(parsedQuestionSchema).min(1, 'Mỗi mức độ cần ít nhất 1 câu hỏi'),
})

export const saveQuizPackageSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('STANDARD'),
    classId: z.string().uuid(),
    subject: z.string().trim().min(1, 'Chọn môn học'),
    topic: z.string().trim().min(1, 'Nhập chủ đề'),
    title: z.string().trim().min(2, 'Tên đề quá ngắn'),
    timeLimitMinutes: z.coerce.number().int().min(1).max(300),
    questions: z.array(parsedQuestionSchema).min(1, 'Cần ít nhất 1 câu hỏi'),
  }),
  z.object({
    mode: z.literal('ADAPTIVE_PACKAGE'),
    classId: z.string().uuid(),
    subject: z.string().trim().min(1, 'Chọn môn học'),
    topic: z.string().trim().min(1, 'Nhập chủ đề'),
    title: z.string().trim().min(2, 'Tên bộ đề quá ngắn'),
    description: z.string().trim().optional(),
    easy: tierInputSchema,
    medium: tierInputSchema,
    hard: tierInputSchema,
  }),
])

export type SaveQuizPackageInput = z.infer<typeof saveQuizPackageSchema>
