'use client'

import {
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import { useInView } from '@/hooks/use-in-view'

interface MathTextProps {
  text: string
  className?: string
}

/**
 * Vietnamese letters (with diacritics) must stay outside KaTeX math mode —
 * otherwise KaTeX logs "Unrecognized Unicode character" / missing metrics (e.g. "ờ").
 * Phase F2 (quiz-take KaTeX): this shared component owns delimiter/prose heuristics
 * and defers the katex/react-katex chunk until a segment is visible + needs math.
 */
const VIETNAMESE_DIACRITIC =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/

/** True only when `$…$` / `$$…$$` interior looks safe for KaTeX. */
export function isSafeMathInterior(inner: string): boolean {
  const trimmed = inner.trim()
  if (!trimmed) return false
  // Keep Vietnamese prose as text (common OCR/GPT over-wrapping).
  if (VIETNAMESE_DIACRITIC.test(trimmed)) return false
  return true
}

const MATH_SPLIT = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g

type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'block' | 'inline'; raw: string; inner: string; safe: boolean }

function parseSegments(text: string): Segment[] {
  return text
    .split(MATH_SPLIT)
    .filter((part) => part.length > 0)
    .map((part) => {
      if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
        const inner = part.slice(2, -2)
        return { kind: 'block' as const, raw: part, inner, safe: isSafeMathInterior(inner) }
      }
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        const inner = part.slice(1, -1)
        return { kind: 'inline' as const, raw: part, inner, safe: isSafeMathInterior(inner) }
      }
      return { kind: 'text' as const, value: part }
    })
}

function hasSafeMath(segments: Segment[]): boolean {
  return segments.some((s) => (s.kind === 'block' || s.kind === 'inline') && s.safe)
}

type KatexProps = {
  math: string
  renderError?: (error: Error) => ReactNode
}

type KatexModule = {
  BlockMath: ComponentType<KatexProps>
  InlineMath: ComponentType<KatexProps>
}

function PlainSegments({
  segments,
  preferInnerForSafe = false,
}: {
  segments: Segment[]
  /** While KaTeX chunk loads, show math interiors without `$` delimiters. */
  preferInnerForSafe?: boolean
}) {
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === 'text') return <span key={i}>{seg.value}</span>
        if (!seg.safe) return <span key={i}>{seg.raw}</span>
        return <span key={i}>{preferInnerForSafe ? seg.inner : seg.raw}</span>
      })}
    </>
  )
}

function DeferredKatex({
  segments,
  className,
}: {
  segments: Segment[]
  className?: string
}) {
  const { ref, inView } = useInView<HTMLSpanElement>({
    once: true,
    rootMargin: '240px 0px',
    threshold: 0,
  })
  const [katex, setKatex] = useState<KatexModule | null>(null)

  useEffect(() => {
    if (!inView || katex) return
    let cancelled = false
    void (async () => {
      await import('katex/dist/katex.min.css')
      const mod = await import('react-katex')
      if (!cancelled) {
        setKatex({ BlockMath: mod.BlockMath, InlineMath: mod.InlineMath })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [inView, katex])

  return (
    <span ref={ref} className={className}>
      {!katex ? (
        <PlainSegments segments={segments} preferInnerForSafe />
      ) : (
        segments.map((seg, i) => {
          if (seg.kind === 'text') return <span key={i}>{seg.value}</span>
          if (!seg.safe) return <span key={i}>{seg.raw}</span>
          const Comp = seg.kind === 'block' ? katex.BlockMath : katex.InlineMath
          return (
            <Comp
              key={i}
              math={seg.inner}
              renderError={() => <span className="text-destructive">{seg.raw}</span>}
            />
          )
        })
      )}
    </span>
  )
}

/** Renders plain text mixed with `$inline$` and `$$block$$` LaTeX segments. */
export function MathText({ text, className }: MathTextProps) {
  if (!text.trim()) {
    return <span className={className}>—</span>
  }

  const segments = parseSegments(text)

  if (!hasSafeMath(segments)) {
    return (
      <span className={className}>
        <PlainSegments segments={segments} />
      </span>
    )
  }

  return <DeferredKatex segments={segments} className={className} />
}
