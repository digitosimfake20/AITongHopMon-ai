'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Bot } from 'lucide-react'
import {
  ZENO_CHAT_OPEN_EVENT,
  type ZenoChatOpenDetail,
} from '@/components/chat/zeno-chat-events'

/**
 * Student-shell entry for Zeno: keeps katex + modal JS out of the layout
 * graph until the user opens chat (FAB or zeno-chat-open event).
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
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>()

  const openModal = useCallback((prompt?: string) => {
    if (prompt) setInitialPrompt(prompt)
    setOpenOnMount(true)
    setMountModal(true)
  }, [])

  useEffect(() => {
    function onOpenRequest(event: Event) {
      const detail = (event as CustomEvent<ZenoChatOpenDetail>).detail
      openModal(detail?.prompt)
    }
    window.addEventListener(ZENO_CHAT_OPEN_EVENT, onOpenRequest)
    return () => window.removeEventListener(ZENO_CHAT_OPEN_EVENT, onOpenRequest)
  }, [openModal])

  if (!mountModal) {
    return <ZenoFabPlaceholder onOpen={() => openModal()} />
  }

  return (
    <ZenoChatModal defaultOpen={openOnMount} initialPrompt={initialPrompt} />
  )
}
