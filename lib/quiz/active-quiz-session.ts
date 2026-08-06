'use client'

const SESSION_KEY = 'mathz-active-quiz'
const SAVED_KEY = 'mathz-saved-practice'

export interface ActiveQuizSession {
  testId: string
  testTitle: string
  startedAt: number
  timeLimitMinutes: number
  answers: Record<string, { type: string; value: unknown }>
}

export interface SavedPracticeQuiz {
  testId: string
  title: string
  topic: string
  questionCount: number
  timeLimitMinutes: number
  savedAt: number
}

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

export function getActiveQuizSession(): ActiveQuizSession | null {
  return readJson<ActiveQuizSession>(SESSION_KEY)
}

export function saveActiveQuizSession(session: ActiveQuizSession) {
  writeJson(SESSION_KEY, session)
}

export function patchActiveQuizAnswers(
  testId: string,
  answers: ActiveQuizSession['answers'],
) {
  const current = getActiveQuizSession()
  if (!current || current.testId !== testId) return
  saveActiveQuizSession({ ...current, answers })
}

export function startActiveQuizSession(
  testId: string,
  testTitle: string,
  timeLimitMinutes: number,
) {
  const existing = getActiveQuizSession()
  if (existing?.testId === testId) return existing

  const session: ActiveQuizSession = {
    testId,
    testTitle,
    startedAt: Date.now(),
    timeLimitMinutes,
    answers: {},
  }
  saveActiveQuizSession(session)
  removeSavedPractice(testId)
  return session
}

export function clearActiveQuizSession(testId?: string) {
  if (typeof window === 'undefined') return
  const current = getActiveQuizSession()
  if (testId && current?.testId !== testId) return
  localStorage.removeItem(SESSION_KEY)
}

export function getRemainingSeconds(session: ActiveQuizSession): number {
  const total = session.timeLimitMinutes * 60
  const elapsed = Math.floor((Date.now() - session.startedAt) / 1000)
  return Math.max(0, total - elapsed)
}

export function getSavedPracticeQuizzes(): SavedPracticeQuiz[] {
  return readJson<SavedPracticeQuiz[]>(SAVED_KEY) ?? []
}

export function addSavedPractice(quiz: SavedPracticeQuiz) {
  const list = getSavedPracticeQuizzes().filter((q) => q.testId !== quiz.testId)
  list.unshift(quiz)
  writeJson(SAVED_KEY, list.slice(0, 20))
}

export function removeSavedPractice(testId: string) {
  const list = getSavedPracticeQuizzes().filter((q) => q.testId !== testId)
  writeJson(SAVED_KEY, list)
}
