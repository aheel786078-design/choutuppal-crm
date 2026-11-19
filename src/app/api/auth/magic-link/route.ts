import { NextResponse } from 'next/server'
import { generateMagicToken, verifyMagicToken, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import { createSignedSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth-server'
import { sendWhatsAppFlowMessage } from '@/lib/whatsapp-cloud-api'

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
    const isSuperAdmin = cleanPhone === '9441348175'
    const isOperator = cleanPhone === '9494348175'
    const isKnownFranchise = cleanPhone === '9848012345' || cleanPhone === '9848098765'
    const defaultRole = isSuperAdmin ? 'SUPER_ADMIN' : isOperator ? 'PLATFORM_OPERATOR' : isKnownFranchise ? 'FRANCHISE_ADMIN' : 'USER'
    const userRole = role || defaultRole

    const token = generateMagicToken({
      phone: cleanPhone,
      territoryId: territoryId || (isSuperAdmin ? FLAGSHIP_TERRITORY_ID : undefined),
      role: userRole,
    })

    const isPrivileged =
      userRole === 'SUPER_ADMIN' ||
      userRole === 'PLATFORM_OPERATOR' ||
      userRole === 'FRANCHISE_ADMIN' ||
      userRole === 'FRANCHISE_STAFF' ||
      userRole === 'STAFF'
    const targetRedirect = body.redirect || (isPrivileged ? '/admin/dashboard' : '/dashboard')
    const magicLink = `https://choutuppal.in/login?magic=${encodeURIComponent(token)}`
    const verifyUrl = `/api/auth/magic-link?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(targetRedirect)}`

    // Also dispatch WhatsApp message via Meta Cloud API
    try {
      const waText =
        `🔑 *చౌటుప్పల్ యాప్ సురక్షిత లాగిన్ లింక్*\n\n` +
        `మీ డ్యాష్‌బోర్డ్‌ను పాస్‌వర్డ్ లేకుండా తెరవడానికి క్రింది లింక్‌ను నొక్కండి (15 నిమిషాల వ్యవధి):\n\n` +
        `👉 ${magicLink}\n\n` +
        `🌐 Website: https://choutuppal.in`

      await sendWhatsAppFlowMessage({
        toPhone: cleanPhone,
        messageText: waText,
        buttons: [
          { id: 'btn_open_dashboard', title: '🚀 డ్యాష్‌బోర్డ్' },
          { id: 'btn_back_to_menu', title: '📋 ప్రధాన మెనూ' },
        ],
        territoryId: territoryId || FLAGSHIP_TERRITORY_ID,
      })
    } catch (waErr) {
      console.warn('[Magic Link] Outbound WhatsApp notification error:', waErr)
    }

    return NextResponse.json({
      success: true,
      token,
      magicLink,
      verifyUrl,
      redirect: targetRedirect,
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
      const acceptHeader = req.headers.get('accept') || ''
      if (acceptHeader.includes('text/html')) {
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(result.error || 'Invalid or expired token')}`, req.url))
      }
      return NextResponse.json({ success: false, error: result.error || 'Invalid or expired token.' }, { status: 401 })
    }

    const userPhone = (result.phone || '').replace(/\D/g, '')
    const isSuperAdmin = userPhone === '9441348175'
    const isOperator = userPhone === '9494348175'
    const isKnownFranchise = userPhone === '9848012345' || userPhone === '9848098765'
    const defaultRole = isSuperAdmin ? 'SUPER_ADMIN' : isOperator ? 'PLATFORM_OPERATOR' : isKnownFranchise ? 'FRANCHISE_ADMIN' : 'USER'
    const userRole = result.role || defaultRole
    const territoryId = result.territoryId || FLAGSHIP_TERRITORY_ID

    // Create cryptographically signed HMAC session token
    const sessionToken = createSignedSessionToken({
      phone: userPhone,
      role: userRole,
      territoryId,
    })

    // Validate safe redirect target to prevent Open Redirects (CWE-601)
    const isPrivileged =
      userRole === 'SUPER_ADMIN' ||
      userRole === 'PLATFORM_OPERATOR' ||
      userRole === 'FRANCHISE_ADMIN' ||
      userRole === 'FRANCHISE_STAFF' ||
      userRole === 'STAFF'
    let defaultDest = isPrivileged ? '/admin/dashboard' : '/dashboard'
    let safeRedirect = defaultDest
    if (redirectUrl && redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') && !redirectUrl.includes('://')) {
      // If non-privileged user requested admin route, divert safely to merchant/user dashboard
      if (!isPrivileged && (redirectUrl.startsWith('/admin') || redirectUrl.startsWith('/crm'))) {
        safeRedirect = '/dashboard'
      } else {
        safeRedirect = redirectUrl
      }
    }

    const acceptHeader = req.headers.get('accept') || ''
    const isDirectBrowserNav = acceptHeader.includes('text/html')

    const response = isDirectBrowserNav
      ? NextResponse.redirect(new URL(safeRedirect, req.url))
      : NextResponse.json({
          success: true,
          authenticated: true,
          phone: userPhone,
          role: userRole,
          territoryId,
          redirect: safeRedirect,
          message: 'Successfully authenticated! Secure session established.',
        })

    // Set secure HTTP-only session cookie
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
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
