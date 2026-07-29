'use server'

import JSZip from 'jszip'
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import type { ActionResult } from '@/lib/auth/types'
import { getOpenAIClient, OPENAI_MODEL_CHAT, OPENAI_MODEL_VISION } from '@/lib/ai/openai'
import type { ExtractedQuestion, ExtractedSubQuestion, QuestionType } from '@/lib/quiz/types'
import { normalizeLatexDelimiters } from '@/lib/utils/katex-formatter'

// =============================================================================
// Constants
// =============================================================================

const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_TEXT_CHARS = 18_000
const MAX_VISION_PAGES = 8    // max PDF pages to render per call
const VISION_SCALE = 2.0      // render scale — higher = sharper, more tokens
const VALID_TYPES: QuestionType[] = ['MULTIPLE_CHOICE', 'TRUE_FALSE_GROUP', 'SHORT_ANSWER', 'ESSAY']
const EQUATION_PLACEHOLDER = '[EQUATION]'

// Extensions handled by each path
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp'])
const VISION_EXTS = new Set([...IMAGE_EXTS, 'pdf'])
const ALL_EXTS = new Set([...VISION_EXTS, 'docx'])

function fileExt(name: string): string {
  return name.toLowerCase().split('.').pop() ?? ''
}

// =============================================================================
// Vision system prompt (used for PDF + image uploads)
// =============================================================================

const VISION_SYSTEM_PROMPT = `You are an expert OCR and Vietnamese math exam parser. You will receive images of exam pages. Extract ALL questions into a JSON object with the key "questions".

READING RULES:
- Read ALL visible text and mathematical expressions precisely.
- Convert every formula, fraction, radical, exponent, or inequality you SEE into proper KaTeX/LaTeX: $inline$ or $$block$$.
  • Fractions → $\\frac{numerator}{denominator}$
  • Roots → $\\sqrt{...}$ or $\\sqrt[n]{...}$
  • Powers → $x^{2}$, subscripts → $x_{n}$
  • Read EXACT numbers and symbols that are printed. Do NOT simplify or alter them.

⛔ ABSOLUTE ANTI-HALLUCINATION RULE:
  NEVER invent or substitute generic dummy placeholder math like a/b, c/d, e/f, x/y, p/q.
  Only output math expressions that are VISUALLY PRESENT in the image.
  If a formula is genuinely unreadable, output $\\dots$ — NEVER a generic placeholder fraction.

QUESTION TYPE CLASSIFICATION:
1. MULTIPLE_CHOICE (Section A / Phần A): 4 options A, B, C, D.
   - STRIP the "A. " "B. " "C. " "D. " prefix from each option value.
   - "correctAnswer": 0-3 (0=A). Use any visible answer key, circle, or underline marking; default to 0 if none.

2. TRUE_FALSE_GROUP (Section B / Phần B): Shared stem + sub-statements a), b), c), d).
   - Put the shared problem context in "content".
   - Put each sub-statement in "subQuestions" as {label, content}, STRIPPING the "a) "/"b. " prefix.
   - "correctAnswer" per sub-statement:
       true  → sub-statement text is UNDERLINED in the image
       false → NOT underlined

3. SHORT_ANSWER (Section C / Phần C): Numerical or short answer, no options.
   - Put exact answer from "Đáp số:" / "Đáp án:" into "correctAnswer" as a string.

4. ESSAY (Section D / Phần D): Full-working / proof problems.
   - If solution steps are visible, put them in "explanation".

TOPIC TAGGING (REQUIRED for every question):
- Assign a concise 2-4 word Vietnamese math sub-topic to "topic" that describes the specific skill being tested.
- Examples: "Phép nhân phân thức", "Điều kiện xác định", "Rút gọn biểu thức", "Phân thức nghịch đảo", "Quy đồng mẫu thức", "Phép cộng đa thức".
- NEVER use the overall quiz title as the topic. Each question must have its own specific sub-topic.

OUTPUT: valid JSON only, no markdown fences, matching:
{
  "questions": [
    {
      "type": "MULTIPLE_CHOICE" | "TRUE_FALSE_GROUP" | "SHORT_ANSWER" | "ESSAY",
      "topic": "Phép nhân phân thức",
      "content": "string (LaTeX for math)",
      "options": ["A text", "B text", "C text", "D text"],
      "correctAnswer": 0,
      "subQuestions": [{"label": "a", "content": "...", "correctAnswer": true}],
      "explanation": "string (optional)"
    }
  ]
}`

// =============================================================================
// Text system prompt (used for DOCX text extraction path)
// =============================================================================

const TEXT_SYSTEM_PROMPT = `You are an expert Vietnamese math exam parser. Parse the provided test document into a JSON object with an array of questions under the key "questions".

The raw text comes from a Word document where:
- OMML (Office Math) equations have ALREADY been pre-converted to LaTeX: inline math is wrapped in \`$...$\` and display/block math in \`$$...$$\`. KEEP these extracted LaTeX expressions exactly as they appear — do not modify, re-interpret, or re-write them.
- "${EQUATION_PLACEHOLDER}": marks a legacy Equation 3.0 / MathType OLE object that could NOT be auto-converted. Replace every "${EQUATION_PLACEHOLDER}" with a best-guess LaTeX reconstruction using surrounding context. NEVER leave a literal "${EQUATION_PLACEHOLDER}" in output.
- "[U]...[/U]": text was underlined in the original (used as answer-key markers in True/False questions).
- "[B]...[/B]": text was bold in the original.
Never copy these markers literally into any output field.

⛔ ABSOLUTE ANTI-HALLUCINATION RULE:
  NEVER invent or substitute generic dummy placeholder math like a/b, c/d, e/f, x/y, p/q.
  Use ONLY the exact numbers, variables, and expressions that appear in the source text.
  If a formula is genuinely missing AND no [EQUATION] placeholder is present, leave surrounding text as-is — do NOT fabricate plausible-looking formulas.

CLASSIFY EACH QUESTION INTO ONE OF THESE 4 TYPES:
1. MULTIPLE_CHOICE — 4 options A, B, C, D. Strip "A. "/"B) " prefixes. "correctAnswer": 0-3.
2. TRUE_FALSE_GROUP — stem + sub-statements a/b/c/d. True = [U] or [B] marker. Null if no formatting clue.
3. SHORT_ANSWER — fill-in/numeric. "correctAnswer" is the exact answer string.
4. ESSAY — full working. Solution in "explanation".

TOPIC TAGGING (REQUIRED for every question):
- Assign a concise 2-4 word Vietnamese math sub-topic to "topic" that describes the specific skill being tested.
- Examples: "Phép nhân phân thức", "Điều kiện xác định", "Rút gọn biểu thức", "Phân thức nghịch đảo", "Quy đồng mẫu thức", "Phép chia phân thức".
- NEVER use the overall quiz/document title as the topic. Each question must have its own specific sub-topic.

Apply LaTeX in every field. Only output valid JSON, no markdown fences, matching:
{
  "questions": [
    {
      "type": "MULTIPLE_CHOICE" | "TRUE_FALSE_GROUP" | "SHORT_ANSWER" | "ESSAY",
      "topic": "Phép nhân phân thức",
      "content": "string",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": 0,
      "subQuestions": [{"label": "a", "content": "...", "correctAnswer": true}],
      "explanation": "string (optional)"
    }
  ]
}`

// =============================================================================
// OMML → LaTeX converter (used for DOCX path)
// =============================================================================

function xmlDecodeText(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
}

function xmlEncodeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function findFirst(xml: string, tag: string): { inner: string; end: number } | null {
  const openStart = `<${tag}`
  const closeTag = `</${tag}>`
  let pos = 0
  while (pos < xml.length) {
    const found = xml.indexOf(openStart, pos)
    if (found === -1) return null
    const ch = xml[found + openStart.length]
    if (ch !== '>' && ch !== ' ' && ch !== '\t' && ch !== '\n' && ch !== '\r' && ch !== '/') {
      pos = found + 1; continue
    }
    const openEnd = xml.indexOf('>', found)
    if (openEnd === -1) return null
    if (xml[openEnd - 1] === '/') return { inner: '', end: openEnd + 1 }
    const innerStart = openEnd + 1
    let depth = 1, i = innerStart
    while (depth > 0 && i < xml.length) {
      const no = xml.indexOf(openStart, i)
      const nc = xml.indexOf(closeTag, i)
      if (nc === -1) return null
      if (no !== -1 && no < nc) {
        const nch = xml[no + openStart.length]
        if (nch === '>' || nch === ' ' || nch === '\t' || nch === '\n' || nch === '\r' || nch === '/') depth++
        i = no + openStart.length
      } else {
        depth--
        if (depth === 0) return { inner: xml.substring(innerStart, nc), end: nc + closeTag.length }
        i = nc + closeTag.length
      }
    }
    return null
  }
  return null
}

function gc(inner: string, tag: string): string {
  const f = findFirst(inner, tag)
  return f ? walkOmml(f.inner) : ''
}

function walkOmml(xml: string): string {
  let result = ''
  let i = 0
  while (i < xml.length) {
    if (xml[i] !== '<') {
      const next = xml.indexOf('<', i)
      result += xmlDecodeText(next === -1 ? xml.slice(i) : xml.slice(i, next))
      i = next === -1 ? xml.length : next
      continue
    }
    if (xml[i + 1] === '/' || xml[i + 1] === '!' || xml[i + 1] === '?') {
      const end = xml.indexOf('>', i)
      i = end === -1 ? xml.length : end + 1
      continue
    }
    const afterLt = i + 1
    const delim = xml.slice(afterLt).search(/[\s>\/]/)
    if (delim === -1) { i++; continue }
    const tagName = xml.slice(afterLt, afterLt + delim)
    const openEnd = xml.indexOf('>', i)
    if (openEnd === -1) break
    if (xml[openEnd - 1] === '/') { i = openEnd + 1; continue }
    const innerStart = openEnd + 1
    const openStart = `<${tagName}`
    const closeTag = `</${tagName}>`
    let depth = 1, j = innerStart, innerEnd = -1
    while (depth > 0 && j < xml.length) {
      const no = xml.indexOf(openStart, j)
      const nc = xml.indexOf(closeTag, j)
      if (nc === -1) break
      if (no !== -1 && no < nc) {
        const nch = xml[no + openStart.length]
        if (nch === '>' || nch === ' ' || nch === '\t' || nch === '\n' || nch === '\r' || nch === '/') depth++
        j = no + openStart.length
      } else {
        depth--
        if (depth === 0) { innerEnd = nc; break }
        j = nc + closeTag.length
      }
    }
    if (innerEnd === -1) { i = openEnd + 1; continue }
    result += dispatchOmml(tagName, xml.slice(innerStart, innerEnd))
    i = innerEnd + closeTag.length
  }
  return result
}

function dispatchOmml(tagName: string, inner: string): string {
  switch (tagName) {
    case 'm:t': return xmlDecodeText(inner)
    case 'm:r': case 'm:oMath': case 'm:oMathPara': return walkOmml(inner)
    case 'm:f': return `\\frac{${gc(inner, 'm:num')}}{${gc(inner, 'm:den')}}`
    case 'm:rad': {
      const degResult = findFirst(inner, 'm:deg')
      const degInner = degResult?.inner ?? ''
      const isHidden = /m:degHide[^>]*val\s*=\s*["']1["']/.test(degInner) || !degInner.trim()
      const e = gc(inner, 'm:e')
      if (isHidden) return `\\sqrt{${e}}`
      const deg = walkOmml(degInner).trim()
      return deg ? `\\sqrt[${deg}]{${e}}` : `\\sqrt{${e}}`
    }
    case 'm:sSup': return `{${gc(inner, 'm:e')}}^{${gc(inner, 'm:sup')}}`
    case 'm:sSub': return `{${gc(inner, 'm:e')}}_{${gc(inner, 'm:sub')}}`
    case 'm:sSubSup': return `{${gc(inner, 'm:e')}}_{${gc(inner, 'm:sub')}}^{${gc(inner, 'm:sup')}}`
    case 'm:d': {
      const dPrInner = findFirst(inner, 'm:dPr')?.inner ?? ''
      const beg = /<m:begChr[^>]*val\s*=\s*["']([^"']*)["']/.exec(dPrInner)?.[1] ?? '('
      const end = /<m:endChr[^>]*val\s*=\s*["']([^"']*)["']/.exec(dPrInner)?.[1] ?? ')'
      const open = beg === '{' ? '\\{' : beg === '' ? '' : beg
      const close = end === '}' ? '\\}' : end === '' ? '' : end
      const eList: string[] = []
      let rem = inner
      while (true) { const f = findFirst(rem, 'm:e'); if (!f) break; eList.push(walkOmml(f.inner)); rem = rem.slice(f.end) }
      return `${open}${eList.join(', ')}${close}`
    }
    case 'm:nary': {
      const nPr = findFirst(inner, 'm:naryPr')?.inner ?? ''
      const chr = /<m:chr[^>]*val\s*=\s*["']([^"']*)["']/.exec(nPr)?.[1] ?? '∑'
      const opMap: Record<string, string> = { '∫': '\\int', '∑': '\\sum', '∏': '\\prod', '⋂': '\\bigcap', '⋃': '\\bigcup', '∩': '\\bigcap', '∪': '\\bigcup' }
      const op = opMap[chr] ?? '\\sum'
      const sub = gc(inner, 'm:sub'), sup = gc(inner, 'm:sup'), e = gc(inner, 'm:e')
      return `${op}${sub ? `_{${sub}}` : ''}${sup ? `^{${sup}}` : ''}{${e}}`
    }
    case 'm:func': return `${gc(inner, 'm:fName').trim()}(${gc(inner, 'm:e')})`
    case 'm:limLow': return `{${gc(inner, 'm:e')}}_{${gc(inner, 'm:lim')}}`
    case 'm:limUpp': return `{${gc(inner, 'm:e')}}^{${gc(inner, 'm:lim')}}`
    case 'm:bar': {
      const isBot = /<m:pos[^>]*val\s*=\s*["']bot["']/.test(findFirst(inner, 'm:barPr')?.inner ?? '')
      return isBot ? `\\underline{${gc(inner, 'm:e')}}` : `\\overline{${gc(inner, 'm:e')}}`
    }
    case 'm:acc': {
      const chr = /<m:chr[^>]*val\s*=\s*["']([^"']*)["']/.exec(findFirst(inner, 'm:accPr')?.inner ?? '')?.[1] ?? ''
      const accMap: Record<string, string> = { 'ˆ': '\\hat', '̂': '\\hat', '˜': '\\tilde', '¯': '\\bar', '⃗': '\\vec', '̇': '\\dot' }
      return `${accMap[chr] ?? '\\hat'}{${gc(inner, 'm:e')}}`
    }
    case 'm:eqArr': { const rows: string[] = []; let rem = inner; while (true) { const f = findFirst(rem, 'm:e'); if (!f) break; rows.push(walkOmml(f.inner)); rem = rem.slice(f.end) } return rows.join(' \\\\ ') }
    case 'm:m': {
      const rows: string[] = []; let rem = inner
      while (true) {
        const mrF = findFirst(rem, 'm:mr'); if (!mrF) break
        const cells: string[] = []; let rowR = mrF.inner
        while (true) { const cf = findFirst(rowR, 'm:e'); if (!cf) break; cells.push(walkOmml(cf.inner)); rowR = rowR.slice(cf.end) }
        rows.push(cells.join(' & ')); rem = rem.slice(mrF.end)
      }
      return rows.length > 0 ? `\\begin{matrix}${rows.join(' \\\\ ')}\\end{matrix}` : ''
    }
    case 'm:rPr': case 'm:sSupPr': case 'm:sSubPr': case 'm:sSubSupPr': case 'm:fPr': case 'm:radPr':
    case 'm:dPr': case 'm:naryPr': case 'm:funcPr': case 'm:barPr': case 'm:accPr':
    case 'm:groupChrPr': case 'm:mPr': case 'm:ctrlPr': case 'm:degHide': return ''
    default: return walkOmml(inner)
  }
}

async function convertOmmlInDocx(buffer: Buffer): Promise<Buffer> {
  try {
    const zip = await JSZip.loadAsync(buffer)
    const docXmlFile = zip.file('word/document.xml')
    if (!docXmlFile) return buffer
    const xml = await docXmlFile.async('string')
    let patched = xml.replace(/<m:oMathPara[^>]*>([\s\S]*?)<\/m:oMathPara>/g, (_: string, inner: string) => {
      try {
        const latex = walkOmml(inner).trim()
        if (!latex) return `<w:r><w:t xml:space="preserve"> ${EQUATION_PLACEHOLDER} </w:t></w:r>`
        return `<w:r><w:t xml:space="preserve"> $$${xmlEncodeText(latex)}$$ </w:t></w:r>`
      } catch { return `<w:r><w:t xml:space="preserve"> ${EQUATION_PLACEHOLDER} </w:t></w:r>` }
    })
    patched = patched.replace(/<m:oMath[^>]*>([\s\S]*?)<\/m:oMath>/g, (_: string, inner: string) => {
      try {
        const latex = walkOmml(inner).trim()
        if (!latex) return `<w:r><w:t xml:space="preserve"> ${EQUATION_PLACEHOLDER} </w:t></w:r>`
        return `<w:r><w:t xml:space="preserve"> $${xmlEncodeText(latex)}$ </w:t></w:r>`
      } catch { return `<w:r><w:t xml:space="preserve"> ${EQUATION_PLACEHOLDER} </w:t></w:r>` }
    })
    if (patched === xml) return buffer
    zip.file('word/document.xml', patched)
    return await zip.generateAsync({ type: 'nodebuffer' })
  } catch { return buffer }
}

function cleanExtractedHtml(html: string): string {
  return html
    .replace(/<img[^>]*>/gi, ` ${EQUATION_PLACEHOLDER} `)
    .replace(/<u>([\s\S]*?)<\/u>/gi, '[U]$1[/U]')
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, '[B]$1[/B]')
    .replace(/<b>([\s\S]*?)<\/b>/gi, '[B]$1[/B]')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"')
    .replace(/\.{4,}/g, ` ${EQUATION_PLACEHOLDER} `)
    .replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const patchedBuffer = await convertOmmlInDocx(buffer)
  const result = await mammoth.convertToHtml(
    { buffer: patchedBuffer },
    { styleMap: ['u => u', 'b => strong', 'i => em'] },
  )
  return cleanExtractedHtml(result.value)
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return result.text
  } finally {
    await parser.destroy()
  }
}

// =============================================================================
// Vision pipeline: PDF → images, images → base64
// =============================================================================

interface ImagePayload {
  base64: string
  mimeType: string
}

async function pdfToImages(buffer: Buffer): Promise<ImagePayload[]> {
  // Dynamic imports to avoid bundling these large modules unless needed
  const [canvasModule, pdfjsModule] = await Promise.all([
    import('@napi-rs/canvas'),
    import('pdfjs-dist/legacy/build/pdf.mjs'),
  ])

  const { createCanvas } = canvasModule
  const pdfjs = pdfjsModule as typeof import('pdfjs-dist')

  // Disable web worker for server-side (Node.js) rendering
  pdfjs.GlobalWorkerOptions.workerSrc = ''

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableFontFace: true,
  })
  const pdf = await loadingTask.promise
  const numPages = Math.min(pdf.numPages, MAX_VISION_PAGES)
  const results: ImagePayload[] = []

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: VISION_SCALE })
    const w = Math.floor(viewport.width)
    const h = Math.floor(viewport.height)

    const napiCanvas = createCanvas(w, h)
    const ctx = napiCanvas.getContext('2d')

    // pdfjs-dist v6 requires both canvasContext and canvas in RenderParameters
    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
      canvas: napiCanvas as unknown as HTMLCanvasElement,
    }).promise

    // @napi-rs/canvas encode() returns Promise<Buffer>
    const pngBuffer: Buffer = await (napiCanvas as unknown as { encode(fmt: string): Promise<Buffer> }).encode('png')
    results.push({ base64: pngBuffer.toString('base64'), mimeType: 'image/png' })

    page.cleanup()
  }

  // cleanup the PDF document (pdfjs-dist v6 doesn't expose destroy())
  try { pdf.cleanup() } catch { /* optional cleanup */ }
  return results
}

async function getImagesFromFile(file: File): Promise<ImagePayload[]> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = fileExt(file.name)

  if (IMAGE_EXTS.has(ext)) {
    const mimeMap: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
    }
    return [{ base64: buffer.toString('base64'), mimeType: mimeMap[ext] ?? 'image/jpeg' }]
  }

  if (ext === 'pdf') {
    return pdfToImages(buffer)
  }

  throw new Error('Unsupported file type for vision parsing')
}

// =============================================================================
// AI calls
// =============================================================================

async function callVisionAPI(images: ImagePayload[]): Promise<{ questions?: unknown }> {
  const openai = getOpenAIClient()

  const imageContent = images.map(({ base64, mimeType }) => ({
    type: 'image_url' as const,
    image_url: {
      url: `data:${mimeType};base64,${base64}`,
      detail: 'high' as const,
    },
  }))

  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL_VISION,
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 8000,
    messages: [
      { role: 'system', content: VISION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          ...imageContent,
          { type: 'text' as const, text: 'Extract all questions from these exam pages.' },
        ],
      },
    ],
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new Error('AI không trả về kết quả')
  return JSON.parse(raw) as { questions?: unknown }
}

async function callTextAPI(text: string): Promise<{ questions?: unknown }> {
  const openai = getOpenAIClient()
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL_CHAT,
    response_format: { type: 'json_object' },
    temperature: 0.1,
    messages: [
      { role: 'system', content: TEXT_SYSTEM_PROMPT },
      { role: 'user', content: text.slice(0, MAX_TEXT_CHARS) },
    ],
  })
  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new Error('AI không trả về kết quả')
  return JSON.parse(raw) as { questions?: unknown }
}

// =============================================================================
// Normalisation helpers
// =============================================================================

function resolveLeftoverPlaceholders(text: string): string {
  // Replace any remaining [EQUATION] with a LaTeX placeholder that renders as '...'
  return text.split(EQUATION_PLACEHOLDER).join('$\\dots$')
}

function stripLabelPrefix(text: string): string {
  return text.replace(/^\s*[A-Za-z][.)\-:]\s*/, '').trim()
}

function cleanText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return resolveLeftoverPlaceholders(normalizeLatexDelimiters(value.trim()))
}

function normalizeOptions(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw.filter((o): o is string => typeof o === 'string') : []
  const result = arr
    .slice(0, 4)
    .map((o) => stripLabelPrefix(resolveLeftoverPlaceholders(normalizeLatexDelimiters(o.trim()))))
  while (result.length < 4) result.push('')
  return result
}

function normalizeSubQuestions(raw: unknown): ExtractedSubQuestion[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): ExtractedSubQuestion | null => {
      if (typeof item !== 'object' || item === null) return null
      const r = item as Record<string, unknown>
      const content = stripLabelPrefix(cleanText(r.content))
      if (!content) return null
      const label = typeof r.label === 'string' && r.label.trim() ? r.label.trim() : ''
      const correctAnswer = r.correctAnswer === true ? true : r.correctAnswer === false ? false : undefined
      return { label, content, correctAnswer }
    })
    .filter((x): x is ExtractedSubQuestion => x !== null)
    .map((x, i) => ({ ...x, label: x.label || String.fromCharCode(97 + i) }))
}

function toLetterCorrectAnswer(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.min(3, Math.max(0, Math.round(value)))
  if (typeof value === 'string') {
    const l = value.trim().toUpperCase().replace(/[^ABCD]/g, '')
    const idx = 'ABCD'.indexOf(l[0] ?? '')
    if (idx !== -1) return idx
  }
  return 0
}

function inferType(r: Record<string, unknown>): QuestionType {
  if (Array.isArray(r.subQuestions) && r.subQuestions.length > 0) return 'TRUE_FALSE_GROUP'
  if (Array.isArray(r.options) && r.options.filter((o) => typeof o === 'string' && o.trim()).length >= 2) return 'MULTIPLE_CHOICE'
  if (typeof r.correctAnswer === 'string' || typeof r.correctAnswer === 'number') return 'SHORT_ANSWER'
  return 'ESSAY'
}

function normalizeQuestion(item: unknown): ExtractedQuestion | null {
  if (typeof item !== 'object' || item === null) return null
  const r = item as Record<string, unknown>
  const content = cleanText(r.content)
  if (!content) return null
  const rawType = typeof r.type === 'string' ? r.type.trim().toUpperCase() : ''
  const type: QuestionType = VALID_TYPES.includes(rawType as QuestionType) ? (rawType as QuestionType) : inferType(r)
  const explanation = cleanText(r.explanation) || undefined
  const points = 1
  const topic = typeof r.topic === 'string' ? r.topic.trim() : undefined

  if (type === 'MULTIPLE_CHOICE') {
    const options = normalizeOptions(r.options)
    if (options.every((o) => !o)) return null
    return { type, topic, content, options, correctAnswer: toLetterCorrectAnswer(r.correctAnswer), explanation, points }
  }
  if (type === 'TRUE_FALSE_GROUP') {
    const subQuestions = normalizeSubQuestions(r.subQuestions)
    if (subQuestions.length === 0) return null
    return { type, topic, content, subQuestions, explanation, points }
  }
  if (type === 'SHORT_ANSWER') {
    const ca = typeof r.correctAnswer === 'string'
      ? resolveLeftoverPlaceholders(r.correctAnswer.trim())
      : typeof r.correctAnswer === 'number' ? String(r.correctAnswer) : ''
    if (!ca) return null
    return { type, topic, content, correctAnswer: ca, explanation, points }
  }
  return { type: 'ESSAY', topic, content, explanation, points }
}

function normalizeQuestions(raw: unknown): ExtractedQuestion[] {
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeQuestion).filter((x): x is ExtractedQuestion => x !== null)
}

// =============================================================================
// Main server action
// =============================================================================

export async function parseQuizFileAction(
  formData: FormData,
): Promise<ActionResult<{ questions: ExtractedQuestion[]; usedVision: boolean }>> {
  const file = formData.get('file')

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'Không tìm thấy tệp hợp lệ' }
  }
  if (file.size > MAX_FILE_BYTES) {
    return { success: false, error: 'Tệp quá lớn (tối đa 10MB)' }
  }

  const ext = fileExt(file.name)
  if (!ALL_EXTS.has(ext)) {
    return { success: false, error: 'Chỉ hỗ trợ .docx, .pdf, .png, .jpg, .jpeg, .webp' }
  }

  let parsedRaw: { questions?: unknown }
  let usedVision = false

  try {
    if (VISION_EXTS.has(ext)) {
      // Vision path — PDF pages → images OR direct image → GPT-4o Vision
      const images = await getImagesFromFile(file)
      if (images.length === 0) throw new Error('Không thể trích xuất hình ảnh từ tệp')
      parsedRaw = await callVisionAPI(images)
      usedVision = true
    } else {
      // DOCX text path — OMML parser → text → GPT-4o text
      const buffer = Buffer.from(await file.arrayBuffer())
      const text = await extractDocxText(buffer)
      if (!text || text.trim().length < 20) {
        return { success: false, error: 'Không tìm thấy nội dung văn bản trong tệp DOCX' }
      }
      parsedRaw = await callTextAPI(text)
    }
  } catch (err) {
    // If vision fails for PDF, try text extraction as fallback
    if (ext === 'pdf') {
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const text = await extractPdfText(buffer)
        if (text && text.trim().length >= 20) {
          parsedRaw = await callTextAPI(text)
        } else {
          throw new Error('Nội dung PDF trống')
        }
      } catch (fallbackErr) {
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: `Không thể phân tích PDF: ${msg}` }
      }
    } else {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định'
      return { success: false, error: `Không thể phân tích tệp: ${msg}` }
    }
  }

  const questions = normalizeQuestions(parsedRaw!.questions)
  if (questions.length === 0) {
    return { success: false, error: 'Không tìm thấy câu hỏi nào trong tệp' }
  }

  return { success: true, data: { questions, usedVision } }
}
