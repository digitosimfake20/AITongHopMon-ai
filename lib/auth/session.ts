'use server'

import { cache } from 'react'
import type { UserRole } from '@prisma/client'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import type { SessionUser } from '@/lib/auth/types'

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error?.code === 'refresh_token_not_found') {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore — stale cookies will clear on next response
    }
    return null
  }

  if (!user?.email) return null

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })

  if (dbUser) {
    return {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.fullName,
      role: dbUser.role,
    }
  }

  const role = (user.user_metadata?.role as UserRole | undefined) ?? 'student'
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email.split('@')[0]

  const profile = {
    id: user.id,
    email: user.email,
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
