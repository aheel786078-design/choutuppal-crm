import { NextResponse } from 'next/server'
import { loadStore } from '@/lib/store'
import { sendListingWhatsAppCard } from '@/lib/whatsapp-cloud-api'
import { requireAuth, requireTerritoryAccess } from '@/lib/auth-server'

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const body = await req.json()
    const { phone, listingId } = body

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Recipient phone number is required' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      return NextResponse.json({ success: false, error: 'Invalid phone number format' }, { status: 400 })
    }

    const store = loadStore()
    const listing = store.listings.find((l) => l.id === listingId) || store.listings[0]

    if (!listing) {
      return NextResponse.json({ success: false, error: 'No listing available to dispatch' }, { status: 404 })
    }

    const listingTerritoryId = listing.territoryId || 'territory_choutuppal'
    const access = await requireTerritoryAccess(req, listingTerritoryId)
    if (access.errorResponse) return access.errorResponse

    const result = await sendListingWhatsAppCard(cleanPhone, listing)
    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to dispatch WhatsApp message to provider',
          providerDelivered: false,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.providerDelivered
        ? `Listing card with photo successfully sent to ${cleanPhone}`
        : `Listing card saved locally for ${cleanPhone} (WhatsApp provider not configured)`,
      providerDelivered: result.providerDelivered,
      listingTitle: listing.title,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
