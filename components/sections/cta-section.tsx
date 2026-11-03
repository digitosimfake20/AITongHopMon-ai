import { ArrowRight } from 'lucide-react'
import { LinkButton } from '@/components/ui/link-button'

export function CtaSection() {
  return (
    <section id="cta" className="scroll-mt-20 px-4 pb-24 sm:px-6">
      <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-border bg-foreground px-6 py-14 text-center text-background sm:px-10 sm:py-16">
        <div className="relative">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Chạy bài kiểm tra tiếp theo trên Mathz
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-pretty leading-relaxed text-background/70">
            Một lớp miễn phí. Dùng câu hỏi của bạn hoặc để AI soạn. Điểm và tóm
            tắt sẵn trước khi hết tiết.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LinkButton
              href="/signup/teacher"
              className="h-11 border-transparent bg-background px-5 text-[15px] text-foreground hover:bg-background/90 [a]:hover:bg-background/90"
            >
              Đăng ký giáo viên
              <ArrowRight className="size-4" aria-hidden="true" />
            </LinkButton>
            <LinkButton
              href="/signup/student"
              variant="outline"
              className="h-11 border-background/35 bg-transparent px-5 text-[15px] text-background hover:bg-background/10 hover:text-background dark:border-background/35 dark:bg-transparent dark:hover:bg-background/10"
            >
              Đăng ký học sinh
            </LinkButton>
          </div>
          <p className="mt-4 text-xs text-background/55">
            Không cần thẻ tín dụng · Dữ liệu học đường tách biệt
          </p>
        </div>
      </div>
    </section>
  )
}
