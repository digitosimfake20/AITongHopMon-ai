import { ArrowRight } from 'lucide-react'
import { LinkButton } from '@/components/ui/link-button'

export function CtaSection() {
  return (
    <section id="cta" className="scroll-mt-20 px-4 pb-24 sm:px-6">
      <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-card px-6 py-14 text-center sm:px-10 sm:py-16">
        <div className="relative">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Chạy bài kiểm tra tiếp theo trên Mathz
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-pretty leading-relaxed text-muted-foreground">
            Miễn phí cho một lớp. Dùng câu hỏi riêng hoặc để AI soạn. Kết quả và tóm tắt sẵn trước khi hết tiết.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LinkButton href="/signup/teacher" className="h-11 px-5 text-[15px]">
              Đăng ký giáo viên
              <ArrowRight className="size-4" aria-hidden="true" />
            </LinkButton>
            <LinkButton
              href="/signup/student"
              variant="outline"
              className="h-11 px-5 text-[15px]"
            >
              Đăng ký học sinh
            </LinkButton>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Không cần thẻ tín dụng · Dữ liệu học đường tách biệt
          </p>
        </div>
      </div>
    </section>
  )
}
