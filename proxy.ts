import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getVerifiedAuthIdentity } from '@/lib/auth/claims'

const AUTH_PREFIXES = ['/login', '/signup', '/auth']
const AUTH_COOKIE_HINT = /^(sb-|sb:)/
const GET_CLAIMS_TIMEOUT_MS = 4_000

function isAuthCallback(pathname: string): boolean {
  return pathname === '/auth/callback' || pathname.startsWith('/auth/callback/')
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

/** Login/signup entry points — redirect away when already signed in (not callback). */
function isAuthEntryRoute(pathname: string): boolean {
  return isAuthRoute(pathname) && !isAuthCallback(pathname)
}

function isPublicRoute(pathname: string): boolean {
  return pathname === '/' || isAuthRoute(pathname)
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

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  return NextResponse.redirect(url)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasSessionCookie = hasSupabaseAuthCookie(request)
  const publicRoute = isPublicRoute(pathname)

  // No session cookie: skip Auth network entirely.
  if (!hasSessionCookie) {
    if (publicRoute) return NextResponse.next({ request })
    return redirectToLogin(request)
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    if (publicRoute) return NextResponse.next({ request })
    return redirectToLogin(request)
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

  let userId: string | null = null
  try {
    const result = await withTimeout(
      getVerifiedAuthIdentity(supabase),
      GET_CLAIMS_TIMEOUT_MS,
    )
    userId = result.identity?.id ?? null

    // Stale / missing refresh token: wipe cookies, never redirect-loop /login → /login
    if (result.error?.code === 'refresh_token_not_found') {
      try {
        await withTimeout(supabase.auth.signOut(), 2_000)
      } catch {
        // ignore
      }
      clearSupabaseCookies(response, request)
      if (publicRoute) return response
      const redirect = redirectToLogin(request)
      clearSupabaseCookies(redirect, request)
      return redirect
    }
  } catch {
    // Timeout / network: treat as logged-out for public routes
    if (publicRoute) {
      clearSupabaseCookies(response, request)
      return response
    }
    const redirect = redirectToLogin(request)
    clearSupabaseCookies(redirect, request)
    return redirect
  }

  if (!userId && !publicRoute) {
    return redirectToLogin(request)
  }

  if (userId && isAuthEntryRoute(pathname)) {
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
    /*
     * Skip static assets and Next internals — Auth only for document/RSC/API navigations.
     * Public routes without a session cookie still short-circuit inside `proxy`.
     */
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff2?|ttf|eot|otf)$).*)',
  ],
}
