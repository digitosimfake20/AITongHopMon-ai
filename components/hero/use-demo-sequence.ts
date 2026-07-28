'use client'

import { useEffect, useRef, useState } from 'react'
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

/**
 * Drives the scripted hero demo. Runs only while the demo is on screen so the
 * page stays cheap when the user has scrolled past it.
 */
export function useDemoSequence(active: boolean) {
  const [state, setState] = useState<DemoState>(INITIAL_STATE)
  const [loop, setLoop] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (!active) return

    const clearAll = () => {
      for (const timer of timers.current) clearTimeout(timer)
      timers.current = []
    }

    const run = () => {
      clearAll()
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
  }, [active])

  return { ...state, loop }
}
