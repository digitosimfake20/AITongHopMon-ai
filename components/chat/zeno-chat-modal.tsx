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
          <Bot className="size-4" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'rounded-tr-sm bg-teal-600 text-white'
            : 'rounded-tl-sm bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
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

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
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
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Mở chat Zeno"
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      >
        <Bot className="size-6" />
        {/* Pulse indicator */}
        <span className="absolute -right-0.5 -top-0.5 flex size-3.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
          <span className="relative inline-flex size-3.5 rounded-full bg-teal-500" />
        </span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Chat panel */}
          <div className="relative flex w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900 sm:h-[600px]">
            {/* Header */}
            <div className="flex items-center gap-3 rounded-t-2xl bg-teal-600 px-4 py-3 text-white">
              <div className="flex size-9 items-center justify-center rounded-full bg-white/20">
                <Bot className="size-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold leading-tight">Zeno AI</p>
                <p className="text-xs text-teal-200">Gia sư Toán thông minh · Luôn sẵn sàng giúp đỡ</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 hover:bg-white/20"
                aria-label="Đóng"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="size-6 animate-spin text-teal-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-slate-400">
                  <MessageSquare className="size-10 opacity-40" />
                  <p className="text-sm">
                    Xin chào! Mình là <strong className="text-teal-600">Zeno</strong>.<br />
                    Hỏi mình bất cứ điều gì về Toán nhé!
                  </p>
                </div>
              ) : (
                messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
              )}
              {isLoading && (
                <div className="flex justify-start mb-3">
                  <div className="mr-2 mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white">
                    <Bot className="size-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-3.5 py-2.5 dark:bg-slate-800">
                    <Loader2 className="size-4 animate-spin text-teal-500" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-end gap-2 rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Hỏi Zeno về Toán... (Enter để gửi)"
                  className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
                  style={{ maxHeight: '120px' }}
                  onInput={(e) => {
                    const el = e.currentTarget
                    el.style.height = 'auto'
                    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white transition-colors hover:bg-teal-700 disabled:opacity-40"
                  aria-label="Gửi"
                >
                  <Send className="size-4" />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-slate-400">
                {'Shift+Enter xuống dòng · LaTeX: $x^2$ hoặc $$\\frac{a}{b}$$'}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
