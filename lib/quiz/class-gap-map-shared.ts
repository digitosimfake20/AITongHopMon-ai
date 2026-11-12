/**
 * Client-safe gap-map types + pure helpers.
 * Keep prisma / next/cache out of this module so Client Components can import it.
 */
import {
  type MasteryStatus,
} from '@/lib/knowledge/topic-clusters'
import type { QuestionType } from '@/lib/quiz/types'

export interface ClassGapMapStats {
  studentCount: number
  classAverage: number
  completionRate: number
  /** HS×bài đã có ít nhất một lượt nộp / HS×bài được giao */
  completionDetail: { completedSlots: number; expectedSlots: number }
  needsAttentionCount: number
  /** How metrics on this page are computed (not BKT pMastery). */
  aggregationNote: string
}

export interface TopicMasteryRow {
  topic: string
  clusterId: string
  masteryPercent: number
  status: MasteryStatus
  weakStudentCount: number
  totalAttempts: number
}

export interface TopicClusterSummary {
  clusterId: string
  label: string
  topicCount: number
  avgMastery: number
  weakTopics: number
  masteredTopics: number
}

export interface GapStudentChip {
  id: string
  fullName: string
  initials: string
}

export interface CriticalGap {
  id: string
  /** Distinct headline (question stem), not only topic label */
  title: string
  topic: string
  questionType: QuestionType
  wrongPercent: number
  description: string
  sampleQuestion: string
  commonMistake: string | null
  affectedStudents: GapStudentChip[]
}

export interface StudentTierMember {
  id: string
  fullName: string
  initials: string
  avgScore: number
  strongTopics: string[]
}

export interface StudentTierGroup {
  id: 'excellent' | 'good' | 'needsSupport'
  label: string
  description: string
  students: StudentTierMember[]
  percent: number
}

export interface ClassStrengthRow {
  topic: string
  masteryPercent: number
  masteredStudentCount: number
}

export interface ClassGapMapData {
  className: string
  subject: string
  grade: string
  chapterHint: string
  stats: ClassGapMapStats
  strengths: ClassStrengthRow[]
  topicMastery: TopicMasteryRow[]
  topicClusters: TopicClusterSummary[]
  criticalGaps: CriticalGap[]
  tierGroups: StudentTierGroup[]
}

/** Parse grade digit(s) from class name like "9A2" / "10B"; default 8. */
export function inferGrade(className: string): string {
  const match = className.match(/\b([6-9]|1[0-2])[A-Za-z]/i)
  return match?.[1] ?? '8'
}

/** Quiz-avg tier bands used on the class gap map (not BKT). */
export function studentTierFromAvg(
  avg: number,
): 'excellent' | 'good' | 'needsSupport' {
  if (avg >= 8.5) return 'excellent'
  if (avg >= 5) return 'good'
  return 'needsSupport'
}

/** % of class that missed a question (≥1 wrong), one decimal. */
export function gapWrongPercent(
  affectedStudentCount: number,
  classStudentCount: number,
): number {
  return classStudentCount > 0
    ? Math.round((affectedStudentCount / classStudentCount) * 1000) / 10
    : 0
}

export function tierGroupPercent(count: number, studentCount: number): number {
  return studentCount > 0 ? Math.round((count / studentCount) * 100) : 0
}

/** Topic for needs-support remedial CTA: weakest GAP, else worst critical gap. */
export function pickNeedsSupportRemedialTopic(input: {
  topicMastery: Array<Pick<TopicMasteryRow, 'topic' | 'status' | 'masteryPercent'>>
  criticalGaps: Array<Pick<CriticalGap, 'topic' | 'wrongPercent'>>
}): string | null {
  const weakestGap = [...input.topicMastery]
    .filter((row) => row.status === 'GAP' && row.topic.trim())
    .sort((a, b) => a.masteryPercent - b.masteryPercent)[0]
  if (weakestGap) return weakestGap.topic

  const worstCritical = [...input.criticalGaps]
    .filter((gap) => gap.topic.trim())
    .sort((a, b) => b.wrongPercent - a.wrongPercent)[0]
  return worstCritical?.topic ?? null
}
