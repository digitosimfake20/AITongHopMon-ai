import { z } from 'zod'
import { publishSystemTestSchema } from '@/lib/validations/system-test'

export const publishTestGroupSchema = z.object({
  title: z.string().min(1, 'Thiếu tiêu đề cụm đề'),
  subject: z.string().min(1).default('Toán'),
  grade: z.string().min(1).default('8'),
  topic: z.string().default(''),
  description: z.string().optional(),
  easyJson: publishSystemTestSchema,
  mediumJson: publishSystemTestSchema,
  hardJson: publishSystemTestSchema,
})

export type PublishTestGroupInput = z.infer<typeof publishTestGroupSchema>

export const updateTestGroupSchema = publishTestGroupSchema.extend({
  groupId: z.string().uuid(),
})

export type UpdateTestGroupInput = z.infer<typeof updateTestGroupSchema>

export const assignAdaptiveGroupSchema = z
  .object({
    testGroupId: z.string().uuid(),
    classId: z.string().uuid(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    passScoreThreshold: z.coerce.number().min(0).max(10).default(8.0),
    lowScoreThreshold: z.coerce.number().min(0).max(10).default(5.0),
    allowReview: z.boolean().default(true),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: 'Deadline phải sau thời gian mở đề',
    path: ['endTime'],
  })

export type AssignAdaptiveGroupInput = z.infer<typeof assignAdaptiveGroupSchema>
