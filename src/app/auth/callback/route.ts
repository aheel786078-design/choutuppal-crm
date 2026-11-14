import { NextResponse } from 'next/server'
import { getSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase'
import { createSignedSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth-server'
import { FLAGSHIP_TERRITORY_ID } from '@/lib/store'

export const dynamic = 'force-dynamic'

/**
 * Supabase Auth Callback Handler
 * Handles OAuth redirects, PKCE code exchange, Magic link verification, and email confirmation.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  // Validate next path to prevent Open Redirects (CWE-601)
  const safeNext =
    next.startsWith('/') && !next.startsWith('//') && !next.includes('://') ? next : '/dashboard'

  const supabase = getSupabaseAdminClient()

  if (!supabase || !isSupabaseConfigured) {
    return NextResponse.redirect(`${origin}${safeNext}`)
  }

  try {
    let authenticatedUser: { id: string; phone?: string; email?: string; role?: string } | null = null

    // 1. Verify OTP token_hash (e.g. Email confirmation, Magic Link)
    if (tokenHash && type) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as any,
      })

      if (!error && data.user) {
        authenticatedUser = {
          id: data.user.id,
          phone: data.user.phone || (data.user.user_metadata?.phone as string) || '',
          email: data.user.email || '',
          role: (data.user.user_metadata?.role as string) || 'MERCHANT',
        }
      }
    }

    // 2. Exchange authorization code for session (PKCE / OAuth / Social login)
    if (!authenticatedUser && code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error && data.user) {
        authenticatedUser = {
          id: data.user.id,
          phone: data.user.phone || (data.user.user_metadata?.phone as string) || '',
          email: data.user.email || '',
          role: (data.user.user_metadata?.role as string) || 'MERCHANT',
        }
      }
    }

    if (authenticatedUser) {
      // Look up public.profiles for full role and territory scoping
      let userRole = authenticatedUser.role || 'MERCHANT'
      let territoryId = FLAGSHIP_TERRITORY_ID
      let userPhone = authenticatedUser.phone || ''

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authenticatedUser.id)
          .single()

        if (profile) {
          if (profile.role) userRole = profile.role
          if (profile.territory_id) territoryId = profile.territory_id
          if (profile.phone && !userPhone) userPhone = profile.phone
        }
      } catch {}

      // Create signed session token for our application
      const sessionToken = createSignedSessionToken({
        userId: authenticatedUser.id,
        phone: userPhone,
        role: userRole,
        territoryId,
      })

      // Determine appropriate landing page
      let targetPath = safeNext
      if (safeNext === '/dashboard' || safeNext === '/') {
        if (userRole === 'SUPER_ADMIN' || userRole === 'PLATFORM_OPERATOR' || userRole === 'FRANCHISE_ADMIN') {
          targetPath = '/admin/dashboard'
        } else {
          targetPath = '/dashboard'
        }
      }

      const response = NextResponse.redirect(`${origin}${targetPath}`)
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
      })

      return response
    }
  } catch (err: any) {
    console.error('[Supabase Auth Callback Error]', err)
  }

  // Fallback to login with error parameter
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
