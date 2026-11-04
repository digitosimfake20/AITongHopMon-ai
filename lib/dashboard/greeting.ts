/** Student-facing clock for greetings — VN locale product, independent of server TZ. */
export const STUDENT_DISPLAY_TIMEZONE = 'Asia/Ho_Chi_Minh'

/**
 * Time-of-day greeting in Asia/Ho_Chi_Minh so SSR (often UTC on Vercel) matches
 * what Vietnamese students expect — avoids React #418 from `Date#getHours()` in
 * client components (server local hour ≠ browser local hour).
 */
export function getTimeOfDayGreeting(
  now: Date = new Date(),
  timeZone: string = STUDENT_DISPLAY_TIMEZONE,
): string {
  const hourPart = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hourCycle: 'h23',
    timeZone,
  })
    .formatToParts(now)
    .find((part) => part.type === 'hour')?.value

  const hour = Number(hourPart ?? '0')
  if (hour < 12) return 'Chào buổi sáng'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

export function formatStudentGreeting(studentName: string, now?: Date): string {
  return `${getTimeOfDayGreeting(now)}, ${studentName}!`
}
