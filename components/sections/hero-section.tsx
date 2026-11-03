import { ArrowRight, Check } from 'lucide-react'
import { ProductDemo } from '@/components/hero/product-demo'
import { LinkButton } from '@/components/ui/link-button'
import { SITE_NAME } from '@/lib/content'

const PROOF_POINTS = [
  'Miễn phí cho 1 lớp',
  'Không cần thẻ tín dụng',
  'Thiết lập trong 5 phút',
]

export function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--foreground)_6%,transparent),transparent_70%)]"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
            {SITE_NAME}
          </p>

          <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Quiz Toán tự chấm. Biết ngay ai đang kẹt.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Học sinh nộp bài là có điểm. Thầy cô nhận báo cáo lớp và tóm tắt AI trong vài giây.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LinkButton
              href="/signup"
              className="h-11 w-full px-5 text-[15px] sm:w-auto"
            >
              Dùng thử miễn phí
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
                <Check className="size-3.5 text-foreground/70" aria-hidden="true" />
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
