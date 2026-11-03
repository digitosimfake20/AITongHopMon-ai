import { Check } from 'lucide-react'
import { Section } from '@/components/layout/section'
import { WORKFLOW_STEPS } from '@/lib/content'
import type { WorkflowStep } from '@/lib/types'

export function WorkflowSection() {
  return (
    <Section
      id="how-it-works"
      title="Ba bước trong một tiết"
      description="Đăng ký xong, nhiều giáo viên giao quiz đầu trong mười phút."
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
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-6 transition-colors duration-200 hover:border-foreground/25">
      <div className="flex items-center justify-between">
        <span className="flex size-9 items-center justify-center rounded-md bg-foreground text-background">
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
        <span className="font-mono text-xs font-medium tabular-nums text-muted-foreground">
          {step.step}/3
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
              className="mt-0.5 size-3.5 shrink-0 text-foreground/70"
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
