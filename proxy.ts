import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const AUTH_PREFIXES = ['/login', '/signup', '/auth']
const AUTH_COOKIE_HINT = /^(sb-|sb:)/
const GET_USER_TIMEOUT_MS = 4_000

function isAuthRoute(pathname: string): boolean {
  return AUTH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function isPublicRoute(pathname: string): boolean {
  return pathname === '/' || isAuthRoute(pathname) || pathname.startsWith('/auth/callback')
}

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (cookie) => AUTH_COOKIE_HINT.test(cookie.name) || cookie.name.includes('-auth-token'),
  )
}

function clearSupabaseCookies(response: NextResponse, request: NextRequest) {
  for (const cookie of request.cookies.getAll()) {
    if (AUTH_COOKIE_HINT.test(cookie.name) || cookie.name.includes('-auth-token')) {
      response.cookies.set(cookie.name, '', {
        path: '/',
        maxAge: 0,
      })
    }
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('supabase-timeout')), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Public pages without session cookies: skip Auth entirely.
  if (isPublicRoute(pathname) && !hasSupabaseAuthCookie(request)) {
    return NextResponse.next({ request })
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isPublicRoute(pathname)) return NextResponse.next({ request })
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  let user: { id: string } | null = null
  try {
    const result = await withTimeout(supabase.auth.getUser(), GET_USER_TIMEOUT_MS)
    user = result.data.user

    // Stale / missing refresh token: wipe cookies, never redirect-loop /login → /login
    if (result.error?.code === 'refresh_token_not_found') {
      try {
        await withTimeout(supabase.auth.signOut(), 2_000)
      } catch {
        // ignore
      }
      clearSupabaseCookies(response, request)
      if (isPublicRoute(pathname)) return response
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      const redirect = NextResponse.redirect(url)
      clearSupabaseCookies(redirect, request)
      return redirect
    }
  } catch {
    // Timeout / network: treat as logged-out for public routes
    if (isPublicRoute(pathname)) {
      clearSupabaseCookies(response, request)
      return response
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirect = NextResponse.redirect(url)
    clearSupabaseCookies(redirect, request)
    return redirect
  }

  if (!user && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  const classId = request.nextUrl.searchParams.get('class')
  if (classId) {
    response.cookies.set('mathz_class_id', classId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
