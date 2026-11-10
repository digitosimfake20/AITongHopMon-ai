import type { UserRole } from '@prisma/client'

/** Roles that Auth metadata may mint on first profile create. Never includes admin. */
const CREATE_ROLES = new Set<UserRole>(['student', 'teacher'])

export function roleForNewUser(metaRole: unknown): 'student' | 'teacher' {
  if (typeof metaRole === 'string' && CREATE_ROLES.has(metaRole as UserRole)) {
    return metaRole as 'student' | 'teacher'
  }
  return 'student'
}
