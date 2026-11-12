'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { DemoStage } from '@/lib/types'

export interface DemoState {
  stage: DemoStage
  questionIndex: number
  selectedOptionId: string | null
  revealed: boolean
}

interface Frame {
  at: number
  state: Partial<DemoState>
}

const INITIAL_STATE: DemoState = {
  stage: 'quiz',
  questionIndex: 0,
  selectedOptionId: null,
  revealed: false,
}

/** Static end frame for prefers-reduced-motion (teacher summary). */
export const STATIC_DEMO_STATE: DemoState = {
  stage: 'teacher',
  questionIndex: 1,
  selectedOptionId: 'a',
  revealed: true,
}

/** One full loop of the story: student answers -> score pops -> teacher gets the AI summary. */
const FRAMES: Frame[] = [
  { at: 0, state: INITIAL_STATE },
  { at: 1000, state: { selectedOptionId: 'b' } },
  { at: 1600, state: { revealed: true } },
  {
    at: 2600,
    state: { questionIndex: 1, selectedOptionId: null, revealed: false },
  },
  { at: 3500, state: { selectedOptionId: 'a' } },
  { at: 4100, state: { revealed: true } },
  { at: 5100, state: { stage: 'score' } },
  { at: 8300, state: { stage: 'teacher' } },
]

const LOOP_DURATION = 14500

function subscribeReducedMotion(onStoreChange: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', onStoreChange)
  return () => media.removeEventListener('change', onStoreChange)
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )
}

/**
 * Drives the scripted hero demo. Runs only while the demo is on screen so the
 * page stays cheap when the user has scrolled past it. Honors pause + reduced motion.
 */
export function useDemoSequence(
  active: boolean,
  { paused = false, reducedMotion = false } = {},
) {
  const [state, setState] = useState<DemoState>(
    reducedMotion ? STATIC_DEMO_STATE : INITIAL_STATE,
  )
  const [loop, setLoop] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (reducedMotion) {
      for (const timer of timers.current) clearTimeout(timer)
      timers.current = []
      queueMicrotask(() => setState(STATIC_DEMO_STATE))
      return
    }

    if (!active || paused) {
      for (const timer of timers.current) clearTimeout(timer)
      timers.current = []
      return
    }

    const clearAll = () => {
      for (const timer of timers.current) clearTimeout(timer)
      timers.current = []
    }

    const run = () => {
      clearAll()
      setState(INITIAL_STATE)

      for (const frame of FRAMES) {
        timers.current.push(
          setTimeout(() => {
            setState((current) => ({ ...current, ...frame.state }))
          }, frame.at),
        )
      }
      timers.current.push(
        setTimeout(() => {
          setLoop((value) => value + 1)
          run()
        }, LOOP_DURATION),
      )
    }

    run()
    return clearAll
  }, [active, paused, reducedMotion])

  return { ...state, loop }
}
