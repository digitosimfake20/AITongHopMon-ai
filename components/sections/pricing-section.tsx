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
      title="Một lớp miễn phí. Mở rộng khi tổ cần."
      description="Mọi gói đều chấm tức thì và có báo cáo. Nâng cấp khi tổ chia sẻ ngân hàng đề."
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
        Trường công và chính sách đặc biệt: liên hệ để trao đổi.
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
    { id: 'yearly', label: 'Theo năm' },
  ]

  return (
    <div
      role="radiogroup"
      aria-label="Chu kỳ thanh toán"
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
  const isYearly = period === 'yearly'
  const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice
  const isNumericPrice = plan.id !== 'school' && plan.id !== 'starter'
  // Yearly total must use /năm — never reuse the monthly unit string.
  const unit = isNumericPrice
    ? isYearly
      ? 'VNĐ / giáo viên / năm'
      : 'VNĐ / giáo viên / tháng'
    : plan.unit
  const monthlyEquivalent =
    isNumericPrice && isYearly && plan.yearlyPrice > 0
      ? Math.round(plan.yearlyPrice / 12)
      : null

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
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight text-foreground">
                {price.toLocaleString('vi-VN')}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
            </div>
            {monthlyEquivalent !== null ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Tương đương {monthlyEquivalent.toLocaleString('vi-VN')} VNĐ / giáo
                viên / tháng khi trả theo năm
              </p>
            ) : null}
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
