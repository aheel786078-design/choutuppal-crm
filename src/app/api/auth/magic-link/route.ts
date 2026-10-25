import { NextResponse } from 'next/server'
import { generateMagicToken, verifyMagicToken } from '@/lib/store'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { phone } = body

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 })
    }

    const token = generateMagicToken(phone)
    const magicLink = `https://choutuppal.in/login?magic=${token}`

    return NextResponse.json({
      success: true,
      token,
      magicLink,
      message: 'Magic login link generated (valid 15 minutes)',
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 })
    }

    const result = verifyMagicToken(token)
    if (!result.valid) {
      return NextResponse.json({ success: false, error: result.error }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      phone: result.phone,
      message: 'User successfully authenticated via single-use WhatsApp magic link.',
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
