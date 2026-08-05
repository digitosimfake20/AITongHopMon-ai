import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import type { SystemTestSummary } from '@/app/actions/system-test'
import type { TestGroupSummary } from '@/app/actions/test-group'

type SystemTestRow = {
  id: string
  title: string
  subject: string
  grade: string
  duration_minutes: number
  is_system: boolean
  created_at: Date
  question_count: number
}

type TestGroupRow = {
  id: string
  title: string
  subject: string
  grade: string
  topic: string
  description: string | null
  created_at: Date
  easy_count: number
  medium_count: number
  hard_count: number
  duration_minutes: number
  assigned_class_count: number
}

function subjectClause(subject?: string): Prisma.Sql {
  return subject ? Prisma.sql`AND tg.subject = ${subject}` : Prisma.empty
}

function gradeClause(grade?: string): Prisma.Sql {
  return grade ? Prisma.sql`AND tg.grade = ${grade}` : Prisma.empty
}

function subjectClauseSt(subject?: string): Prisma.Sql {
  return subject ? Prisma.sql`AND st.subject = ${subject}` : Prisma.empty
}

function gradeClauseSt(grade?: string): Prisma.Sql {
  return grade ? Prisma.sql`AND st.grade = ${grade}` : Prisma.empty
}

export function mapSystemTestRows(rows: SystemTestRow[]): SystemTestSummary[] {
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    subject: r.subject,
    grade: r.grade,
    durationMinutes: r.duration_minutes,
    questionCount: r.question_count,
    isSystem: r.is_system,
    createdAt: r.created_at.toISOString(),
  }))
}

export function mapTestGroupRows(rows: TestGroupRow[]): TestGroupSummary[] {
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    subject: r.subject,
    grade: r.grade,
    topic: r.topic,
    description: r.description,
    easyQuestionCount: r.easy_count,
    mediumQuestionCount: r.medium_count,
    hardQuestionCount: r.hard_count,
    durationMinutes: r.duration_minutes,
    assignedClassCount: r.assigned_class_count,
    createdAt: r.created_at.toISOString(),
  }))
}

export function systemTestsQuery(filters?: { subject?: string; grade?: string }) {
  return prisma.$queryRaw<SystemTestRow[]>`
    SELECT
      st.id,
      st.title,
      st.subject,
      st.grade,
      st.duration_minutes,
      st.is_system,
      st.created_at,
      st.question_count
    FROM core.system_tests st
    WHERE st.is_system = true
      AND st.group_id IS NULL
      ${subjectClauseSt(filters?.subject)}
      ${gradeClauseSt(filters?.grade)}
    ORDER BY st.subject ASC, st.created_at DESC
  `
}

export function testGroupsQuery(filters?: { subject?: string; grade?: string }) {
  return prisma.$queryRaw<TestGroupRow[]>`
    SELECT
      tg.id,
      tg.title,
      tg.subject,
      tg.grade,
      tg.topic,
      tg.description,
      tg.created_at,
      COALESCE(MAX(CASE WHEN st.difficulty = 'EASY'::core."DifficultyLevel" THEN st.question_count END), 0)::int AS easy_count,
      COALESCE(MAX(CASE WHEN st.difficulty = 'MEDIUM'::core."DifficultyLevel" THEN st.question_count END), 0)::int AS medium_count,
      COALESCE(MAX(CASE WHEN st.difficulty = 'HARD'::core."DifficultyLevel" THEN st.question_count END), 0)::int AS hard_count,
      COALESCE(MAX(CASE WHEN st.difficulty = 'MEDIUM'::core."DifficultyLevel" THEN st.duration_minutes END), 15)::int AS duration_minutes,
      COUNT(DISTINCT ct.id)::int AS assigned_class_count
    FROM core.test_groups tg
    LEFT JOIN core.system_tests st ON st.group_id = tg.id
    LEFT JOIN core.class_tests ct ON ct.test_group_id = tg.id
    WHERE 1 = 1
      ${subjectClause(filters?.subject)}
      ${gradeClause(filters?.grade)}
    GROUP BY tg.id
    ORDER BY tg.subject ASC, tg.created_at DESC
  `
}

export async function fetchSystemTestSummaries(filters?: {
  subject?: string
  grade?: string
}): Promise<SystemTestSummary[]> {
  const rows = await systemTestsQuery(filters)
  return mapSystemTestRows(rows)
}

export async function fetchTestGroupSummaries(filters?: {
  subject?: string
  grade?: string
}): Promise<TestGroupSummary[]> {
  const rows = await testGroupsQuery(filters)
  return mapTestGroupRows(rows)
}

/** Batch DB reads for test-bank pages (single PgBouncer connection). */
export async function fetchTestBankListData(filters?: {
  subject?: string
  grade?: string
}) {
  const [testRows, groupRows] = await prisma.$transaction([
    systemTestsQuery(filters),
    testGroupsQuery(filters),
  ])
  return {
    tests: mapSystemTestRows(testRows),
    groups: mapTestGroupRows(groupRows),
  }
}
