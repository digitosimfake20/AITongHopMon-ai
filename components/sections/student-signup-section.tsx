import { ArrowRight, BookOpen } from 'lucide-react'
import { Section } from '@/components/layout/section'
import { LinkButton } from '@/components/ui/link-button'

export function StudentSignupSection() {
  return (
    <Section
      id="student-signup"
      title="Học sinh tham gia lớp bằng mã"
      description="Đăng ký tài khoản, nhập mã 8 ký tự từ thầy cô, rồi vào làm bài."
    >
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-border bg-card px-6 py-10 text-center sm:px-10">
          <BookOpen
            className="mx-auto size-8 text-foreground/70"
            aria-hidden="true"
          />
          <h3 className="mt-4 text-xl font-semibold text-foreground">
            Nhập mã lớp để vào đúng lớp của thầy cô.
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Tạo tài khoản học sinh, rồi nhập mã trên trang onboarding để vào đúng lớp.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LinkButton href="/signup/student" className="h-11 w-full px-5 sm:w-auto">
              Đăng ký học sinh
              <ArrowRight className="size-4" aria-hidden="true" />
            </LinkButton>
            <LinkButton
              href="/login/student"
              variant="outline"
              className="h-11 w-full px-5 sm:w-auto"
            >
              Đã có tài khoản
            </LinkButton>
          </div>
        </div>
      </div>
    </Section>
  )
}
