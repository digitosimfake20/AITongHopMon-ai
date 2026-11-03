'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Bot, Send, X, Loader2, MessageSquare } from 'lucide-react'
import { sendZenoMessageAction, getChatHistoryAction } from '@/app/actions/chat-zeno'
import type { ChatMessageDisplay } from '@/app/actions/chat-zeno'
import 'katex/dist/katex.min.css'
import katex from 'katex'

// ---------------------------------------------------------------------------
// Tiny inline LaTeX renderer (mirrors the app's cleanKaTeXString approach)
// ---------------------------------------------------------------------------

function renderLatex(text: string): string {
  return text
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')
}

function MathText({ text }: { text: string }) {
  const normalized = renderLatex(text)
  // Split on $$...$$ first, then $...$
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

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({ msg }: { msg: ChatMessageDisplay }) {
  const isUser = msg.sender === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="mr-2 mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white">
          <Bot className="size-4" aria-hidden />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'rounded-tr-sm bg-teal-600 text-white'
            : 'rounded-tl-sm bg-secondary text-foreground'
        }`}
      >
        <MathText text={msg.content} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ZenoChatModalProps {
  /** Optional: preload a session */
  sessionId?: string
}

export function ZenoChatModal({ sessionId: initialSessionId }: ZenoChatModalProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessageDisplay[]>([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load history when session changes or modal opens
  useEffect(() => {
    if (!open || !sessionId) return
    setIsLoadingHistory(true)
    getChatHistoryAction(sessionId)
      .then((res) => {
        if (res.success && res.data) setMessages(res.data)
      })
      .finally(() => setIsLoadingHistory(false))
  }, [open, sessionId])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when modal opens; Escape closes
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 100)
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    // Optimistic UI
    const tempUserMsg: ChatMessageDisplay = {
      id: crypto.randomUUID(),
      sender: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])
    setInput('')
    setIsLoading(true)

    try {
      const result = await sendZenoMessageAction({ sessionId, message: trimmed })
      if (result.success && result.data) {
        setSessionId(result.data.sessionId)
        const aiMsg: ChatMessageDisplay = {
          id: crypto.randomUUID(),
          sender: 'assistant',
          content: result.data.reply,
          createdAt: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, aiMsg])
      } else {
        const errMsg: ChatMessageDisplay = {
          id: crypto.randomUUID(),
          sender: 'assistant',
          content: `Có lỗi xảy ra: ${result.error}`,
          createdAt: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, errMsg])
      }
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
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Mở chat Zeno"
          className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          <Bot className="size-6" aria-hidden />
          <span className="absolute -right-0.5 -top-0.5 flex size-3.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex size-3.5 rounded-full bg-teal-500" />
          </span>
        </button>
      ) : null}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="zeno-chat-title"
            className="relative flex h-[min(600px,85dvh)] w-full max-w-md flex-col rounded-2xl bg-card shadow-2xl"
          >
            <div className="flex items-center gap-3 rounded-t-2xl bg-teal-600 px-4 py-3 text-white">
              <div className="flex size-9 items-center justify-center rounded-full bg-white/20">
                <Bot className="size-5" aria-hidden />
              </div>
              <div className="flex-1">
                <p id="zeno-chat-title" className="font-semibold leading-tight">
                  Zeno
                </p>
                <p className="text-xs text-teal-100">Gia sư Toán</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Đóng chat"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="size-6 animate-spin text-teal-500" aria-label="Đang tải" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
                  <MessageSquare className="size-10 opacity-40" aria-hidden />
                  <p className="text-sm">
                    Mình là <strong className="text-teal-600">Zeno</strong>.
                    <br />
                    Hỏi mình về Toán.
                  </p>
                </div>
              ) : (
                messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
              )}
              {isLoading && (
                <div className="mb-3 flex justify-start">
                  <div className="mr-2 mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white">
                    <Bot className="size-4" aria-hidden />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2.5">
                    <Loader2 className="size-4 animate-spin text-teal-500" aria-label="Zeno đang trả lời" />
                  </div>
                </div>
              )}
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
                  className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
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
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white transition-colors hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-40"
                  aria-label="Gửi"
                >
                  <Send className="size-4" aria-hidden />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                Enter gửi · Shift+Enter xuống dòng · LaTeX: $x^2$
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
