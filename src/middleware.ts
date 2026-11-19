import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Protected path prefixes
const PROTECTED_PREFIXES = ['/admin', '/crm', '/dashboard']
const ADMIN_ONLY_PREFIXES = ['/admin', '/crm']

function isPrivilegedRole(role?: string): boolean {
  return (
    role === 'SUPER_ADMIN' ||
    role === 'PLATFORM_OPERATOR' ||
    role === 'FRANCHISE_ADMIN' ||
    role === 'FRANCHISE_STAFF' ||
    role === 'STAFF'
  )
}

function parseSessionCookie(cookieValue?: string): any | null {
  if (!cookieValue || !cookieValue.includes('.')) return null
  try {
    const [payloadB64] = cookieValue.split('.')
    const jsonStr = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(jsonStr)
    if (!payload.expiresAt || payload.expiresAt < Date.now()) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('session_token')?.value
  const session = parseSessionCookie(sessionCookie)

  // 1. If user is ALREADY logged in and visits /login, redirect away from login page
  if (pathname === '/login') {
    if (session) {
      const hasAdminAccess = isPrivilegedRole(session.role)
      const requestedRedirect = request.nextUrl.searchParams.get('redirect')

      if (
        requestedRedirect &&
        requestedRedirect.startsWith('/') &&
        !requestedRedirect.startsWith('//') &&
        !requestedRedirect.includes('://')
      ) {
        // Only allow admin redirect if user actually has admin rights
        const isTargetAdmin = ADMIN_ONLY_PREFIXES.some(
          (prefix) => requestedRedirect === prefix || requestedRedirect.startsWith(`${prefix}/`)
        )
        if (!isTargetAdmin || hasAdminAccess) {
          return NextResponse.redirect(new URL(requestedRedirect, request.url))
        }
      }

      return NextResponse.redirect(
        new URL(hasAdminAccess ? '/admin/dashboard' : '/dashboard', request.url)
      )
    }
    return NextResponse.next()
  }

  // 2. Check if current route requires authentication
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  if (isProtected) {
    if (!session) {
      // Unauthenticated or expired: redirect to /login with return URL
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      const response = NextResponse.redirect(loginUrl)
      if (sessionCookie) {
        response.cookies.delete('session_token')
      }
      return response
    }

    // Role check: public users / merchants cannot access /admin or /crm
    const isAdminRoute = ADMIN_ONLY_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )

    if (isAdminRoute) {
      const hasAdminAccess = isPrivilegedRole(session.role)
      if (!hasAdminAccess) {
        // Non-admin attempted to open admin/crm -> safely divert to merchant dashboard
        const dashboardUrl = new URL('/dashboard', request.url)
        return NextResponse.redirect(dashboardUrl)
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/crm',
    '/crm/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/login',
  ],
}
