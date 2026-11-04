'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Bot, Send, X, Loader2, MessageSquare } from 'lucide-react'
import { getChatHistoryAction } from '@/app/actions/chat-zeno'
import type { ChatMessageDisplay } from '@/app/actions/chat-zeno'
import { MAX_CHAT_MESSAGE_CHARS } from '@/lib/ai/chat-limits'
import {
  ZENO_CHAT_OPEN_EVENT,
  type ZenoChatOpenDetail,
} from '@/components/chat/zeno-chat-events'
import 'katex/dist/katex.min.css'
import katex from 'katex'

export { ZENO_CHAT_OPEN_EVENT, type ZenoChatOpenDetail } from '@/components/chat/zeno-chat-events'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
  )
}

function renderLatex(text: string): string {
  return text
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')
}

function MathText({ text }: { text: string }) {
  const normalized = renderLatex(text)
  const parts = normalized.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g)

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
          const math = part.slice(2, -2)
          try {
            const html = katex.renderToString(math, { displayMode: true, throwOnError: false })
            return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
          } catch {
            return <span key={i}>{part}</span>
          }
        }
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const math = part.slice(1, -1)
          try {
            const html = katex.renderToString(math, { displayMode: false, throwOnError: false })
            return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
          } catch {
            return <span key={i}>{part}</span>
          }
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function MessageBubble({ msg }: { msg: ChatMessageDisplay }) {
  const isUser = msg.sender === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="mr-2 mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-zeno text-white">
          <Bot className="size-4" aria-hidden />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'rounded-tr-sm bg-zeno text-white'
            : 'rounded-tl-sm bg-secondary text-foreground'
        }`}
      >
        <MathText text={msg.content} />
      </div>
    </div>
  )
}

interface ZenoChatModalProps {
  sessionId?: string
  /** Open immediately on mount (used when user clicked the lazy FAB before the chunk loaded). */
  defaultOpen?: boolean
  /** Prefill composer when opened via FAB / zeno-chat-open before the chunk mounted. */
  initialPrompt?: string
}

export function ZenoChatModal({
  sessionId: initialSessionId,
  defaultOpen = false,
  initialPrompt,
}: ZenoChatModalProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [messages, setMessages] = useState<ChatMessageDisplay[]>([])
  const [input, setInput] = useState(initialPrompt ?? '')
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  const close = useCallback(() => {
    setOpen(false)
  }, [])

  const openWithPrompt = useCallback((prompt?: string) => {
    if (prompt) setInput(prompt)
    setHasOpenedOnce(true)
    setOpen(true)
  }, [])

  useEffect(() => {
    function onOpenRequest(event: Event) {
      const detail = (event as CustomEvent<ZenoChatOpenDetail>).detail
      openWithPrompt(detail?.prompt)
    }
    window.addEventListener(ZENO_CHAT_OPEN_EVENT, onOpenRequest)
    return () => window.removeEventListener(ZENO_CHAT_OPEN_EVENT, onOpenRequest)
  }, [openWithPrompt])

  useEffect(() => {
    if (!open || !sessionId) return
    setIsLoadingHistory(true)
    getChatHistoryAction(sessionId)
      .then((res) => {
        if (res.success && res.data) setMessages(res.data)
      })
      .finally(() => setIsLoadingHistory(false))
  }, [open, sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus trap, Escape, restore focus, inert main shell
  useEffect(() => {
    if (!open) return

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const main = document.getElementById('main-content')
    const wasMainInert = main?.hasAttribute('inert') ?? false
    if (main && !wasMainInert) main.setAttribute('inert', '')

    const t = setTimeout(() => inputRef.current?.focus(), 50)

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return

      const focusables = getFocusable(panelRef.current)
      if (focusables.length === 0) {
        e.preventDefault()
        panelRef.current.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement

      if (e.shiftKey) {
        if (active === first || active === panelRef.current) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKeyDown)
      if (main && !wasMainInert) main.removeAttribute('inert')
      const restore = previouslyFocused.current ?? fabRef.current
      restore?.focus()
    }
  }, [open, close])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const tempUserMsg: ChatMessageDisplay = {
      id: crypto.randomUUID(),
      sender: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    }
    const assistantId = crypto.randomUUID()
    const tempAssistantMsg: ChatMessageDisplay = {
      id: assistantId,
      sender: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg, tempAssistantMsg])
    setInput('')
    setIsLoading(true)

    const appendAssistant = (chunk: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: m.content + chunk } : m,
        ),
      )
    }

    const setAssistantContent = (content: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content } : m)),
      )
    }

    try {
      const res = await fetch('/api/zeno/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: trimmed }),
      })

      if (!res.ok) {
        let errText = `HTTP ${res.status}`
        try {
          const j = (await res.json()) as { error?: string }
          if (j.error) errText = j.error
        } catch {
          /* ignore */
        }
        setAssistantContent(`Có lỗi xảy ra: ${errText}`)
        return
      }

      if (!res.body) {
        setAssistantContent('Có lỗi xảy ra: không nhận được phản hồi stream')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const line = part
            .split('\n')
            .map((l) => l.trim())
            .find((l) => l.startsWith('data:'))
          if (!line) continue
          const raw = line.slice(5).trim()
          if (!raw || raw === '[DONE]') continue

          let event: {
            type: string
            sessionId?: string
            text?: string
            error?: string
          }
          try {
            event = JSON.parse(raw) as typeof event
          } catch {
            continue
          }

          if (event.type === 'meta' && event.sessionId) {
            setSessionId(event.sessionId)
          } else if (event.type === 'token' && event.text) {
            appendAssistant(event.text)
          } else if (event.type === 'done' && event.sessionId) {
            setSessionId(event.sessionId)
          } else if (event.type === 'error') {
            setAssistantContent(`Có lỗi xảy ra: ${event.error ?? 'không rõ'}`)
          }
        }
      }
    } catch (err) {
      setAssistantContent(
        `Có lỗi xảy ra: ${err instanceof Error ? err.message : 'không kết nối được'}`,
      )
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [input, isLoading, sessionId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <>
      {!open ? (
        <button
          ref={fabRef}
          type="button"
          onClick={() => {
            setHasOpenedOnce(true)
            setOpen(true)
          }}
          aria-label="Mở chat Zeno"
          className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-zeno text-white shadow-lg transition-transform hover:scale-105 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zeno focus-visible:ring-offset-2"
        >
          <Bot className="size-6" aria-hidden />
          {!hasOpenedOnce ? (
            <span className="absolute -right-0.5 -top-0.5 size-3.5 rounded-full bg-zeno ring-2 ring-background" aria-hidden />
          ) : null}
        </button>
      ) : null}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            aria-label="Đóng chat"
            onClick={close}
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="zeno-chat-title"
            tabIndex={-1}
            className="relative flex h-[min(600px,85dvh)] w-full max-w-md flex-col rounded-2xl bg-card shadow-2xl outline-none"
          >
            <div className="flex items-center gap-3 rounded-t-2xl bg-zeno px-4 py-3 text-white">
              <div className="flex size-9 items-center justify-center rounded-full bg-white/20">
                <Bot className="size-5" aria-hidden />
              </div>
              <div className="flex-1">
                <p id="zeno-chat-title" className="font-semibold leading-tight">
                  Zeno
                </p>
                <p className="text-xs text-white/80">Gia sư Toán</p>
              </div>
              <button
                type="button"
                onClick={close}
                className="inline-flex size-11 items-center justify-center rounded-full hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Đóng chat"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="size-6 animate-spin text-zeno" aria-label="Đang tải" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
                  <MessageSquare className="size-10 opacity-40" aria-hidden />
                  <p className="text-sm">
                    Mình là <strong className="text-zeno">Zeno</strong>.
                    <br />
                    Hỏi mình về Toán.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  // Hide empty streaming placeholder until first token arrives.
                  if (msg.sender === 'assistant' && !msg.content && isLoading) return null
                  return <MessageBubble key={msg.id} msg={msg} />
                })
              )}
              {isLoading && messages[messages.length - 1]?.sender === 'assistant' && !messages[messages.length - 1]?.content ? (
                <div className="mb-3 flex justify-start" aria-live="polite">
                  <div className="mr-2 mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-zeno text-white">
                    <Bot className="size-4" aria-hidden />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2.5">
                    <Loader2 className="size-4 animate-spin text-zeno" aria-label="Zeno đang trả lời" />
                  </div>
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-border p-3">
              <div className="flex items-end gap-2 rounded-xl bg-secondary px-3 py-2">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Hỏi Zeno về Toán…"
                  aria-label="Tin nhắn gửi Zeno"
                  maxLength={MAX_CHAT_MESSAGE_CHARS}
                  className="flex-1 resize-none bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  style={{ maxHeight: '120px' }}
                  onInput={(e) => {
                    const el = e.currentTarget
                    el.style.height = 'auto'
                    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
                  }}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-zeno text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zeno disabled:opacity-40"
                  aria-label="Gửi"
                >
                  <Send className="size-4" aria-hidden />
                </button>
              </div>
              <p className="mt-1.5 text-center text-xs text-muted-foreground">
                Enter gửi · Shift+Enter xuống dòng · LaTeX: $x^2$
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
