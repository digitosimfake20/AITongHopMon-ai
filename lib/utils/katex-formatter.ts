/**
 * Normalizes LaTeX math delimiters from GPT/Vision output to KaTeX-compatible format.
 *
 * GPT models often output \(...\) for inline math and \[...\] for display math,
 * but our MathText renderer expects $...$ and $$...$$.
 */
export function normalizeLatexDelimiters(text: string): string {
  return text
    // Display math first (order matters — must run before inline)
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')
    // Inline math
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
}
