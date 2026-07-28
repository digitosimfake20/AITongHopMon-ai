import { z } from 'zod'

export const authRoleSchema = z.enum(['student', 'teacher'])

export const signUpSchema = z
  .object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
    confirmPassword: z.string(),
    fullName: z.string().min(2, 'Họ tên quá ngắn'),
    role: authRoleSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmPassword'],
  })

export const signInSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Nhập mật khẩu'),
})

export const joinClassSchema = z.object({
  code: z
    .string()
    .length(8, 'Mã lớp phải đúng 8 ký tự')
    .regex(/^[A-Z0-9]+$/, 'Mã lớp chỉ gồm chữ và số'),
})

export const createClassSchema = z.object({
  name: z.string().min(2, 'Tên lớp quá ngắn'),
  maxCapacity: z.coerce.number().int().min(1).max(200),
})

export const updateClassSchema = z.object({
  classId: z.string().uuid(),
  name: z.string().min(2),
  maxCapacity: z.coerce.number().int().min(1).max(200),
})
