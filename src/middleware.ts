import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Protected admin and CRM path prefixes
const PROTECTED_PREFIXES = ['/admin', '/crm']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if current route requires authentication
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  if (isProtected) {
    const sessionCookie = request.cookies.get('session_token')?.value

    if (!sessionCookie || !sessionCookie.includes('.')) {
      // Unauthenticated: redirect to /login with return URL
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    try {
      // Decode and check expiration
      const [payloadB64] = sessionCookie.split('.')
      const jsonStr = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
      const payload = JSON.parse(jsonStr)

      if (!payload.expiresAt || payload.expiresAt < Date.now()) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        loginUrl.searchParams.set('error', 'session_expired')
        const response = NextResponse.redirect(loginUrl)
        response.cookies.delete('session_token')
        return response
      }
    } catch {
      // Malformed cookie
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/crm/:path*'],
}
