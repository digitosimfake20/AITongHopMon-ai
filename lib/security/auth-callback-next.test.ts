import { describe, expect, it } from 'vitest'
import { sanitizeAuthCallbackNext } from '@/lib/security/auth-callback-next'

const ORIGIN = 'https://app.example.com'

describe('sanitizeAuthCallbackNext', () => {
  it('defaults nullish / empty values to onboarding', () => {
    expect(sanitizeAuthCallbackNext(null, ORIGIN)).toBe('/onboarding')
    expect(sanitizeAuthCallbackNext(undefined, ORIGIN)).toBe('/onboarding')
    expect(sanitizeAuthCallbackNext('', ORIGIN)).toBe('/onboarding')
    expect(sanitizeAuthCallbackNext('   ', ORIGIN)).toBe('/onboarding')
  })

  it('allows same-origin relative paths with query and hash', () => {
    expect(sanitizeAuthCallbackNext('/dashboard', ORIGIN)).toBe('/dashboard')
    expect(sanitizeAuthCallbackNext('/quiz/result/abc?x=1#top', ORIGIN)).toBe(
      '/quiz/result/abc?x=1#top',
    )
  })

  it('rejects absolute and protocol-relative open redirects', () => {
    expect(sanitizeAuthCallbackNext('https://evil.example/phish', ORIGIN)).toBe(
      '/onboarding',
    )
    expect(sanitizeAuthCallbackNext('http://evil.example', ORIGIN)).toBe(
      '/onboarding',
    )
    expect(sanitizeAuthCallbackNext('//evil.example/phish', ORIGIN)).toBe(
      '/onboarding',
    )
    expect(sanitizeAuthCallbackNext('javascript:alert(1)', ORIGIN)).toBe(
      '/onboarding',
    )
  })

  it('rejects non-path values and backslash smuggling', () => {
    expect(sanitizeAuthCallbackNext('dashboard', ORIGIN)).toBe('/onboarding')
    expect(sanitizeAuthCallbackNext('\\/evil.example', ORIGIN)).toBe(
      '/onboarding',
    )
  })

  it('rejects userinfo and encoded open-redirect breakouts', () => {
    expect(sanitizeAuthCallbackNext('@evil.example', ORIGIN)).toBe('/onboarding')
    expect(sanitizeAuthCallbackNext('/@evil.example', ORIGIN)).toBe('/onboarding')
    expect(sanitizeAuthCallbackNext('/%40evil.example', ORIGIN)).toBe(
      '/onboarding',
    )
    expect(sanitizeAuthCallbackNext('/%2f%2fevil.example', ORIGIN)).toBe(
      '/onboarding',
    )
  })

  it('still allowlists relative paths when origin is omitted', () => {
    expect(sanitizeAuthCallbackNext('/onboarding')).toBe('/onboarding')
    expect(sanitizeAuthCallbackNext('//evil.example')).toBe('/onboarding')
    expect(sanitizeAuthCallbackNext('https://evil.example')).toBe('/onboarding')
    expect(sanitizeAuthCallbackNext('@evil.example')).toBe('/onboarding')
  })
})
