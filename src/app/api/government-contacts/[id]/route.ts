import { NextRequest, NextResponse } from 'next/server'
import { loadStore } from '@/lib/store'
import {
  isContactEligibleForPublic,
  sanitizeGovtContactForPublic,
} from '@/lib/government-contacts'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const store = loadStore()

    const contact = (store.governmentContacts || []).find((c) => c.id === id)
    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Government contact not found' },
        { status: 404 }
      )
    }

    // Public eligibility guard: Drafts, archived, pending, and non-public records strictly return 404
    if (!isContactEligibleForPublic(contact)) {
      return NextResponse.json(
        { success: false, error: 'Government contact not found' },
        { status: 404 }
      )
    }

    const publicContact = sanitizeGovtContactForPublic(contact)

    return NextResponse.json({
      success: true,
      contact: publicContact,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to retrieve contact' },
      { status: 500 }
    )
  }
}
