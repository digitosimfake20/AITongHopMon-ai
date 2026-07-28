import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { CtaSection } from '@/components/sections/cta-section'
import { FaqSection } from '@/components/sections/faq-section'
import { FeaturesSection } from '@/components/sections/features-section'
import { HeroSection } from '@/components/sections/hero-section'
import { InsightsSection } from '@/components/sections/insights-section'
import { StudentSignupSection } from '@/components/sections/student-signup-section'
import { WorkflowSection } from '@/components/sections/workflow-section'

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main>
        <HeroSection />
        <FeaturesSection />
        <WorkflowSection />
        <InsightsSection />
        <StudentSignupSection />
        <FaqSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  )
}
