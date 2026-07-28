'use server'

import type { UserRole } from '@prisma/client'
import { redirect } from 'next/navigation'
import { getPostAuthPath, syncUserProfile } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/auth/types'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { signInSchema, signUpSchema } from '@/lib/validations/auth'

export async function signUpAction(
  formData: FormData,
): Promise<ActionResult<{ needsEmailConfirmation: boolean }>> {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    fullName: formData.get('fullName'),
    role: formData.get('role'),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' }
  }

  const { email, password, fullName, role } = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, full_name: fullName },
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  if (!data.user) {
    return { success: false, error: 'Không thể tạo tài khoản' }
  }

  await syncUserProfile({
    id: data.user.id,
    email,
    fullName,
    role: role as UserRole,
  })

  if (!data.session) {
    return { success: true, data: { needsEmailConfirmation: true } }
  }

  redirect(await getPostAuthPath(data.user.id, role as UserRole))
}

export async function signInAction(formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return { success: false, error: error.message }
  }

  if (!data.user?.email) {
    return { success: false, error: 'Đăng nhập thất bại' }
  }

  const dbUser = await prisma.user.findUnique({ where: { id: data.user.id } })
  const role =
    dbUser?.role ??
    ((data.user.user_metadata?.role as UserRole | undefined) ?? 'student')
  const fullName =
    dbUser?.fullName ??
    (data.user.user_metadata?.full_name as string | undefined) ??
    data.user.email.split('@')[0]

  await syncUserProfile({
    id: data.user.id,
    email: data.user.email,
    fullName,
    role,
  })

  redirect(await getPostAuthPath(data.user.id, role))
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
