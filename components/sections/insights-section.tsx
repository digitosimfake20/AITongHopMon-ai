import { ArrowRight } from 'lucide-react'
import { InsightPanel } from '@/components/showcase/insight-panel'
import { LinkButton } from '@/components/ui/link-button'
import { METRICS } from '@/lib/content'

const POINTS = [
  {
    id: 'p1',
    title: 'Đọc trong 30 giây',
    body: 'Mỗi bài quiz tạo ra một đoạn ngắn bằng tiếng Việt — không cần giải mã biểu đồ trước khi hành động.',
  },
  {
    id: 'p2',
    title: 'Biết ai cần trao đổi',
    body: 'Học sinh gặp khó khăn được đánh dấu với câu hỏi cụ thể làm khó họ, giúp cuộc trò chuyện dễ dàng bắt đầu.',
  },
  {
    id: 'p3',
    title: 'Báo cáo cho lãnh đạo',
    body: 'Báo cáo tiến độ học sinh được xuất sạch cho các cuộc họp bộ môn và gặp phụ huynh.',
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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Dành cho Giáo viên
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Chấm xong bài rồi. Đây là những gì thầy cô cần làm tiếp theo.
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              Một con số không thay đổi kế hoạch bài học. Mathz chuyển mỗi kết quả thành một bức tranh rõ ràng về lớp — điểm mạnh, lỗ hổng, và thứ đáng dạy lại trước tiên.
            </p>

            <ul className="mt-8 space-y-6">
              {POINTS.map((point) => (
                <li key={point.id} className="border-l-2 border-border pl-4">
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
              href="#cta"
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
