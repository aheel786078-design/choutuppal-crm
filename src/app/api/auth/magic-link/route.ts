import { NextResponse } from 'next/server'
import { generateMagicToken, verifyMagicToken, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import { createSignedSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// Rate limit tracker: IP/Phone -> count, windowStart
const rateLimitMap = new Map<string, { count: number; start: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(key)
  if (!record || now - record.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, start: now })
    return true
  }
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false
  }
  record.count++
  return true
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip'
    const body = await req.json()
    const { phone, territoryId, role } = body

    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Valid 10-digit WhatsApp phone number is required.' },
        { status: 400 }
      )
    }

    // Rate limiting: 5 requests per minute per phone / IP
    if (!checkRateLimit(`gen_${phone}`) || !checkRateLimit(`gen_ip_${ip}`)) {
      return NextResponse.json(
        { success: false, error: 'Too many login link requests. Please wait a minute before retrying.' },
        { status: 429 }
      )
    }

    const cleanPhone = phone.replace(/\D/g, '')
    const token = generateMagicToken({
      phone: cleanPhone,
      territoryId: territoryId || (cleanPhone === '9441348175' ? FLAGSHIP_TERRITORY_ID : undefined),
      role: role || (cleanPhone === '9441348175' || cleanPhone === '9494348175' ? 'SUPER_ADMIN' : 'FRANCHISE_ADMIN'),
    })

    const magicLink = `https://choutuppal.in/login?magic=${token}`

    return NextResponse.json({
      success: true,
      token,
      magicLink,
      message: 'Cryptographically secure single-use magic login link generated (valid 15 minutes).',
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const redirectUrl = searchParams.get('redirect')

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 })
    }

    // Rate limit token verification attempts per IP to defeat online brute force
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip'
    if (!checkRateLimit(`verify_ip_${ip}`)) {
      return NextResponse.json(
        { success: false, error: 'Too many verification attempts. Please wait a minute.' },
        { status: 429 }
      )
    }

    const result = verifyMagicToken(token)
    if (!result.valid) {
      return NextResponse.json({ success: false, error: result.error || 'Invalid or expired token.' }, { status: 401 })
    }

    const userPhone = result.phone || ''
    const userRole = result.role || (userPhone === '9441348175' || userPhone === '9494348175' ? 'SUPER_ADMIN' : 'FRANCHISE_ADMIN')
    const territoryId = result.territoryId || FLAGSHIP_TERRITORY_ID

    // Create cryptographically signed HMAC session token
    const sessionToken = createSignedSessionToken({
      phone: userPhone,
      role: userRole,
      territoryId,
    })

    // Validate safe redirect target to prevent Open Redirects (CWE-601)
    let safeRedirect = '/admin'
    if (redirectUrl && redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') && !redirectUrl.includes('://')) {
      safeRedirect = redirectUrl
    }

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      phone: userPhone,
      role: userRole,
      territoryId,
      redirect: safeRedirect,
      message: 'Successfully authenticated! Secure session established.',
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
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
