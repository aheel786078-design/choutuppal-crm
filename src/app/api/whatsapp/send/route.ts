import { NextResponse } from 'next/server'
import { loadStore } from '@/lib/store'
import { sendListingWhatsAppCard } from '@/lib/whatsapp-cloud-api'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { phone, listingId } = body

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Recipient phone number is required' }, { status: 400 })
    }

    const store = loadStore()
    const listing = store.listings.find((l) => l.id === listingId) || store.listings[0]

    if (!listing) {
      return NextResponse.json({ success: false, error: 'No listing available to dispatch' }, { status: 404 })
    }

    const res = await sendListingWhatsAppCard(phone, listing)
    return NextResponse.json({
      success: true,
      message: `Listing card with photo successfully sent to ${phone}`,
      listingTitle: listing.title,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
