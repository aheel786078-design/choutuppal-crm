import { NextResponse } from 'next/server'
import { getSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase'
import { createSignedSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth-server'
import { FLAGSHIP_TERRITORY_ID, loadStore } from '@/lib/store'
import { normalizeIndianPhoneNumber } from '@/lib/crm-duplicates'

export const dynamic = 'force-dynamic'

// Rate limit tracker: 10 attempts per minute per IP
const rateLimitMap = new Map<string, { count: number; start: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const MAX_ATTEMPTS = 10

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  if (!record || now - record.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, start: now })
    return true
  }
  if (record.count >= MAX_ATTEMPTS) {
    return false
  }
  record.count++
  return true
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip'
    if (!checkRateLimit(`login_${ip}`)) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please wait a minute before retrying.' },
        { status: 429 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { email, phone, password, redirect: requestedRedirect } = body

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Password is required.' },
        { status: 400 }
      )
    }

    if (!email && !phone) {
      return NextResponse.json(
        { success: false, error: 'Please provide either an Email address or WhatsApp phone number.' },
        { status: 400 }
      )
    }

    let resolvedEmail = email ? String(email).trim().toLowerCase() : ''
    let resolvedPhone = phone ? normalizeIndianPhoneNumber(String(phone)) : ''

    let authenticatedUser: {
      userId: string
      email: string
      phone: string
      name: string
      role: string
      territoryId: string
      franchiseId?: string | null
    } | null = null

    const supabase = getSupabaseAdminClient()

    // 1. Check Supabase Auth if available
    if (isSupabaseConfigured && supabase) {
      try {
        let authEmailToTry = resolvedEmail

        // If phone provided without email, find email from public.profiles
        if (!authEmailToTry && resolvedPhone) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('phone', resolvedPhone)
            .single()

          if (profile) {
            // Find email from auth.admin
            const { data: userData } = await supabase.auth.admin.getUserById(profile.id)
            if (userData?.user?.email) {
              authEmailToTry = userData.user.email
            }
          }
        }

        if (authEmailToTry) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: authEmailToTry,
            password,
          })

          if (!signInErr && signInData.user) {
            const authUser = signInData.user
            // Fetch profile for accurate role and territory scoping
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authUser.id)
              .single()

            authenticatedUser = {
              userId: authUser.id,
              email: authUser.email || authEmailToTry,
              phone: profile?.phone || resolvedPhone || authUser.phone || '',
              name: profile?.full_name || authUser.user_metadata?.name || 'Portal User',
              role: profile?.role || authUser.user_metadata?.role || 'MERCHANT',
              territoryId: profile?.territory_id || authUser.user_metadata?.territory_id || FLAGSHIP_TERRITORY_ID,
              franchiseId: profile?.franchise_id || authUser.user_metadata?.franchise_id || null,
            }
          }
        }
      } catch (sbErr) {
        console.warn('[Auth Login] Supabase Auth check error, falling back to local credentials:', sbErr)
      }
    }

    // 2. Verified Built-In Administrative Accounts Fallback
    if (!authenticatedUser) {
      // Super Admin
      if (
        (resolvedEmail === 'admin@choutuppal.in' || resolvedPhone === '9441348175') &&
        password === 'Choutuppal@2026'
      ) {
        authenticatedUser = {
          userId: 'usr_admin',
          email: 'admin@choutuppal.in',
          phone: '9441348175',
          name: 'Super Admin',
          role: 'SUPER_ADMIN',
          territoryId: 'territory_choutuppal',
          franchiseId: null,
        }
      }
      // Choutuppal Platform Operator
      else if (
        (resolvedEmail === 'operator@choutuppal.in' || resolvedPhone === '9494348175') &&
        password === 'Choutuppal@2026'
      ) {
        authenticatedUser = {
          userId: 'usr_operator',
          email: 'operator@choutuppal.in',
          phone: '9494348175',
          name: 'Choutuppal Platform Operator',
          role: 'PLATFORM_OPERATOR',
          territoryId: 'territory_choutuppal',
          franchiseId: null,
        }
      }
      // Nalgonda Franchise Admin
      else if (
        (resolvedEmail === 'nalgonda.admin@choutuppal.in' || resolvedPhone === '9848012345') &&
        password === 'Nalgonda@2026'
      ) {
        authenticatedUser = {
          userId: 'usr_nalgonda_admin',
          email: 'nalgonda.admin@choutuppal.in',
          phone: '9848012345',
          name: 'Nalgonda Franchise Admin',
          role: 'FRANCHISE_ADMIN',
          territoryId: 'territory_nalgonda',
          franchiseId: 'fr_nalgonda_1793019978034',
        }
      }
      // Suryapet Franchise Admin
      else if (
        (resolvedEmail === 'suryapet.admin@choutuppal.in' || resolvedPhone === '9848098765') &&
        password === 'Suryapet@2026'
      ) {
        authenticatedUser = {
          userId: 'usr_suryapet_admin',
          email: 'suryapet.admin@choutuppal.in',
          phone: '9848098765',
          name: 'Suryapet Franchise Admin',
          role: 'FRANCHISE_ADMIN',
          territoryId: 'territory_suryapet',
          franchiseId: 'fr_1',
        }
      }
    }

    // 3. Reject if still unauthenticated
    if (!authenticatedUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid email/phone or password. Please try again.' },
        { status: 401 }
      )
    }

    // 4. Generate signed cryptographic session token
    const sessionToken = createSignedSessionToken({
      userId: authenticatedUser.userId,
      phone: authenticatedUser.phone,
      role: authenticatedUser.role,
      territoryId: authenticatedUser.territoryId,
    })

    // 5. Determine safe redirect target
    let targetRedirect = '/admin/dashboard'
    if (
      requestedRedirect &&
      requestedRedirect.startsWith('/') &&
      !requestedRedirect.startsWith('//') &&
      !requestedRedirect.includes('://')
    ) {
      targetRedirect = requestedRedirect
    } else {
      if (authenticatedUser.role === 'SUPER_ADMIN' || authenticatedUser.role === 'PLATFORM_OPERATOR') {
        targetRedirect = '/admin/dashboard'
      } else if (authenticatedUser.role === 'FRANCHISE_ADMIN' || authenticatedUser.role === 'FRANCHISE_STAFF') {
        targetRedirect = '/admin/dashboard'
      } else if (authenticatedUser.role === 'MERCHANT') {
        targetRedirect = '/admin/listings'
      } else {
        targetRedirect = '/'
      }
    }

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      user: authenticatedUser,
      redirect: targetRedirect,
      message: `Welcome back, ${authenticatedUser.name}! Authentication successful.`,
    })

    // Set secure HTTP-only session cookie
    if (response.cookies?.set) {
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
      })
    } else {
      response.headers.append(
        'set-cookie',
        `${SESSION_COOKIE_NAME}=${sessionToken}; Path=/; Max-Age=${24 * 60 * 60}; HttpOnly; SameSite=lax`
      )
    }

    return response
  } catch (err: any) {
    console.error('[API Auth Login] Unhandled error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 })
  }
}
