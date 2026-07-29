'use client'

import { BlockMath, InlineMath } from 'react-katex'
import 'katex/dist/katex.min.css'

interface MathTextProps {
  text: string
  className?: string
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
          return (
            <BlockMath
              key={i}
              math={part.slice(2, -2)}
              renderError={() => <span className="text-destructive">{part}</span>}
            />
          )
        }
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          return (
            <InlineMath
              key={i}
              math={part.slice(1, -1)}
              renderError={() => <span className="text-destructive">{part}</span>}
            />
          )
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}
