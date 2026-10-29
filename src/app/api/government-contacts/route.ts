import { NextRequest, NextResponse } from 'next/server'
import { loadStore } from '@/lib/store'
import {
  filterAndSortGovtContacts,
  sanitizeGovtContactForPublic,
} from '@/lib/government-contacts'
import { GOVT_CONTACT_CATEGORIES, CHOUTUPPAL_MANDAL_VILLAGES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const store = loadStore()
    const url = new URL(req.url)

    const category = url.searchParams.get('category') || undefined
    const village = url.searchParams.get('village') || undefined
    const search = url.searchParams.get('search') || undefined
    const territoryId = url.searchParams.get('territoryId') || undefined
    const emergencyOnly = url.searchParams.get('emergencyOnly') === 'true'

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '50', 10) || 50))

    const allContacts = store.governmentContacts || []

    // 1. Authoritative public filtering
    const result = filterAndSortGovtContacts(allContacts, {
      publicOnly: true,
      category,
      village,
      search,
      territoryId,
      isEmergency: emergencyOnly ? true : undefined,
      page,
      pageSize,
    })

    // 2. Public sanitization
    const sanitizedItems = result.items.map((c) => sanitizeGovtContactForPublic(c))

    // 3. Extract top emergency helplines for prominent banner/card rendering
    const emergencyHelplines = allContacts
      .filter((c) => c.status === 'published' && c.isPublicContact && c.isEmergency)
      .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99))
      .map((c) => sanitizeGovtContactForPublic(c))

    return NextResponse.json({
      success: true,
      contacts: sanitizedItems,
      emergencyHelplines,
      categories: GOVT_CONTACT_CATEGORIES,
      villages: CHOUTUPPAL_MANDAL_VILLAGES,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch government contacts' },
      { status: 500 }
    )
  }
}
