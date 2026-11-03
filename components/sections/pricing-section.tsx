import { Check } from 'lucide-react'
import { Section } from '@/components/layout/section'
import { LinkButton } from '@/components/ui/link-button'
import { PRICING_PLANS } from '@/lib/content'
import type { PricingPlan } from '@/lib/types'
import { cn } from '@/lib/utils'

export function PricingSection() {
  return (
    <Section
      id="pricing"
      title="Dùng miễn phí cho một lớp; nâng cấp khi tổ chia sẻ ngân hàng đề."
      description="Starter và Pro đều chấm tức thì và có báo cáo. Gói Toàn trường theo nhu cầu trường."
    >
      <ul className="mt-2 grid items-start gap-4 lg:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <li key={plan.id}>
            <PlanCard plan={plan} />
          </li>
        ))}
      </ul>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Trường công và chính sách đặc biệt: đăng ký giáo viên để trao đổi.
      </p>
    </Section>
  )
}

interface PlanCardProps {
  plan: PricingPlan
}

function PlanCard({ plan }: PlanCardProps) {
  const isNumericPrice = plan.id !== 'school' && plan.id !== 'starter'
  const price = plan.monthlyPrice
  const unit = isNumericPrice ? 'VNĐ / giáo viên / tháng' : plan.unit
  return (
    <div
      className={cn(
        'relative flex h-full flex-col rounded-xl border bg-card p-6 transition-colors duration-200',
        plan.highlighted
          ? 'border-foreground/50 bg-secondary/40'
          : 'border-border hover:border-foreground/25',
      )}
    >
      {plan.highlighted ? (
        <span className="absolute -top-3 left-6 rounded-md bg-foreground px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-background">
          Phổ biến
        </span>
      ) : null}

      <h3 className="text-[15px] font-semibold text-card-foreground">
        {plan.name}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        {plan.description}
      </p>

      <div className="mt-6">
        {isNumericPrice ? (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight text-foreground">
              {price.toLocaleString('vi-VN')}
            </span>
            <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
          </div>
        ) : (
          <span className="text-3xl font-semibold tracking-tight text-foreground">
            {unit}
          </span>
        )}
      </div>

      <LinkButton
        href="/signup/teacher"
        variant={plan.highlighted ? 'default' : 'outline'}
        className="mt-6 h-10 w-full"
      >
        {plan.ctaLabel}
      </LinkButton>

      <ul className="mt-6 space-y-2.5 border-t border-border pt-6">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <Check
              className="mt-0.5 size-3.5 shrink-0 text-foreground/70"
              aria-hidden="true"
            />
            <span className="text-[13px] leading-relaxed text-muted-foreground">
              {feature}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
