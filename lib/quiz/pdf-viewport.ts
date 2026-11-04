const MAX_RENDER_EDGE = 2048
const MAX_SOURCE_EDGE = 20_000
const TARGET_SCALE = 2

export function fitPdfPage(
  width: number,
  height: number,
): { width: number; height: number } | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }
  if (Math.max(width, height) > MAX_SOURCE_EDGE) return null

  const scale = Math.min(TARGET_SCALE, MAX_RENDER_EDGE / width, MAX_RENDER_EDGE / height)
  return {
    width: Math.min(MAX_RENDER_EDGE, width * scale),
    height: Math.min(MAX_RENDER_EDGE, height * scale),
  }
}
