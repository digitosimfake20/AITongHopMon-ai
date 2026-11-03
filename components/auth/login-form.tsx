'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
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
  const [error, setError] = useState<string | null>(null)
  const errorId = useId()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await signInAction(formData)
    if (result && !result.success) {
      const message = result.error ?? 'Đăng nhập thất bại. Kiểm tra email và mật khẩu.'
      setError(message)
      toast.error(message)
      setIsLoading(false)
    }
  }

  const fieldClass =
    'min-h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:ring-destructive/30'

  return (
    <AuthShell
      role={role}
      title={role === 'student' ? 'Đăng nhập học sinh' : 'Đăng nhập giáo viên'}
      subtitle={
        role === 'student'
          ? 'Dùng email và mật khẩu đã đăng ký.'
          : 'Dùng email trường và mật khẩu.'
      }
      onBack={() => router.push('/login')}
    >
      <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isLoading || undefined}>
        {error ? (
          <p id={errorId} role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
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
            autoComplete="email"
            placeholder={
              role === 'student' ? 'hocsinh@fpt.edu.vn' : 'thayco@truong.edu.vn'
            }
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={fieldClass}
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
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={fieldClass}
          />
        </div>
        <Button type="submit" disabled={isLoading} className="h-11 w-full" aria-busy={isLoading || undefined}>
          {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{' '}
        <Link href={`/signup/${role}`} className="font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Đăng ký
        </Link>
      </p>
    </AuthShell>
  )
}
