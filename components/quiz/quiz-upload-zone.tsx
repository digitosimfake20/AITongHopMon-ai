'use client'

import { useRef, useState } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { parseQuizFileAction } from '@/app/actions/parse-quiz-file'
import type { ExtractedQuestion } from '@/lib/quiz/types'
import { cn } from '@/lib/utils'

interface QuizUploadZoneProps {
  onParsed: (questions: ExtractedQuestion[]) => void
  label?: string
}

export function QuizUploadZone({ onParsed, label }: QuizUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return

    const isSupported = /\.(docx|pdf|png|jpe?g|webp)$/i.test(file.name)
    if (!isSupported) {
      toast.error('Chỉ hỗ trợ .docx, .pdf, .png, .jpg, .webp')
      return
    }

    setIsParsing(true)
    const formData = new FormData()
    formData.set('file', file)

    const result = await parseQuizFileAction(formData)
    if (result.success && result.data) {
      const mode = result.data.usedVision ? '(ảnh/PDF)' : ''
      toast.success(
        `Đã trích xuất ${result.data.questions.length} câu hỏi${mode ? ` ${mode}` : ''}`,
      )
      onParsed(result.data.questions)
    } else {
      toast.error(result.error ?? 'Không thể xử lý tệp')
    }
    setIsParsing(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        void handleFile(e.dataTransfer.files[0])
      }}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background px-6 py-10 text-center transition-colors',
        isDragging && 'border-primary bg-primary/5',
      )}
    >
      {isParsing ? (
        <>
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-foreground">
            Đang phân tích tệp…
          </p>
        </>
      ) : (
        <>
          <FileUp className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-foreground">
            {label ?? 'Kéo thả hoặc chọn tệp'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            .docx · .pdf · .png / .jpg / .webp — hệ thống trích xuất câu hỏi từ tệp
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF và ảnh: đọc công thức toán bằng nhận diện hình ảnh.
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 min-h-11 rounded-lg border border-border bg-card px-5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Chọn tệp
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".docx,.pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
        </>
      )}
    </div>
  )
}
