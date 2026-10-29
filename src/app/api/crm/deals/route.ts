import { NextResponse } from 'next/server'
import { loadStore, saveStore, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import { CRMDeal, DealStage } from '@/lib/types'
import { requireAuth, requireTerritoryAccess } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

const VALID_STAGES: DealStage[] = [
  'NEW_LEAD',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL',
  'WON',
  'LOST',
]

/**
 * GET /api/crm/deals
 * Lists persistent deals filtered by caller's territory, stage, search query, or contact.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const { searchParams } = new URL(req.url)
    const stageParam = searchParams.get('stage') as DealStage | null
    const statusParam = searchParams.get('status')
    const searchQuery = searchParams.get('search')?.trim().toLowerCase()
    const contactIdParam = searchParams.get('contactId')
    const territoryIdParam = searchParams.get('territoryId')

    const store = loadStore()
    const allDeals = store.deals || []

    // 1. Enforce territory isolation
    let authorizedDeals: CRMDeal[]
    if (auth.user.role === 'SUPER_ADMIN') {
      if (territoryIdParam) {
        authorizedDeals = allDeals.filter(
          (d) => (d.territoryId || FLAGSHIP_TERRITORY_ID) === territoryIdParam
        )
      } else {
        authorizedDeals = allDeals
      }
    } else {
      // Franchise user strictly scoped to assigned territory
      authorizedDeals = allDeals.filter(
        (d) => (d.territoryId || FLAGSHIP_TERRITORY_ID) === auth.user.territoryId
      )
    }

    // 2. Filter by stage
    if (stageParam && VALID_STAGES.includes(stageParam)) {
      authorizedDeals = authorizedDeals.filter((d) => d.stage === stageParam)
    }

    // 3. Filter by status
    if (statusParam && ['OPEN', 'WON', 'LOST'].includes(statusParam.toUpperCase())) {
      authorizedDeals = authorizedDeals.filter(
        (d) => (d.status || 'OPEN').toUpperCase() === statusParam.toUpperCase()
      )
    }

    // 4. Filter by contact
    if (contactIdParam) {
      authorizedDeals = authorizedDeals.filter((d) => d.contactId === contactIdParam)
    }

    // 5. Search query matching title, phone, tag, contactName, notes
    if (searchQuery) {
      authorizedDeals = authorizedDeals.filter(
        (d) =>
          d.title.toLowerCase().includes(searchQuery) ||
          (d.phone && d.phone.toLowerCase().includes(searchQuery)) ||
          (d.tag && d.tag.toLowerCase().includes(searchQuery)) ||
          (d.contactName && d.contactName.toLowerCase().includes(searchQuery)) ||
          (d.notes && d.notes.toLowerCase().includes(searchQuery))
      )
    }

    // Sort newest updated first
    authorizedDeals.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

    // Compute summary metrics
    const totalDeals = authorizedDeals.length
    const totalValue = authorizedDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0)
    const openValue = authorizedDeals
      .filter((d) => (d.status || 'OPEN') === 'OPEN')
      .reduce((sum, d) => sum + (Number(d.value) || 0), 0)
    const wonValue = authorizedDeals
      .filter((d) => d.status === 'WON' || d.stage === 'WON')
      .reduce((sum, d) => sum + (Number(d.value) || 0), 0)

    const stageCounts: Record<string, number> = {}
    const stageValues: Record<string, number> = {}
    for (const stage of VALID_STAGES) {
      stageCounts[stage] = 0
      stageValues[stage] = 0
    }
    for (const deal of authorizedDeals) {
      const stage = deal.stage || 'NEW_LEAD'
      stageCounts[stage] = (stageCounts[stage] || 0) + 1
      stageValues[stage] = (stageValues[stage] || 0) + (Number(deal.value) || 0)
    }

    return NextResponse.json({
      success: true,
      deals: authorizedDeals,
      metrics: {
        totalDeals,
        totalValue,
        openValue,
        wonValue,
        stageCounts,
        stageValues,
      },
      territoryId: auth.user.role === 'SUPER_ADMIN' ? (territoryIdParam || 'ALL') : auth.user.territoryId,
    })
  } catch (error: any) {
    console.error('[API Deals GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error fetching deals' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/crm/deals
 * Creates a new persistent deal scoped to the caller's territory.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const body = await req.json().catch(() => ({}))
    const {
      title,
      description,
      value,
      currency = 'INR',
      stage = 'NEW_LEAD',
      phone,
      contactId,
      contactName,
      assignedStaffId,
      assignedStaffName,
      expectedCloseDate,
      nextFollowUpDate,
      tag,
      notes,
      territoryId: reqTerritoryId,
    } = body

    // 1. Validation
    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Title is required and must be at least 2 characters.' },
        { status: 400 }
      )
    }

    const numericValue = Number(value)
    if (isNaN(numericValue) || numericValue < 0) {
      return NextResponse.json(
        { success: false, error: 'Value must be a valid non-negative number.' },
        { status: 400 }
      )
    }

    if (!VALID_STAGES.includes(stage as DealStage)) {
      return NextResponse.json(
        { success: false, error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` },
        { status: 400 }
      )
    }

    // 2. Determine territory ownership
    let targetTerritoryId = FLAGSHIP_TERRITORY_ID
    if (auth.user.role === 'SUPER_ADMIN') {
      targetTerritoryId = reqTerritoryId || FLAGSHIP_TERRITORY_ID
    } else {
      targetTerritoryId = auth.user.territoryId || FLAGSHIP_TERRITORY_ID
    }

    const access = await requireTerritoryAccess(req, targetTerritoryId)
    if (access.errorResponse) return access.errorResponse

    const store = loadStore()
    if (!store.deals) store.deals = []

    // 3. Contact linkage & cross-tenant contact validation
    let resolvedContactName = contactName
    if (contactId) {
      const contact = (store.contacts || []).find((c) => c.id === contactId)
      if (!contact) {
        return NextResponse.json(
          { success: false, error: 'Specified contact does not exist.' },
          { status: 400 }
        )
      }
      if ((contact.territoryId || FLAGSHIP_TERRITORY_ID) !== targetTerritoryId) {
        return NextResponse.json(
          { success: false, error: 'Cannot attach a contact from a different territory.' },
          { status: 403 }
        )
      }
      if (!resolvedContactName) {
        resolvedContactName = contact.name || contact.businessName
      }
    }

    // 4. Determine status
    const status: 'OPEN' | 'WON' | 'LOST' =
      stage === 'WON' ? 'WON' : stage === 'LOST' ? 'LOST' : 'OPEN'

    const now = new Date().toISOString()
    const newDeal: CRMDeal = {
      id: `deal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      description: description ? String(description).trim() : undefined,
      value: numericValue,
      currency: currency || 'INR',
      stage: stage as DealStage,
      status,
      phone: phone ? String(phone).trim() : undefined,
      contactId: contactId || undefined,
      contactName: resolvedContactName || undefined,
      territoryId: targetTerritoryId,
      assignedStaffId: assignedStaffId || undefined,
      assignedStaffName: assignedStaffName || undefined,
      expectedCloseDate: expectedCloseDate || undefined,
      nextFollowUpDate: nextFollowUpDate || undefined,
      tag: tag ? String(tag).trim() : undefined,
      notes: notes ? String(notes).trim() : undefined,
      createdAt: now,
      updatedAt: now,
    }

    store.deals.push(newDeal)
    saveStore(store)

    return NextResponse.json(
      {
        success: true,
        message: 'Deal created successfully',
        deal: newDeal,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[API Deals POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error creating deal' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/crm/deals
 * Updates an existing persistent deal. Guards against cross-territory IDOR.
 */
export async function PUT(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const body = await req.json().catch(() => ({}))
    const { id, title, description, value, currency, stage, status: reqStatus, phone, contactId, contactName, assignedStaffId, assignedStaffName, expectedCloseDate, nextFollowUpDate, tag, notes } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Deal id is required for updates.' },
        { status: 400 }
      )
    }

    const store = loadStore()
    if (!store.deals) store.deals = []

    const dealIndex = store.deals.findIndex((d) => d.id === id)
    if (dealIndex === -1) {
      return NextResponse.json(
        { success: false, error: `Deal with ID "${id}" was not found.` },
        { status: 404 }
      )
    }

    const currentDeal = store.deals[dealIndex]

    // Cross-territory IDOR Protection
    const access = await requireTerritoryAccess(req, currentDeal.territoryId || FLAGSHIP_TERRITORY_ID)
    if (access.errorResponse) return access.errorResponse

    // Validate updates
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 2) {
        return NextResponse.json(
          { success: false, error: 'Title must be at least 2 characters.' },
          { status: 400 }
        )
      }
      currentDeal.title = title.trim()
    }

    if (value !== undefined) {
      const numericValue = Number(value)
      if (isNaN(numericValue) || numericValue < 0) {
        return NextResponse.json(
          { success: false, error: 'Value must be a valid non-negative number.' },
          { status: 400 }
        )
      }
      currentDeal.value = numericValue
    }

    if (currency !== undefined) {
      currentDeal.currency = String(currency).trim() || 'INR'
    }

    if (stage !== undefined) {
      if (!VALID_STAGES.includes(stage as DealStage)) {
        return NextResponse.json(
          { success: false, error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` },
          { status: 400 }
        )
      }
      currentDeal.stage = stage as DealStage

      // Auto-recalculate status if not explicitly passed
      if (!reqStatus) {
        currentDeal.status = stage === 'WON' ? 'WON' : stage === 'LOST' ? 'LOST' : 'OPEN'
      }
    }

    if (reqStatus !== undefined) {
      if (!['OPEN', 'WON', 'LOST'].includes(reqStatus.toUpperCase())) {
        return NextResponse.json(
          { success: false, error: 'Status must be OPEN, WON, or LOST.' },
          { status: 400 }
        )
      }
      currentDeal.status = reqStatus.toUpperCase() as 'OPEN' | 'WON' | 'LOST'
    }

    if (contactId !== undefined) {
      if (contactId) {
        const contact = (store.contacts || []).find((c) => c.id === contactId)
        if (!contact) {
          return NextResponse.json(
            { success: false, error: 'Specified contact does not exist.' },
            { status: 400 }
          )
        }
        if ((contact.territoryId || FLAGSHIP_TERRITORY_ID) !== currentDeal.territoryId) {
          return NextResponse.json(
            { success: false, error: 'Cannot attach a contact from a different territory.' },
            { status: 403 }
          )
        }
        currentDeal.contactId = contactId
        currentDeal.contactName = contactName || contact.name || contact.businessName
      } else {
        currentDeal.contactId = undefined
        currentDeal.contactName = undefined
      }
    }

    if (phone !== undefined) currentDeal.phone = phone ? String(phone).trim() : undefined
    if (description !== undefined) currentDeal.description = description ? String(description).trim() : undefined
    if (tag !== undefined) currentDeal.tag = tag ? String(tag).trim() : undefined
    if (notes !== undefined) currentDeal.notes = notes ? String(notes).trim() : undefined
    if (assignedStaffId !== undefined) currentDeal.assignedStaffId = assignedStaffId || undefined
    if (assignedStaffName !== undefined) currentDeal.assignedStaffName = assignedStaffName || undefined
    if (expectedCloseDate !== undefined) currentDeal.expectedCloseDate = expectedCloseDate || undefined
    if (nextFollowUpDate !== undefined) currentDeal.nextFollowUpDate = nextFollowUpDate || undefined

    currentDeal.updatedAt = new Date().toISOString()
    store.deals[dealIndex] = currentDeal
    saveStore(store)

    return NextResponse.json({
      success: true,
      message: 'Deal updated successfully',
      deal: currentDeal,
    })
  } catch (error: any) {
    console.error('[API Deals PUT] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error updating deal' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/crm/deals
 * Deletes a deal with territory authorization check.
 */
export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const { searchParams } = new URL(req.url)
    let dealId = searchParams.get('id')

    if (!dealId) {
      const body = await req.json().catch(() => ({}))
      dealId = body.id
    }

    if (!dealId || typeof dealId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Deal id parameter is required.' },
        { status: 400 }
      )
    }

    const store = loadStore()
    if (!store.deals) store.deals = []

    const deal = store.deals.find((d) => d.id === dealId)
    if (!deal) {
      return NextResponse.json(
        { success: false, error: `Deal with ID "${dealId}" was not found.` },
        { status: 404 }
      )
    }

    // Territory IDOR check
    const access = await requireTerritoryAccess(req, deal.territoryId || FLAGSHIP_TERRITORY_ID)
    if (access.errorResponse) return access.errorResponse

    store.deals = store.deals.filter((d) => d.id !== dealId)
    saveStore(store)

    return NextResponse.json({
      success: true,
      message: 'Deal deleted successfully',
      deletedId: dealId,
    })
  } catch (error: any) {
    console.error('[API Deals DELETE] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error deleting deal' },
      { status: 500 }
    )
  }
}
