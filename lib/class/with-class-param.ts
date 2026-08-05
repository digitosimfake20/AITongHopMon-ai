/** Append ?class= or &class= to a route so middleware sets the active-class cookie. */
export function withClassParam(href: string, classId: string): string {
  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}class=${classId}`
}
