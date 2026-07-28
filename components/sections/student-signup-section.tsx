'use client'

import { useState } from 'react'
import { ArrowRight, BookOpen, Lock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/layout/section'

export function StudentSignupSection() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [classCode, setClassCode] = useState('')
  const [step, setStep] = useState<'intro' | 'signup' | 'join'>('intro')

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault()
    if (email && password) {
      setStep('join')
      setEmail('')
      setPassword('')
    }
  }

  const handleJoinClass = (e: React.FormEvent) => {
    e.preventDefault()
    if (classCode) {
      // In a real app, this would submit to your backend
      console.log('Joining classroom with code:', classCode)
      setClassCode('')
      setStep('intro')
      setIsExpanded(false)
    }
  }

  return (
    <Section
      id="student-signup"
      eyebrow="Cho Học Sinh"
      title="Tham gia lớp học của bạn"
      description="Học sinh đăng ký tài khoản và nhập mã lớp để tham gia vào các bài kiểm tra"
    >
      <div className="mx-auto max-w-2xl">
        {!isExpanded ? (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/5 to-accent/10 p-8 text-center transition-all duration-300 hover:border-accent/50 hover:shadow-[0_16px_40px_-20px_rgba(16,185,129,0.15)]"
          >
            <div className="flex items-center justify-center gap-3">
              <BookOpen className="size-6 text-accent" aria-hidden="true" />
              <span className="text-lg font-semibold text-foreground">
                Học sinh? Nhấp để tham gia lớp học
              </span>
              <ArrowRight className="size-5 text-accent" aria-hidden="true" />
            </div>
          </button>
        ) : (
          <div className="space-y-6 rounded-2xl border border-border bg-card p-8">
            {step === 'intro' && (
              <div className="space-y-4 text-center">
                <h3 className="text-2xl font-semibold text-foreground">
                  Đăng ký tài khoản học sinh
                </h3>
                <p className="text-sm text-muted-foreground">
                  Sau đó nhập mã lớp để tham gia các bài kiểm tra của thầy cô
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2 text-left">
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <div className="flex items-center gap-2">
                      <Lock className="size-4 text-accent" aria-hidden="true" />
                      <span className="text-xs font-medium text-foreground">
                        Tài khoản an toàn
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-accent" aria-hidden="true" />
                      <span className="text-xs font-medium text-foreground">
                        Kết nối lớp
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => setStep('signup')}
                  className="mt-4 w-full"
                >
                  Bắt đầu đăng ký
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                >
                  Hủy
                </button>
              </div>
            )}

            {step === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label
                    htmlFor="student-email"
                    className="block text-sm font-medium text-foreground"
                  >
                    Email học sinh
                  </label>
                  <input
                    id="student-email"
                    type="email"
                    required
                    placeholder="hocsinh@truong.edu.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors hover:border-foreground/20 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="student-password"
                    className="block text-sm font-medium text-foreground"
                  >
                    Mật khẩu
                  </label>
                  <input
                    id="student-password"
                    type="password"
                    required
                    placeholder="Tạo mật khẩu an toàn"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors hover:border-foreground/20 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Tiếp tục
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>

                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                >
                  Hủy
                </button>
              </form>
            )}

            {step === 'join' && (
              <form onSubmit={handleJoinClass} className="space-y-4">
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    Nhập mã lớp học
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Thầy cô sẽ cung cấp mã lớp. Nhập mã để tham gia các bài kiểm tra.
                  </p>
                  <label
                    htmlFor="class-code"
                    className="block text-sm font-medium text-foreground"
                  >
                    Mã lớp
                  </label>
                  <input
                    id="class-code"
                    type="text"
                    required
                    placeholder="VD: MATH-2024"
                    value={classCode}
                    onChange={(e) =>
                      setClassCode(e.target.value.toUpperCase())
                    }
                    maxLength={10}
                    className="mt-2 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-center text-sm font-mono uppercase text-foreground placeholder:text-muted-foreground transition-colors hover:border-foreground/20 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Tham gia lớp
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>

                <button
                  type="button"
                  onClick={() => setStep('signup')}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                >
                  Quay lại
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </Section>
  )
}
