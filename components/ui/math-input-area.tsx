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
  /** Show math toolbar above the input. Default: true */
  showToolbar?: boolean
  /** Show a rendered KaTeX preview when value is non-empty. Default: true */
  showPreview?: boolean
  /** `below` = preview under input; `split` = input left, rendered math right (like teacher quiz editor) */
  previewLayout?: 'below' | 'split'
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
  showToolbar = true,
  previewLayout = 'below',
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
    'w-full bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring',
    previewLayout === 'split' ? 'min-h-11 flex-1 border-0' : 'rounded-b-lg border border-input',
    inputClassName,
  )

  const previewPanel =
    showPreview && value.trim() ? (
      <div
        className={cn(
          'text-sm text-foreground',
          previewLayout === 'split'
            ? 'min-w-0 flex-1 border-t border-border px-4 py-2.5 sm:border-t-0 sm:border-l'
            : 'mt-2 rounded-lg bg-secondary/50 px-4 py-2.5',
        )}
      >
        {previewLayout === 'split' && (
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:hidden">
            Hiển thị
          </p>
        )}
        <MathText text={value} />
      </div>
    ) : null

  const inputWrapperClass =
    previewLayout === 'split' && showPreview && value.trim()
      ? 'min-w-0 flex-1'
      : 'w-full'

  return (
    <div className={cn('w-full', className)}>
      {showToolbar && <MathToolbar onInsert={handleInsert} />}
      {previewLayout === 'split' ? (
        <div className="overflow-hidden rounded-b-lg border border-input bg-background">
          {showToolbar && showPreview && value.trim() && (
            <div className="hidden border-b border-border px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-2">
              <span>Nhập LaTeX</span>
              <span className="sm:border-l sm:pl-3">Hiển thị</span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-stretch">
            {multiline ? (
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                aria-label={ariaLabel}
                className={cn(inputClass, 'resize-y', inputWrapperClass)}
              />
            ) : (
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={ariaLabel}
                className={cn(inputClass, inputWrapperClass)}
              />
            )}
            {previewPanel}
          </div>
        </div>
      ) : multiline ? (
        <>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            aria-label={ariaLabel}
            className={cn(inputClass, 'resize-y rounded-b-lg border border-input')}
          />
          {previewPanel}
        </>
      ) : (
        <>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            aria-label={ariaLabel}
            className={cn(inputClass, 'min-h-11 rounded-b-lg border border-input')}
          />
          {previewPanel}
        </>
      )}
    </div>
  )
}
