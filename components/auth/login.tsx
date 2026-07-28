'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { StudentAnimation } from './student-animation'
import { TeacherAnimation } from './teacher-animation'

interface LoginProps {
  role: 'student' | 'teacher'
  onSwitchToSignup: () => void
  onBack: () => void
}

export function Login({ role, onSwitchToSignup, onBack }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)
    alert(`Đăng nhập thành công với vai trò: ${role}`)
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden items-center justify-center border-r border-border bg-muted/20 p-8 xl:p-12 lg:flex">
        <div className="w-full max-w-lg">
          {role === 'student' ? <StudentAnimation /> : <TeacherAnimation />}
        </div>
      </div>

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-foreground"
          >
            Mathz
          </Link>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Quay lại
          </button>
        </header>

        <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {role === 'student' ? 'Đăng nhập học sinh' : 'Đăng nhập giáo viên'}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                {role === 'student'
                  ? 'Nhập email và mật khẩu để tiếp tục'
                  : 'Nhập email trường và mật khẩu'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-sm font-semibold text-foreground"
                >
                  {role === 'student' ? 'Email học sinh' : 'Email trường'}
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={
                    role === 'student' ? 'hocsinh@fpt.edu.vn' : 'thayco@truong.edu.vn'
                  }
                  className="min-h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="mb-2 block text-sm font-semibold text-foreground"
                >
                  Mật khẩu
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="min-h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="mt-2 h-11 w-full text-base font-semibold"
              >
                {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground sm:text-base">
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="min-h-11 font-semibold text-accent hover:underline"
              >
                Đăng ký
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
