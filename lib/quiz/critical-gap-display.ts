/** Short plain-language title for a critical-gap card (LaTeX stripped). */
export function criticalGapHeadline(content: string | null | undefined, topicFallback: string): string {
  const stripped = (content ?? '')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$]*\$/g, ' ')
    .replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const base = stripped.length > 0 ? stripped : topicFallback
  if (base.length <= 88) return base
  return `${base.slice(0, 85).trim()}…`
}
