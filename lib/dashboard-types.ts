import type { LucideIcon } from 'lucide-react'

export interface DashboardNavItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
}

export interface WeakTopic {
  id: string
  label: string
  accuracy: number
  severity: 'weak' | 'moderate'
}

export interface Assignment {
  /** Test to open (`/quiz/take/[id]`) — for adaptive, the next round’s test id */
  id: string
  title: string
  kind?: 'standard' | 'adaptive'
  subtitle?: string
  deadline?: string
  status: 'pending' | 'completed'
  score?: string
  statusHint?: string
  classTestId?: string
  /** Submission ID used to link to the result/AI-analysis page */
  submissionId?: string
}

export interface CognitiveProfileSummary {
  personaType: string
  avgSpeed: number
  carelessRate: number
  strengths: string[]
  weaknesses: string[]
}

export interface StudentDashboardData {
  studentName: string
  initials: string
  classLabel: string
  masteryScore: number
  masteryPercent: number
  completedQuizzes: number
  studyHours: number
  streakDays: number
  adaptiveChapter: string
  adaptiveTitle: string
  adaptiveDescription: string
  weakTopics: WeakTopic[]
  zenoInsight: string
  zenoUpdatedAt: string
  assignments: Assignment[]
  cognitiveProfile: CognitiveProfileSummary | null
}
