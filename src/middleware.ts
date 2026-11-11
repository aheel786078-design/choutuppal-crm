import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Protected path prefixes
const PROTECTED_PREFIXES = ['/admin', '/crm', '/dashboard']
const ADMIN_ONLY_PREFIXES = ['/admin', '/crm']

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

      // Role check: merchants cannot access /admin or /crm
      const isAdminRoute = ADMIN_ONLY_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
      )

      if (isAdminRoute) {
        const role = payload.role
        const hasAdminAccess =
          role === 'SUPER_ADMIN' ||
          role === 'PLATFORM_OPERATOR' ||
          role === 'FRANCHISE_ADMIN' ||
          role === 'FRANCHISE_STAFF' ||
          role === 'STAFF'
        if (!hasAdminAccess) {
          // Merchant attempted to open admin/crm -> safely divert to their merchant dashboard
          const dashboardUrl = new URL('/dashboard', request.url)
          return NextResponse.redirect(dashboardUrl)
        }
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
  matcher: ['/admin/:path*', '/crm/:path*', '/dashboard/:path*'],
}
