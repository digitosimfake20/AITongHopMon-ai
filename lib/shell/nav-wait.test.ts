import { describe, expect, it } from 'vitest'
import {
  NAV_WAIT_LINES,
  hrefPath,
  navArrived,
  navClickBlocked,
  pickNavWaitLine,
} from '@/lib/shell/nav-wait'

describe('pickNavWaitLine', () => {
  it('rotates the status lines and stays inside the list', () => {
    expect(pickNavWaitLine(0)).toBe(NAV_WAIT_LINES[0])
    expect(pickNavWaitLine(1)).toBe('Mở trang này')
    expect(pickNavWaitLine(5)).toBe('Đang mở mục')
    expect(pickNavWaitLine(-3)).toBe(NAV_WAIT_LINES[3])
    expect(NAV_WAIT_LINES).toContain(pickNavWaitLine(99))
  })
})

describe('navArrived', () => {
  it('treats overview routes as exact matches', () => {
    expect(navArrived('/dashboard', '/dashboard')).toBe(true)
    expect(navArrived('/dashboard/extra', '/dashboard')).toBe(false)
    expect(navArrived('/teacher', '/teacher?class=abc')).toBe(true)
    expect(navArrived('/teacher/gaps', '/teacher')).toBe(false)
  })

  it('matches nested and gap routes after the click', () => {
    expect(navArrived('/quizzes', '/quizzes')).toBe(true)
    expect(navArrived('/teacher/students/stu-1', '/teacher/students?class=1')).toBe(true)
    expect(navArrived('/teacher/classes/c1/gaps', '/teacher/gaps?class=c1')).toBe(true)
    expect(navArrived('/teacher/assignments', '/teacher/gaps')).toBe(false)
  })
})

describe('navClickBlocked', () => {
  it('locks further tab clicks while a switch is in flight', () => {
    expect(navClickBlocked(null)).toBe(false)
    expect(navClickBlocked('/quizzes')).toBe(true)
  })
})

describe('hrefPath', () => {
  it('drops the class query used by teacher links', () => {
    expect(hrefPath('/teacher/gaps?class=abc')).toBe('/teacher/gaps')
  })
})
