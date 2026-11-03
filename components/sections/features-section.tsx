import { Section } from '@/components/layout/section'
import { FEATURES } from '@/lib/content'
import type { Feature } from '@/lib/types'

export function FeaturesSection() {
  return (
    <Section
      id="features"
      title="Đủ cho một bài kiểm tra 15 phút"
      description="Soạn đề, chấm bài, rồi biết học sinh nào cần gặp riêng."
    >
      <ul className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <li key={feature.id} className="bg-card">
            <FeatureCard feature={feature} />
          </li>
        ))}
      </ul>
    </Section>
  )
}

interface FeatureCardProps {
  feature: Feature
}

function FeatureCard({ feature }: FeatureCardProps) {
  const Icon = feature.icon

  return (
    <div className="group h-full p-5 transition-colors duration-200 hover:bg-secondary/60 sm:p-6">
      <span className="flex size-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors duration-200 group-hover:border-foreground/25 group-hover:text-foreground">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-[15px] font-semibold text-card-foreground">
        {feature.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {feature.description}
      </p>
    </div>
  )
}
