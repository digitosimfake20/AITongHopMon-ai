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
  id: string
  title: string
  deadline?: string
  status: 'pending' | 'completed'
  score?: string
  /** Submission ID used to link to the result/AI-analysis page */
  submissionId?: string
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
}
