'use client'

import { cn } from '@/lib/utils'

/**
 * Placeholder character in snippet templates marking where the cursor
 * (or selection) should land after insertion.
 */
export const MATH_PH = '■'

export interface MathSnippet {
  label: string
  tip: string
  /** Full string to insert; MATH_PH marks the cursor position. */
  insert: string
}

export const MATH_SNIPPETS: MathSnippet[] = [
  { label: 'a/b',  tip: 'Phân thức',           insert: `$\\frac{${MATH_PH}}{b}$` },
  { label: 'xⁿ',  tip: 'Lũy thừa / Số mũ',    insert: `$x^{${MATH_PH}}$` },
  { label: 'xₙ',  tip: 'Chỉ số dưới',          insert: `$x_{${MATH_PH}}$` },
  { label: '√x',  tip: 'Căn bậc hai',           insert: `$\\sqrt{${MATH_PH}}$` },
  { label: 'ⁿ√x', tip: 'Căn bậc n',            insert: `$\\sqrt[n]{${MATH_PH}}$` },
  { label: '·',   tip: 'Dấu nhân trung tâm (·)', insert: '$\\cdot$' },
  { label: '÷',   tip: 'Dấu chia (÷)',           insert: '$\\div$' },
  { label: '×',   tip: 'Dấu nhân (×)',           insert: '$\\times$' },
  { label: '≠',   tip: 'Khác nhau (≠)',          insert: '$\\neq$' },
  { label: '≤',   tip: 'Nhỏ hơn hoặc bằng (≤)', insert: '$\\leq$' },
  { label: '≥',   tip: 'Lớn hơn hoặc bằng (≥)', insert: '$\\geq$' },
  { label: '≈',   tip: 'Xấp xỉ bằng (≈)',        insert: '$\\approx$' },
  { label: '±',   tip: 'Cộng hoặc trừ (±)',      insert: '$\\pm$' },
  { label: 'π',   tip: 'Pi (π)',                 insert: '$\\pi$' },
  { label: '∞',   tip: 'Vô cùng (∞)',            insert: '$\\infty$' },
]

interface MathToolbarProps {
  /**
   * Called with the raw snippet.insert string (MATH_PH included).
   * The caller is responsible for performing the actual text insertion.
   */
  onInsert: (insertStr: string) => void
  className?: string
}

export function MathToolbar({ onInsert, className }: MathToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Công cụ toán học"
      className={cn(
        'flex flex-wrap gap-0.5 rounded-t-lg border border-b-0 border-input bg-muted/60 px-2 py-1.5',
        className,
      )}
    >
      {MATH_SNIPPETS.map((s) => (
        <button
          key={s.tip}
          type="button"
          title={s.tip}
          onMouseDown={(e) => {
            // Prevent textarea/input from losing focus so cursor position is preserved
            e.preventDefault()
            onInsert(s.insert)
          }}
          className="inline-flex min-h-7 items-center justify-center rounded px-2 font-mono text-xs text-foreground transition-colors hover:bg-background hover:shadow-sm active:scale-95"
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
