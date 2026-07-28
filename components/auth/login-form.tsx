'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { signInAction } from '@/lib/auth/actions'
import type { AuthRole } from '@/lib/auth/types'
import { AuthShell } from './auth-shell'

interface LoginFormProps {
  role: AuthRole
}

export function LoginForm({ role }: LoginFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await signInAction(formData)
    if (result && !result.success) {
      toast.error(result.error ?? 'Đăng nhập thất bại')
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      role={role}
      title={role === 'student' ? 'Đăng nhập học sinh' : 'Đăng nhập giáo viên'}
      subtitle={
        role === 'student'
          ? 'Nhập email và mật khẩu để tiếp tục'
          : 'Nhập email trường và mật khẩu'
      }
      onBack={() => router.push('/login')}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <input type="hidden" name="role" value={role} />
        <div>
          <label htmlFor="login-email" className="mb-2 block text-sm font-semibold">
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            required
            className="min-h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="mb-2 block text-sm font-semibold">
            Mật khẩu
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            required
            className="min-h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base"
          />
        </div>
        <Button type="submit" disabled={isLoading} className="h-11 w-full">
          {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{' '}
        <Link href={`/signup/${role}`} className="font-semibold text-accent hover:underline">
          Đăng ký
        </Link>
      </p>
    </AuthShell>
  )
}
