'use client'

import { Check } from 'lucide-react'
import { useState } from 'react'
import { Section } from '@/components/layout/section'
import { LinkButton } from '@/components/ui/link-button'
import { PRICING_PLANS } from '@/lib/content'
import type { BillingPeriod, PricingPlan } from '@/lib/types'
import { cn } from '@/lib/utils'

export function PricingSection() {
  const [period, setPeriod] = useState<BillingPeriod>('yearly')

  return (
    <Section
      id="pricing"
      eyebrow="Bảng giá"
      title="Miễn phí cho 1 Lớp • Công bằng cho toàn Trường"
      description="Mọi gói đều bao gồm chấm điểm tức thì và báo cáo chi tiết. Nâng cấp khi tổ chuyên môn muốn chia sẻ ngân hàng đề và báo cáo AI."
    >
      <div className="flex justify-center">
        <BillingToggle period={period} onChange={setPeriod} />
      </div>

      <ul className="mt-10 grid items-start gap-4 lg:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <li key={plan.id}>
            <PlanCard plan={plan} period={period} />
          </li>
        ))}
      </ul>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Các trường công lập & chính sách được hỗ trợ đặc biệt. Liên hệ để biết thêm.
      </p>
    </Section>
  )
}

interface BillingToggleProps {
  period: BillingPeriod
  onChange: (period: BillingPeriod) => void
}

function BillingToggle({ period, onChange }: BillingToggleProps) {
  const options: { id: BillingPeriod; label: string }[] = [
    { id: 'monthly', label: 'Theo tháng' },
    { id: 'yearly', label: 'Theo năm · Tiết kiệm 20%' },
  ]

  return (
    <div
      role="radiogroup"
      aria-label="Billing period"
      className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1"
    >
      {options.map((option) => {
        const active = period === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={cn(
              'rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

interface PlanCardProps {
  plan: PricingPlan
  period: BillingPeriod
}

function PlanCard({ plan, period }: PlanCardProps) {
  const price = period === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
  const isNumericPrice = plan.id !== 'school'

  return (
    <div
      className={cn(
        'relative flex h-full flex-col rounded-2xl border bg-card p-6 transition-all duration-300',
        plan.highlighted
          ? 'border-accent shadow-[0_20px_50px_-28px_rgba(16,185,129,0.2)]'
          : 'border-border hover:border-accent/30',
      )}
    >
      {plan.highlighted ? (
        <span className="absolute -top-3 left-6 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
          Phổ biến nhất
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
            <span className="text-xs text-muted-foreground ml-1">{plan.unit}</span>
          </div>
        ) : (
          <span className="text-3xl font-semibold tracking-tight text-foreground">
            {plan.unit}
          </span>
        )}
      </div>

      <LinkButton
        href="#cta"
        variant={plan.highlighted ? 'default' : 'outline'}
        className="mt-6 h-10 w-full"
      >
        {plan.ctaLabel}
      </LinkButton>

      <ul className="mt-6 space-y-2.5 border-t border-border pt-6">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <Check
              className="mt-0.5 size-3.5 shrink-0 text-primary"
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
