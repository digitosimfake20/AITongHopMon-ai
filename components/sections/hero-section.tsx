import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { ProductDemo } from '@/components/hero/product-demo'
import { LinkButton } from '@/components/ui/link-button'

const PROOF_POINTS = [
  'Miễn phí cho 1 Lớp',
  'Không cần thẻ tín dụng',
  'Thiết lập trong 5 phút',
]

export function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="grid-lines mask-fade-b pointer-events-none absolute inset-x-0 top-0 h-[32rem] opacity-[0.5]"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
            Chấm bài tự động &amp; Phân tích lỗ hổng kiến thức Toán cho nhà trường
          </span>

          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Bài kiểm tra tự chấm điểm và chỉ rõ thầy cô cần dạy lại phần nào
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Học sinh làm bài Quiz Toán, nhận ngay kết quả. Thầy cô nhận báo cáo chi tiết và bản tóm tắt AI về mức độ hiểu bài của cả lớp chỉ trong 2 giây.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LinkButton
              href="#cta"
              className="h-11 w-full px-5 text-[15px] sm:w-auto"
            >
              Dùng thử miễn phí cho 1 Lớp
              <ArrowRight className="size-4" aria-hidden="true" />
            </LinkButton>
            <LinkButton
              href="#how-it-works"
              variant="outline"
              className="h-11 w-full px-5 text-[15px] sm:w-auto"
            >
              Cách hoạt động
            </LinkButton>
          </div>

          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {PROOF_POINTS.map((point) => (
              <li
                key={point}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <Check className="size-3.5 text-accent" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto mt-14 max-w-3xl sm:mt-16">
          <ProductDemo />
        </div>
      </div>
    </section>
  )
}
