/** Short status lines while a dashboard tab is opening. One line per click. */
export const NAV_WAIT_LINES = [
  'Đang tải',
  'Mở trang này',
  'Đang lấy bài',
  'Chờ một nhịp',
  'Sắp xong',
  'Đang mở mục',
] as const

export type NavWaitLine = (typeof NAV_WAIT_LINES)[number]

export function pickNavWaitLine(seed: number): NavWaitLine {
  const index = Math.abs(Math.trunc(seed)) % NAV_WAIT_LINES.length
  return NAV_WAIT_LINES[index]
}

export function hrefPath(href: string): string {
  const path = href.split('?')[0] ?? href
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

/** True once the App Router pathname matches the tab the user asked for. */
export function navArrived(pathname: string, href: string): boolean {
  const path = hrefPath(href)
  if (path === '/dashboard' || path === '/teacher') return pathname === path
  if (path.includes('/gaps')) return pathname.includes('/gaps')
  return pathname === path || pathname.startsWith(`${path}/`)
}

export function navClickBlocked(pendingHref: string | null): boolean {
  return pendingHref !== null
}
