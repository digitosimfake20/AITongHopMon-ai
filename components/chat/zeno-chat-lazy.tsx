'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Bot } from 'lucide-react'

/**
 * Student-shell entry for Zeno: keeps katex + modal JS out of the static
 * layout graph. Prefetches on idle; mounts the heavy island on idle or first open.
 */
function ZenoFabPlaceholder({
  onOpen,
  busy = false,
}: {
  onOpen?: () => void
  busy?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={busy || !onOpen}
      aria-busy={busy || undefined}
      aria-label="Mở chat Zeno"
      className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-zeno text-zeno-foreground shadow-lg transition-transform hover:scale-105 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zeno focus-visible:ring-offset-2 disabled:opacity-90"
    >
      <Bot className="size-6" aria-hidden />
      <span className="absolute -right-0.5 -top-0.5 flex size-3.5" aria-hidden>
        <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-zeno opacity-75" />
        <span className="relative inline-flex size-3.5 rounded-full bg-zeno ring-2 ring-background" />
      </span>
    </button>
  )
}

const ZenoChatModal = dynamic(
  () =>
    import('@/components/chat/zeno-chat-modal').then((m) => ({
      default: m.ZenoChatModal,
    })),
  {
    ssr: false,
    loading: () => <ZenoFabPlaceholder busy />,
  },
)

export function ZenoChatLazy() {
  const [mountModal, setMountModal] = useState(false)
  const [openOnMount, setOpenOnMount] = useState(false)

  useEffect(() => {
    let cancelled = false
    const mount = () => {
      if (!cancelled) setMountModal(true)
    }

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }

    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(mount, { timeout: 3500 })
      return () => {
        cancelled = true
        w.cancelIdleCallback?.(id)
      }
    }

    const t = setTimeout(mount, 1800)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [])

  const handleEarlyOpen = useCallback(() => {
    setOpenOnMount(true)
    setMountModal(true)
  }, [])

  if (!mountModal) {
    return <ZenoFabPlaceholder onOpen={handleEarlyOpen} />
  }

  return <ZenoChatModal defaultOpen={openOnMount} />
}
