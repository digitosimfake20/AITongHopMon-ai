import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CtaSection() {
  return (
    <section id="cta" className="scroll-mt-20 px-4 pb-24 sm:px-6">
      <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-card px-6 py-14 text-center sm:px-10 sm:py-16">
        <div
          aria-hidden="true"
          className="grid-lines mask-fade-b pointer-events-none absolute inset-0 opacity-60"
        />
        <div className="relative">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Sẵn sàng chạy bài kiểm tra tiếp theo trên Mathz?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-pretty leading-relaxed text-muted-foreground">
            Miễn phí cho 1 Lớp vĩnh viễn. Sử dụng câu hỏi riêng hoặc để AI soạn — bạn sẽ có kết quả và bản tóm tắt trước khi tiết học kết thúc.
          </p>
          <form
            className="mx-auto mt-8 flex w-full max-w-md flex-col gap-2.5 sm:flex-row"
            action="#"
          >
            <label htmlFor="school-email" className="sr-only">
              Email trường học
            </label>
            <input
              id="school-email"
              name="email"
              type="email"
              required
              placeholder="tothanhhai@linux.vn"
              className="h-11 flex-1 rounded-lg border border-input bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors hover:border-foreground/20 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button type="submit" className="h-11 px-5 text-[15px]">
              Dùng thử miễn phí
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            Không cần thẻ tín dụng · Bảo mật dữ liệu theo quy định
          </p>
        </div>
      </div>
    </section>
  )
}
