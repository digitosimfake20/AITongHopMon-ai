const DEFAULT_NEXT = '/onboarding'

/**
 * Allowlist helper for post-auth `next` redirects.
 * Only same-origin relative paths are accepted; open redirects fall back to onboarding.
 * Route wiring can reuse this from `app/auth/callback` (issue #27).
 */
export function sanitizeAuthCallbackNext(
  next: string | null | undefined,
  origin?: string,
): string {
  const fallback = DEFAULT_NEXT
  if (next == null) return fallback

  const trimmed = next.trim()
  if (!trimmed) return fallback

  // Protocol-relative or scheme URLs (https:, javascript:, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return fallback
  if (trimmed.startsWith('//')) return fallback

  // Must be an absolute path on this origin
  if (!trimmed.startsWith('/')) return fallback

  // Reject path tricks that escape to another host when concatenated with origin
  if (trimmed.includes('\\')) return fallback

  if (origin) {
    try {
      const resolved = new URL(trimmed, origin)
      if (resolved.origin !== new URL(origin).origin) return fallback
      // Prefer path + search + hash from the resolved same-origin URL
      return `${resolved.pathname}${resolved.search}${resolved.hash}` || fallback
    } catch {
      return fallback
    }
  }

  // Without origin, still reject nested scheme smuggling after the first slash
  if (trimmed.includes('://')) return fallback

  return trimmed
}
