'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { MathText } from '@/components/quiz/math-text'
import { MathToolbar, MATH_PH } from '@/components/ui/math-toolbar'

interface MathInputAreaProps {
  value: string
  onChange: (v: string) => void
  /** true → textarea, false → single-line input. Default: true */
  multiline?: boolean
  rows?: number
  placeholder?: string
  /** Show a rendered KaTeX preview below the input when value is non-empty. Default: true */
  showPreview?: boolean
  className?: string
  inputClassName?: string
  'aria-label'?: string
}

/**
 * A textarea (or input) with an integrated math toolbar and optional live
 * KaTeX preview.  The toolbar buttons insert LaTeX snippets at the cursor
 * position without stealing focus from the text field.
 */
export function MathInputArea({
  value,
  onChange,
  multiline = true,
  rows = 2,
  placeholder,
  showPreview = true,
  className,
  inputClassName,
  'aria-label': ariaLabel,
}: MathInputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleInsert(insertStr: string) {
    const el: HTMLTextAreaElement | HTMLInputElement | null = multiline
      ? textareaRef.current
      : inputRef.current

    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length

    const phIdx = insertStr.indexOf(MATH_PH)
    const cleanStr = insertStr.replace(MATH_PH, '')
    const newValue = value.slice(0, start) + cleanStr + value.slice(end)
    onChange(newValue)

    // Place cursor at the placeholder position (or end of insertion if no placeholder)
    const newCursor = phIdx !== -1 ? start + phIdx : start + cleanStr.length
    requestAnimationFrame(() => {
      const target = multiline ? textareaRef.current : inputRef.current
      if (!target) return
      target.focus()
      target.setSelectionRange(newCursor, newCursor)
    })
  }

  const inputClass = cn(
    'w-full rounded-b-lg border border-input bg-background px-3 py-2.5 text-sm outline-none',
    'focus:ring-2 focus:ring-ring',
    inputClassName,
  )

  return (
    <div className={cn('w-full', className)}>
      <MathToolbar onInsert={handleInsert} />
      {multiline ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          aria-label={ariaLabel}
          className={cn(inputClass, 'resize-y')}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={cn(inputClass, 'min-h-11')}
        />
      )}
      {showPreview && value.trim() && (
        <div className="mt-2 rounded-lg bg-secondary/50 px-4 py-2.5 text-sm text-foreground">
          <MathText text={value} />
        </div>
      )}
    </div>
  )
}
