import { ArrowRight } from 'lucide-react'
import { InsightPanel } from '@/components/showcase/insight-panel'
import { LinkButton } from '@/components/ui/link-button'
import { METRICS } from '@/lib/content'

const POINTS = [
  {
    id: 'p1',
    title: 'Đọc trong 30 giây',
    body: 'Mỗi quiz có một đoạn ngắn bằng tiếng Việt. Không cần giải mã biểu đồ trước khi hành động.',
  },
  {
    id: 'p2',
    title: 'Biết ai cần trao đổi',
    body: 'Học sinh gặp khó được đánh dấu kèm câu hỏi làm khó họ, để cuộc nói chuyện bắt đầu nhanh.',
  },
  {
    id: 'p3',
    title: 'Báo cáo cho lãnh đạo',
    body: 'Xuất tiến độ học sinh sạch cho họp bộ môn và gặp phụ huynh.',
  },
]

export function InsightsSection() {
  return (
    <section
      id="insights"
      className="scroll-mt-20 border-y border-border bg-card/40"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Chấm xong rồi. Đây là việc thầy cô làm tiếp.
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              Một con số không đổi kế hoạch bài. Sau mỗi quiz bạn thấy điểm mạnh, lỗ hổng, và thứ cần dạy lại trước.
            </p>

            <ul className="mt-8 space-y-6">
              {POINTS.map((point) => (
                <li key={point.id} className="pl-0">
                  <h3 className="text-[15px] font-semibold text-foreground">
                    {point.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {point.body}
                  </p>
                </li>
              ))}
            </ul>

            <LinkButton
              href="/signup/teacher"
              variant="outline"
              className="mt-8 h-10 px-4"
            >
              Thử với lớp của bạn
              <ArrowRight className="size-4" aria-hidden="true" />
            </LinkButton>
          </div>

          <InsightPanel />
        </div>

        <dl className="mt-16 grid gap-4 border-t border-border pt-10 sm:grid-cols-3">
          {METRICS.map((metric) => (
            <div key={metric.id}>
              <dt className="font-mono text-3xl font-semibold tracking-tight text-foreground">
                {metric.value}
              </dt>
              <dd className="mt-1.5">
                <span className="block text-sm font-medium text-foreground">
                  {metric.label}
                </span>
                <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">
                  {metric.description}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
