import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  })

  // Clear HTTP-only session cookie
  if (response.cookies?.set) {
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    })
  } else {
    response.headers.append(
      'set-cookie',
      `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=lax`
    )
  }

  return response
}

export async function GET() {
  return POST()
}
