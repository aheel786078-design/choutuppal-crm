import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { getSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const sessionUser = await getAuthenticatedUser(req)
    if (!sessionUser) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        user: null,
      })
    }

    let fullName = sessionUser.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Platform User'
    let email = ''

    // Enrich from Supabase profile if possible
    const supabase = getSupabaseAdminClient()
    if (isSupabaseConfigured && supabase) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', sessionUser.phone)
        .single()

      if (profile?.full_name) fullName = profile.full_name
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        userId: sessionUser.userId,
        phone: sessionUser.phone,
        name: fullName,
        email,
        role: sessionUser.role,
        territoryId: sessionUser.territoryId,
        expiresAt: sessionUser.expiresAt,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, authenticated: false, error: err.message },
      { status: 500 }
    )
  }
}
