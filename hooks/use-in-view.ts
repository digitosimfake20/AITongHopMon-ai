'use client'

import { useEffect, useRef, useState } from 'react'

interface UseInViewOptions {
  /** Stop observing once it has been seen. Useful for one-shot reveals. */
  once?: boolean
  rootMargin?: string
  threshold?: number
}

export function useInView<T extends HTMLElement = HTMLDivElement>({
  once = false,
  rootMargin = '0px',
  threshold = 0.2,
}: UseInViewOptions = {}) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { rootMargin, threshold },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [once, rootMargin, threshold])

  return { ref, inView }
}
