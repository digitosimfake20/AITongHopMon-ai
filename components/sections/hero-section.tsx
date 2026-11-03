import { ArrowRight, Check } from 'lucide-react'
import { ProductDemo } from '@/components/hero/product-demo'
import { LinkButton } from '@/components/ui/link-button'
import { SITE_NAME } from '@/lib/content'

const PROOF_POINTS = ['Miễn phí cho 1 lớp', 'Không cần thẻ tín dụng']

export function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40 grid-lines"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--zeno)_10%,transparent),transparent_68%)]"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-balance text-5xl font-bold leading-[1.02] tracking-tight text-foreground sm:text-6xl md:text-7xl">
            {SITE_NAME}
          </h1>

          <p className="mt-5 text-balance text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl md:text-[1.75rem]">
            Quiz Toán tự chấm. Biết ngay ai đang kẹt.
          </p>

          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Học sinh nộp bài là có điểm. Thầy cô đọc báo cáo lớp trước khi hết
            tiết.
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
