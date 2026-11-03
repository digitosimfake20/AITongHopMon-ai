import { Check } from 'lucide-react'
import { Section } from '@/components/layout/section'
import { WORKFLOW_STEPS } from '@/lib/content'
import type { WorkflowStep } from '@/lib/types'
import { cn } from '@/lib/utils'

export function WorkflowSection() {
  return (
    <Section
      id="how-it-works"
      title="Ba bước trong một tiết"
      description="Đăng ký xong là giao được quiz đầu trong mười phút."
    >
      <ol className="relative grid gap-8 md:grid-cols-3 md:gap-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 top-5 hidden h-px bg-border md:block"
        />
        {WORKFLOW_STEPS.map((step) => (
          <li key={step.id} className="relative">
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
    <div className="relative flex h-full flex-col">
      <div className="relative z-10 flex items-center gap-3">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background font-mono text-sm font-semibold text-foreground',
          )}
        >
          {step.step}
        </span>
        <span className="flex size-9 items-center justify-center rounded-md bg-foreground text-background md:hidden">
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
      </div>
      <h3 className="mt-5 text-base font-semibold text-foreground">
        {step.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {step.description}
      </p>
      <ul className="mt-5 space-y-2.5">
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
