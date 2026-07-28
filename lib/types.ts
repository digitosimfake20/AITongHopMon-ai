import type { LucideIcon } from 'lucide-react'

export interface NavLink {
  label: string
  href: string
}

export interface Feature {
  id: string
  title: string
  description: string
  icon: LucideIcon
}

export interface WorkflowStep {
  id: string
  step: number
  title: string
  description: string
  icon: LucideIcon
  bullets: string[]
}

export interface Metric {
  id: string
  value: string
  label: string
  description: string
}

export interface Testimonial {
  id: string
  quote: string
  name: string
  role: string
  school: string
  initials: string
}

export type BillingPeriod = 'monthly' | 'yearly'

export interface PricingPlan {
  id: string
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  unit: string
  features: string[]
  highlighted?: boolean
  ctaLabel: string
}

export interface FaqItem {
  id: string
  question: string
  answer: string
}

export interface QuizOption {
  id: string
  label: string
  correct?: boolean
}

export interface QuizQuestion {
  id: string
  prompt: string
  topic: string
  options: QuizOption[]
}

export type DemoStage = 'quiz' | 'score' | 'teacher'
