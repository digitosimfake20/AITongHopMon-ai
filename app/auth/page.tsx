'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Login } from '@/components/auth/login'
import { Signup } from '@/components/auth/signup'
import { GraduationCap, School } from 'lucide-react'

export default function AuthPage() {
  const [view, setView] = useState<'login' | 'signup'>('login')
  const [role, setRole] = useState<'student' | 'teacher' | null>(null)

  if (role) {
    return view === 'login' ? (
      <Login
        role={role}
        onSwitchToSignup={() => setView('signup')}
        onBack={() => setRole(null)}
      />
    ) : (
      <Signup
        role={role}
        onSwitchToLogin={() => setView('login')}
        onBack={() => setRole(null)}
      />
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-xl font-bold tracking-tight text-foreground"
        >
          Mathz
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Chào mừng đến Mathz
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Chọn vai trò của bạn để tiếp tục
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setRole('student')
                setView('login')
              }}
              className="flex min-h-44 flex-col items-center justify-center rounded-xl border-2 border-border bg-card p-6 text-center transition-colors duration-200 hover:border-accent hover:bg-accent/5"
            >
              <GraduationCap className="size-10 text-accent" aria-hidden="true" />
              <h2 className="mt-3 font-semibold text-foreground">Học sinh</h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Đăng nhập hoặc đăng ký
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setRole('teacher')
                setView('login')
              }}
              className="flex min-h-44 flex-col items-center justify-center rounded-xl border-2 border-border bg-card p-6 text-center transition-colors duration-200 hover:border-accent hover:bg-accent/5"
            >
              <School className="size-10 text-accent" aria-hidden="true" />
              <h2 className="mt-3 font-semibold text-foreground">Giáo viên</h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Đăng nhập hoặc đăng ký
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
