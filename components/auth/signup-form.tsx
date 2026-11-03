'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { signUpAction } from '@/lib/auth/actions'
import type { AuthRole } from '@/lib/auth/types'
import { AuthShell } from './auth-shell'

interface SignupFormProps {
  role: AuthRole
}

export function SignupForm({ role }: SignupFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('role', role)
    const result = await signUpAction(formData)
    if (result?.success && result.data?.needsEmailConfirmation) {
      toast.success('Kiểm tra email để xác nhận tài khoản.')
      router.push('/login')
      return
    }
    if (result && !result.success) {
      toast.error(result.error ?? 'Đăng ký thất bại. Thử lại hoặc dùng email khác.')
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      role={role}
      title={role === 'student' ? 'Đăng ký học sinh' : 'Đăng ký giáo viên'}
      subtitle={
        role === 'student'
          ? 'Tạo tài khoản, rồi nhập mã lớp trên trang onboarding.'
          : 'Tạo tài khoản giáo viên để mở lớp và giao quiz.'
      }
      onBack={() => router.push('/signup')}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="fullName" className="mb-2 block text-sm font-semibold">
            Họ và tên
          </label>
          <input
            id="fullName"
            name="fullName"
            required
            autoComplete="name"
            placeholder="Nguyễn Văn A"
            className="min-h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="signup-email" className="mb-2 block text-sm font-semibold">
            Email
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={
              role === 'student' ? 'hocsinh@fpt.edu.vn' : 'thayco@truong.edu.vn'
            }
            className="min-h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="mb-2 block text-sm font-semibold">
            Mật khẩu
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Ít nhất 8 ký tự"
            className="min-h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold">
            Xác nhận mật khẩu
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            className="min-h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button type="submit" disabled={isLoading} className="h-11 w-full">
          {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Đã có tài khoản?{' '}
        <Link href={`/login/${role}`} className="font-semibold text-foreground underline-offset-4 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </AuthShell>
  )
}
