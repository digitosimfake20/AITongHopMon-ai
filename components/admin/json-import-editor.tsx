'use client'

import { useEffect, useRef, useState } from 'react'
import { FileJson, Upload, AlertCircle } from 'lucide-react'
import { TestDraftEditor } from '@/components/admin/test-draft-editor'
import {
  emptyTestDraft,
  parseTestJson,
  testDraftToPayload,
  type TestDraft,
} from '@/lib/system-test/test-draft'
import { Button } from '@/components/ui/button'

interface JsonImportEditorProps {
  label: string
  accentClass?: string
  draft: TestDraft | null
  onDraftChange: (draft: TestDraft | null) => void
  hideMetadata?: boolean
  hideDuration?: boolean
  sampleJson?: string
}

export function JsonImportEditor({
  label,
  accentClass = 'border-cyan-500/30',
  draft,
  onDraftChange,
  hideMetadata = false,
  hideDuration = false,
  sampleJson,
}: JsonImportEditorProps) {
  const [jsonText, setJsonText] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [showRaw, setShowRaw] = useState(!draft)
  const hadDraftRef = useRef(false)

  useEffect(() => {
    if (draft && !hadDraftRef.current) {
      setShowRaw(false)
      setParseError(null)
      setJsonText(JSON.stringify(testDraftToPayload(draft), null, 2))
    }
    hadDraftRef.current = !!draft
  }, [draft])

  function handleParse() {
    const result = parseTestJson(jsonText)
    if (!result.ok) {
      setParseError(result.error)
      onDraftChange(null)
      return
    }
    setParseError(null)
    onDraftChange(result.data)
    setShowRaw(false)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.json')) {
      setParseError('Chỉ nhận file .json')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      setJsonText(text)
      const result = parseTestJson(text)
      if (!result.ok) {
        setParseError(result.error)
        onDraftChange(null)
        setShowRaw(true)
      } else {
        setParseError(null)
        onDraftChange(result.data)
        setShowRaw(false)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleLoadSample() {
    if (!sampleJson) return
    setJsonText(sampleJson)
    const result = parseTestJson(sampleJson)
    if (result.ok) {
      setParseError(null)
      onDraftChange(result.data)
      setShowRaw(false)
    }
  }

  return (
    <div className={`space-y-3 rounded-xl border p-4 ${accentClass}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{label}</h3>
        <div className="flex flex-wrap gap-2">
          {draft && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setShowRaw((v) => !v)}
            >
              {showRaw ? 'Xem editor' : 'Sửa JSON thô'}
            </Button>
          )}
          {sampleJson && (
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={handleLoadSample}>
              Mẫu
            </Button>
          )}
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-xs hover:bg-muted">
            <Upload className="size-3" />
            File .json
            <input type="file" accept=".json" className="hidden" onChange={handleFile} />
          </label>
        </div>
      </div>

      {(showRaw || !draft) && (
        <>
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value)
              if (parseError) setParseError(null)
            }}
            rows={10}
            placeholder='Dán JSON: { "title", "durationMinutes", "questions": [...] }'
            className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed"
          />
          <Button type="button" size="sm" className="gap-1.5" onClick={handleParse} disabled={!jsonText.trim()}>
            <FileJson className="size-3.5" />
            Phân tích JSON
          </Button>
        </>
      )}

      {parseError && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{parseError}</span>
        </div>
      )}

      {draft && !showRaw && (
        <TestDraftEditor
          draft={draft}
          onChange={onDraftChange}
          hideMetadata={hideMetadata}
          hideDuration={hideDuration}
        />
      )}

      {draft && showRaw && (
        <p className="text-xs text-muted-foreground">
          Đã có bản nháp — bấm &quot;Phân tích JSON&quot; để ghi đè, hoặc &quot;Xem editor&quot; để chỉnh câu hỏi.
        </p>
      )}
    </div>
  )
}

export function useTestDraftState(initial: TestDraft | null = null) {
  return useState<TestDraft | null>(initial)
}

export { emptyTestDraft }
