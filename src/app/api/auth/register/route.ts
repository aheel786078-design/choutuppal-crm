import { NextResponse } from 'next/server'
import { getSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase'
import { createSignedSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth-server'
import { FLAGSHIP_TERRITORY_ID, loadStore, saveStore, logAuditEvent } from '@/lib/store'
import { normalizeIndianPhoneNumber } from '@/lib/crm-duplicates'
import { upsertContactDAO, upsertListingDAO } from '@/lib/supabase-dao'
import type { CRMContact, Listing } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const {
      name,
      phone,
      email,
      password,
      businessName,
      categoryId,
      villageId,
      villageName,
      address,
      role = 'MERCHANT',
      territoryId = FLAGSHIP_TERRITORY_ID,
    } = body

    // 1. Validation
    const cleanName = (name || '').trim()
    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Full Name is required and must be at least 2 characters.' },
        { status: 400 }
      )
    }

    const cleanPhone = normalizeIndianPhoneNumber(String(phone || ''))
    if (!cleanPhone || cleanPhone.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid 10-digit Indian WhatsApp phone number.' },
        { status: 400 }
      )
    }

    const cleanEmail = (email || '').trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address.' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()
    let userId = `usr_${cleanPhone}_${Date.now()}`

    // 2. Comprehensive check if user/phone/email already exists
    let phoneExists = false
    let emailExists = false

    try {
      const store = loadStore()
      if (store.users?.some((u: any) => u.phone === cleanPhone)) phoneExists = true
      if (store.contacts?.some((c: any) => c.phone === cleanPhone)) phoneExists = true
      if (cleanEmail && store.users?.some((u: any) => u.email === cleanEmail)) emailExists = true
    } catch {}

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: profByPhone } = await supabase
          .from('profiles')
          .select('id, phone')
          .eq('phone', cleanPhone)
          .maybeSingle()
        if (profByPhone) phoneExists = true

        const { data: contactByPhone } = await supabase
          .from('contacts')
          .select('id, phone')
          .eq('phone', cleanPhone)
          .maybeSingle()
        if (contactByPhone) phoneExists = true
      } catch {}
    }

    if (phoneExists) {
      return NextResponse.json(
        {
          success: false,
          error: `An account with phone number ${cleanPhone} already exists. Please sign in instead.`,
        },
        { status: 409 }
      )
    }

    if (emailExists) {
      return NextResponse.json(
        {
          success: false,
          error: `An account with email address "${cleanEmail}" already exists. Please sign in instead.`,
        },
        { status: 409 }
      )
    }

    // 3. Create user in Supabase Auth if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email: cleanEmail,
          password,
          email_confirm: true,
          phone: cleanPhone,
          phone_confirm: true,
          user_metadata: {
            name: cleanName,
            role,
            territory_id: territoryId,
            business_name: businessName || null,
          },
        })

        if (authErr) {
          if (authErr.message.toLowerCase().includes('already registered')) {
            return NextResponse.json(
              { success: false, error: `An account with email "${cleanEmail}" already exists. Please sign in instead.` },
              { status: 409 }
            )
          }
          console.warn('[Register] Supabase auth.admin.createUser warning:', authErr.message)
        } else if (authData?.user) {
          userId = authData.user.id

          // Upsert into public.profiles
          await supabase.from('profiles').upsert(
            {
              id: userId,
              phone: cleanPhone,
              full_name: cleanName,
              role,
              territory_id: territoryId,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
        }
      } catch (err: any) {
        console.warn('[Register] Supabase profile sync warning:', err.message)
      }
    }

    // 3. If Merchant with businessName, auto-provision listing and CRM lead
    let createdListingId: string | undefined
    let createdContactId: string | undefined

    if (businessName && businessName.trim().length >= 2) {
      const bName = businessName.trim()
      const contactId = `cnt_${Date.now()}`
      createdContactId = contactId

      const newContact: CRMContact = {
        id: contactId,
        territoryId,
        name: cleanName,
        businessName: bName,
        phone: cleanPhone,
        email: cleanEmail,
        tags: ['Merchant', 'Registered', 'New-Signup'],
        stage: 'NEW_LEAD',
        notes: `Self-registered via Web Portal on ${new Date().toLocaleDateString('en-IN')}`,
        messageCount: 0,
        lastContactAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }

      await upsertContactDAO(newContact).catch((err) =>
        console.warn('[Register] upsertContactDAO error:', err)
      )

      // Generate business listing
      const listingSlug = `${bName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${territoryId.replace('territory_', '')}`
      const listingId = `lst_${Date.now()}`
      createdListingId = listingId

      const newListing: Listing = {
        id: listingId,
        title: bName,
        slug: listingSlug,
        phone: cleanPhone,
        whatsapp: cleanPhone,
        email: cleanEmail,
        address: address || `${bName}, Choutuppal Mandal`,
        categoryId: categoryId || 'cat-food',
        categoryName: categoryId || 'Local Business',
        villageId: villageId || 'v-choutuppal',
        villageName: villageName || 'చౌటుప్పల్ (Choutuppal)',
        type: 'BUSINESS',
        description: `Verified merchant business registered by ${cleanName}.`,
        status: 'pending_approval',
        territoryId,
        coverImage: '/placeholder-business.jpg',
        gallery: [],
        isFeatured: false,
        isPremium: false,
        views: 0,
        clicks: 0,
        whatsappClicks: 0,
        syncedToCrm: true,
        crmLeadId: contactId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await upsertListingDAO(newListing).catch((err) =>
        console.warn('[Register] upsertListingDAO error:', err)
      )
    }

    // 4. Update local store users array for offline resilience
    try {
      const store = loadStore()
      if (!store.users) store.users = []
      const existingIdx = store.users.findIndex((u: any) => u.phone === cleanPhone || u.email === cleanEmail)
      const userRecord = {
        id: userId,
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        role: role as any,
        territoryId,
        isBanned: false,
        listingsCount: createdListingId ? 1 : 0,
        createdAt: new Date().toISOString(),
      }
      if (existingIdx >= 0) {
        store.users[existingIdx] = userRecord
      } else {
        store.users.push(userRecord)
      }
      saveStore(store)
    } catch (storeErr) {
      console.warn('[Register] Local store backup error:', storeErr)
    }

    // 5. Audit Log
    logAuditEvent({
      actorId: userId,
      actorName: cleanName,
      actorRole: role as any,
      action: 'user.registered',
      entityType: 'user',
      entityId: userId,
      outcome: 'SUCCESS',
      details: `Registered new ${role} account: "${cleanName}" (${cleanPhone}) in territory ${territoryId}`,
      territoryId,
      metadata: {
        email: cleanEmail,
        phone: cleanPhone,
        businessName: businessName || null,
        createdListingId,
        createdContactId,
      },
    })

    // 6. Create cryptographic signed session token & HTTP-only cookie
    const sessionToken = createSignedSessionToken({
      userId,
      phone: cleanPhone,
      role,
      territoryId,
    })

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        userId,
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        role,
        territoryId,
        listingId: createdListingId,
      },
      redirect: role === 'MERCHANT' ? '/admin/listings' : '/admin/dashboard',
      message: `Registration successful! Welcome to Choutuppal Platform, ${cleanName}.`,
    })

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
    console.error('[API Auth Register] Unhandled error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Registration failed' }, { status: 500 })
  }
}
