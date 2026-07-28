import type { UserRole } from '@prisma/client'

export type AuthRole = 'student' | 'teacher'

export interface SessionUser {
  id: string
  email: string
  fullName: string
  role: UserRole
}

export interface ActionResult<T = void> {
  success: boolean
  error?: string
  data?: T
}
