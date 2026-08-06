'use client'

import { useMemo, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { QuizCard } from '@/components/student/quiz-card'
import type { QuizBankItem } from '@/lib/quiz/quiz-bank-queries'
import {
  isPracticeQuizItem,
  resolveAdaptiveQuizStatus,
  resolveStandardQuizStatus,
} from '@/lib/quiz/quiz-display-status'
import { getSavedPracticeQuizzes } from '@/lib/quiz/active-quiz-session'
import { useEffect } from 'react'

interface QuizzesListClientProps {
  quizzes: QuizBankItem[]
}

function groupBySubject(items: QuizBankItem[]) {
  const map = new Map<string, QuizBankItem[]>()
  for (const q of items) {
    const key = q.subject || 'Khác'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(q)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'vi'))
}

function groupByTopic(items: QuizBankItem[]) {
  const map = new Map<string, QuizBankItem[]>()
  for (const q of items) {
    const key = q.topic?.trim() || 'Chưa phân loại'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(q)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'vi'))
}

function filterByStatus(items: QuizBankItem[], status: string) {
  return items.filter((q) => {
    const resolved = q.isAdaptiveGroup
      ? resolveAdaptiveQuizStatus(q)
      : resolveStandardQuizStatus(q)
    if (status === 'completed') return resolved.isDone
    if (status === 'pending') return !resolved.isDone && resolved.canTake
    if (status === 'overdue') return resolved.statusLabel === 'Quá hạn'
    return true
  })
}

export function QuizzesListClient({ quizzes }: QuizzesListClientProps) {
  const [savedIds, setSavedIds] = useState<string[]>([])

  useEffect(() => {
    setSavedIds(getSavedPracticeQuizzes().map((q) => q.testId))
  }, [])

  const assigned = useMemo(
    () => quizzes.filter((q) => !isPracticeQuizItem(q)),
    [quizzes],
  )
  const practiceFromDb = useMemo(
    () => quizzes.filter((q) => isPracticeQuizItem(q)),
    [quizzes],
  )
  const savedPractice = useMemo(() => {
    const saved = getSavedPracticeQuizzes()
    const byId = new Map(quizzes.map((q) => [q.testId, q]))
    return saved
      .map((s) => byId.get(s.testId))
      .filter(Boolean) as QuizBankItem[]
  }, [quizzes, savedIds])

  const allPractice = useMemo(() => {
    const ids = new Set<string>()
    const merged: QuizBankItem[] = []
    for (const q of [...practiceFromDb, ...savedPractice]) {
      if (!ids.has(q.testId)) {
        ids.add(q.testId)
        merged.push(q)
      }
    }
    return merged
  }, [practiceFromDb, savedPractice])

  if (quizzes.length === 0 && allPractice.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <BookOpen className="mx-auto size-10 text-muted-foreground/50" aria-hidden />
        <p className="mt-4 font-medium text-muted-foreground">
          Chưa có bài kiểm tra nào được giao.
        </p>
      </div>
    )
  }

  return (
    <Tabs defaultValue="all" className="space-y-4">
      <TabsList className="flex h-auto flex-wrap gap-1">
        <TabsTrigger value="all">Tất cả ({assigned.length})</TabsTrigger>
        <TabsTrigger value="subject">Theo môn</TabsTrigger>
        <TabsTrigger value="status">Trạng thái</TabsTrigger>
        <TabsTrigger value="later">Làm sau ({allPractice.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="all">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assigned.map((quiz) => (
            <QuizCard key={quiz.classTestId ?? quiz.testId} quiz={quiz} />
          ))}
        </div>
      </TabsContent>

      <TabsContent value="subject">
        <Accordion defaultValue={groupBySubject(assigned).map(([s]) => s)} className="space-y-2">
          {groupBySubject(assigned).map(([subject, items]) => (
            <AccordionItem key={subject} value={subject} className="rounded-xl border px-4">
              <AccordionTrigger className="hover:no-underline">
                {subject} ({items.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 pb-2 sm:grid-cols-2">
                  {items.map((quiz) => (
                    <QuizCard key={quiz.classTestId ?? quiz.testId} quiz={quiz} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </TabsContent>

      <TabsContent value="status" className="space-y-6">
        {(['pending', 'completed', 'overdue'] as const).map((status) => {
          const items = filterByStatus(assigned, status)
          const labels = {
            pending: 'Cần làm',
            completed: 'Đã hoàn thành',
            overdue: 'Quá hạn',
          }
          if (items.length === 0) return null
          return (
            <section key={status}>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
                {labels[status]} ({items.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((quiz) => (
                  <QuizCard key={quiz.classTestId ?? quiz.testId} quiz={quiz} />
                ))}
              </div>
            </section>
          )
        })}
      </TabsContent>

      <TabsContent value="later">
        {allPractice.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Chưa có bài luyện thêm. Hãy thử gợi ý từ Zeno trên Dashboard!
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {allPractice.map((quiz) => (
              <QuizCard key={quiz.testId} quiz={quiz} isPractice />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
