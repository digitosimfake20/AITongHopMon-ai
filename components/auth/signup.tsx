'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { StudentAnimation } from './student-animation'
import { TeacherAnimation } from './teacher-animation'

interface SignupProps {
  role: 'student' | 'teacher'
  onSwitchToLogin: () => void
  onBack: () => void
}

export function Signup({ role, onSwitchToLogin, onBack }: SignupProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [classroomCode, setClassroomCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleFirstStep = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      alert('Mật khẩu không khớp!')
      return
    }
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)
    alert(`Đăng ký thành công với vai trò: ${role}`)
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
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Bước {step}/2
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {role === 'student' ? 'Đăng ký học sinh' : 'Đăng ký giáo viên'}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                {step === 1
                  ? 'Nhập email và mật khẩu'
                  : role === 'student'
                    ? 'Nhập mã lớp của thầy cô'
                    : 'Thầy cô sẽ xác nhận'}
              </p>
            </div>

            {step === 1 ? (
              <form onSubmit={handleFirstStep} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="signup-email"
                    className="mb-2 block text-sm font-semibold text-foreground"
                  >
                    {role === 'student' ? 'Email học sinh' : 'Email trường'}
                  </label>
                  <input
                    id="signup-email"
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
                    htmlFor="signup-password"
                    className="mb-2 block text-sm font-semibold text-foreground"
                  >
                    Mật khẩu
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="min-h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div>
                  <label
                    htmlFor="signup-confirm-password"
                    className="mb-2 block text-sm font-semibold text-foreground"
                  >
                    Xác nhận mật khẩu
                  </label>
                  <input
                    id="signup-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="min-h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <Button type="submit" className="mt-2 h-11 w-full text-base font-semibold">
                  Tiếp tục
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {role === 'student' && (
                  <div>
                    <label
                      htmlFor="signup-classroom-code"
                      className="mb-2 block text-sm font-semibold text-foreground"
                    >
                      Mã lớp học
                    </label>
                    <input
                      id="signup-classroom-code"
                      type="text"
                      value={classroomCode}
                      onChange={(e) => setClassroomCode(e.target.value.toUpperCase())}
                      required
                      placeholder="VD: MATH-2024"
                      className="min-h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Thầy cô của bạn sẽ cung cấp mã lớp
                    </p>
                  </div>
                )}

                {role === 'teacher' && (
                  <div className="rounded-lg border border-border bg-card p-5">
                    <p className="text-sm text-muted-foreground sm:text-base">
                      Tài khoản giáo viên của bạn sẽ được xác nhận bởi quản trị viên trường.
                      Vui lòng chờ xác nhận qua email.
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-11 flex-1 text-base font-semibold"
                  >
                    Quay lại
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-11 flex-1 text-base font-semibold"
                  >
                    {isLoading ? 'Đang đăng ký...' : 'Hoàn tất đăng ký'}
                  </Button>
                </div>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground sm:text-base">
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="min-h-11 font-semibold text-accent hover:underline"
              >
                Đăng nhập
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
