import { describe, expect, it } from 'vitest'
import { fitPdfPage } from '@/lib/quiz/pdf-viewport'

describe('fitPdfPage', () => {
  it('scales a normal page up and stays within 2048', () => {
    const fitted = fitPdfPage(612, 792)
    expect(fitted).toEqual({ width: 1224, height: 1584 })
    expect(fitted!.width).toBeLessThanOrEqual(2048)
    expect(fitted!.height).toBeLessThanOrEqual(2048)
  })

  it('clamps a large page so neither edge exceeds 2048', () => {
    const fitted = fitPdfPage(1024, 4096)
    expect(fitted).toEqual({ width: 512, height: 2048 })
  })

  it('rejects a page whose longer side is above 20000 points', () => {
    expect(fitPdfPage(20_001, 100)).toBeNull()
    expect(fitPdfPage(100, 30_000)).toBeNull()
  })

  it('returns null for a zero or NaN page', () => {
    expect(fitPdfPage(0, 792)).toBeNull()
    expect(fitPdfPage(612, 0)).toBeNull()
    expect(fitPdfPage(Number.NaN, 792)).toBeNull()
    expect(fitPdfPage(612, Number.NaN)).toBeNull()
  })
})
