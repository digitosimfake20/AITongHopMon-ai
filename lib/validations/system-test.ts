import { z } from 'zod'

export const SYSTEM_SUBJECTS = ['Toán', 'Vật lý', 'Hóa học', 'Sinh học', 'Ngữ văn', 'Tiếng Anh'] as const
export type SystemSubject = (typeof SYSTEM_SUBJECTS)[number]

const questionTypeSchema = z.enum([
  'MULTIPLE_CHOICE',
  'TRUE_FALSE_GROUP',
  'SHORT_ANSWER',
  'ESSAY',
])

const systemQuestionSchema = z.object({
  type: questionTypeSchema.default('MULTIPLE_CHOICE'),
  content: z.string().min(1, 'Nội dung câu hỏi không được trống'),
  topic: z.string().optional(),
  options: z.array(z.string()).optional(),
  subQuestions: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string(),
        content: z.string(),
        correctAnswer: z.boolean().optional(),
      }),
    )
    .optional(),
  correctAnswer: z.union([z.string(), z.number()]).optional(),
  explanation: z.string().optional(),
  points: z.number().positive().optional(),
})

export const publishSystemTestSchema = z.object({
  title: z.string().min(1, 'Thiếu tiêu đề đề thi'),
  subject: z.string().min(1).default('Toán'),
  grade: z.string().min(1).default('8'),
  durationMinutes: z.coerce.number().int().positive('Thời gian làm bài phải > 0'),
  questions: z.array(systemQuestionSchema).min(1, 'Đề phải có ít nhất 1 câu hỏi'),
})

export type PublishSystemTestInput = z.infer<typeof publishSystemTestSchema>

export const assignClassTestSchema = z
  .object({
    systemTestId: z.string().uuid(),
    classId: z.string().uuid(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    maxAttempts: z.coerce.number().int().refine((n) => n === -1 || n >= 1, {
      message: 'Số lần làm phải là -1 (vô hạn) hoặc >= 1',
    }),
    allowReview: z.boolean().default(true),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: 'Deadline phải sau thời gian mở đề',
    path: ['endTime'],
  })

export type AssignClassTestInput = z.infer<typeof assignClassTestSchema>
