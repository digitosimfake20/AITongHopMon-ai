import { Check } from 'lucide-react'
import { Section } from '@/components/layout/section'
import { WORKFLOW_STEPS } from '@/lib/content'
import type { WorkflowStep } from '@/lib/types'

export function WorkflowSection() {
  return (
    <Section
      id="how-it-works"
      eyebrow="Cách hoạt động"
      title="3 bước đơn giản trong một tiết học"
      description="Không cần tập huấn. Hầu hết giáo viên chạy bài kiểm tra đầu tiên chỉ trong mười phút sau khi đăng ký."
    >
      <ol className="grid gap-4 md:grid-cols-3">
        {WORKFLOW_STEPS.map((step) => (
          <li key={step.id}>
            <StepCard step={step} />
          </li>
        ))}
      </ol>
    </Section>
  )
}

interface StepCardProps {
  step: WorkflowStep
}

function StepCard({ step }: StepCardProps) {
  const Icon = step.icon

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-colors duration-300 hover:border-accent/30">
      <div className="flex items-center justify-between">
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
        <span className="font-mono text-xs font-medium text-muted-foreground">
          0{step.step}
        </span>
      </div>
      <h3 className="mt-5 text-base font-semibold text-card-foreground">
        {step.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {step.description}
      </p>
      <ul className="mt-5 space-y-2.5 border-t border-border pt-5">
        {step.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2.5">
            <Check
              className="mt-0.5 size-3.5 shrink-0 text-accent"
              aria-hidden="true"
            />
            <span className="text-[13px] leading-relaxed text-muted-foreground">
              {bullet}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
