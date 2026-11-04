'use client'

import { BlockMath, InlineMath } from 'react-katex'
import 'katex/dist/katex.min.css'

interface MathTextProps {
  text: string
  className?: string
}

/**
 * Vietnamese letters (with diacritics) must stay outside KaTeX math mode —
 * otherwise KaTeX logs "Unrecognized Unicode character" / missing metrics (e.g. "ờ").
 * Phase F2 (quiz-take KaTeX): this shared component is the preferred owner for
 * delimiter/prose heuristics; avoid a parallel copy in quiz-taker.
 */
const VIETNAMESE_DIACRITIC =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/

/** True only when `$…$` / `$$…$$` interior looks safe for KaTeX. */
function isSafeMathInterior(inner: string): boolean {
  const trimmed = inner.trim()
  if (!trimmed) return false
  // Keep Vietnamese prose as text (common OCR/GPT over-wrapping).
  if (VIETNAMESE_DIACRITIC.test(trimmed)) return false
  return true
}

/** Renders plain text mixed with `$inline$` and `$$block$$` LaTeX segments. */
export function MathText({ text, className }: MathTextProps) {
  if (!text.trim()) {
    return <span className={className}>—</span>
  }

  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g).filter((part) => part.length > 0)

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
          const inner = part.slice(2, -2)
          if (!isSafeMathInterior(inner)) {
            return <span key={i}>{part}</span>
          }
          return (
            <BlockMath
              key={i}
              math={inner}
              renderError={() => <span className="text-destructive">{part}</span>}
            />
          )
        }
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const inner = part.slice(1, -1)
          if (!isSafeMathInterior(inner)) {
            return <span key={i}>{part}</span>
          }
          return (
            <InlineMath
              key={i}
              math={inner}
              renderError={() => <span className="text-destructive">{part}</span>}
            />
          )
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}
