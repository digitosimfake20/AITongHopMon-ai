'use server'

import { cache } from 'react'
import type { UserRole } from '@prisma/client'
import prisma from '@/lib/prisma'
import { getVerifiedAuthIdentity } from '@/lib/auth/claims'
import { createClient } from '@/lib/supabase/server'
import type { SessionUser } from '@/lib/auth/types'

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const { identity, error } = await getVerifiedAuthIdentity(supabase)

  if (error?.code === 'refresh_token_not_found') {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore — stale cookies will clear on next response
    }
    return null
  }

  if (!identity) return null

  const dbUser = await prisma.user.findUnique({ where: { id: identity.id } })

  if (dbUser) {
    return {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.fullName,
      role: dbUser.role,
    }
  }

  const role =
    (identity.userMetadata.role as UserRole | undefined) ?? 'student'
  const fullName =
    (identity.userMetadata.full_name as string | undefined) ??
    identity.email.split('@')[0]

  const profile = {
    id: identity.id,
    email: identity.email,
    fullName,
    role,
  }

  await syncUserProfile(profile)

  return profile
})

export async function syncUserProfile(input: {
  id: string
  email: string
  fullName: string
  role: UserRole
}) {
  await prisma.user.upsert({
    where: { id: input.id },
    create: input,
    update: {
      email: input.email,
      fullName: input.fullName,
      role: input.role,
    },
  })
}

export async function getPostAuthPath(userId: string, role: UserRole): Promise<string> {
  if (role === 'teacher') {
    const classroom = await prisma.classroom.findFirst({
      where: { teacherId: userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })
    return classroom ? `/teacher?class=${classroom.id}` : '/onboarding'
  }

  const membership = await prisma.classMember.findFirst({
    where: { studentId: userId },
    orderBy: { joinedAt: 'desc' },
    select: { classId: true },
  })

  return membership ? `/dashboard?class=${membership.classId}` : '/onboarding'
}
