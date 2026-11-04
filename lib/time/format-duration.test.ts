import { describe, expect, it } from 'vitest'
import { formatDurationMs, formatDurationSeconds } from '@/lib/time/format-duration'

describe('formatDurationSeconds', () => {
  it('returns em dash for invalid input', () => {
    expect(formatDurationSeconds(Number.NaN)).toBe('—')
    expect(formatDurationSeconds(-1)).toBe('—')
    expect(formatDurationSeconds(Number.POSITIVE_INFINITY)).toBe('—')
  })

  it('formats whole seconds and fractional with comma', () => {
    expect(formatDurationSeconds(0)).toBe('0 giây')
    expect(formatDurationSeconds(12)).toBe('12 giây')
    expect(formatDurationSeconds(12.5)).toBe('12,5 giây')
  })

  it('formats whole-minute spans as phút', () => {
    expect(formatDurationSeconds(60)).toBe('1 phút')
    expect(formatDurationSeconds(90)).toBe('1 phút 30 giây')
    expect(formatDurationSeconds(120)).toBe('2 phút')
  })

  it('appends /câu when perQuestion', () => {
    expect(formatDurationSeconds(15, { perQuestion: true })).toBe('15 giây/câu')
    expect(formatDurationSeconds(60, { perQuestion: true })).toBe('1 phút/câu')
  })
})

describe('formatDurationMs', () => {
  it('converts ms to seconds display', () => {
    expect(formatDurationMs(1500)).toBe('1,5 giây')
    expect(formatDurationMs(60_000)).toBe('1 phút')
  })
})
