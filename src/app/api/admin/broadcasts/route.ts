import { NextResponse } from 'next/server'
import { loadStore, saveStore, FLAGSHIP_TERRITORY_ID, logAuditEvent } from '@/lib/store'
import type { BroadcastCampaign } from '@/lib/types'
import { requireAuth, requireTerritoryAccess } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const store = loadStore()
    const { searchParams } = new URL(req.url)
    const territoryQuery = searchParams.get('territoryId')

    let broadcasts: BroadcastCampaign[] = store.broadcasts || []

    if (auth.user.role !== 'SUPER_ADMIN') {
      broadcasts = broadcasts.filter((b) => (b.territoryId || FLAGSHIP_TERRITORY_ID) === auth.user.territoryId)
    } else if (territoryQuery && territoryQuery !== 'all') {
      broadcasts = broadcasts.filter((b) => (b.territoryId || FLAGSHIP_TERRITORY_ID) === territoryQuery)
    }

    // Sort newest first
    broadcasts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Also compute audience stats for the caller's territory
    let contacts = store.contacts || []
    if (auth.user.role !== 'SUPER_ADMIN') {
      contacts = contacts.filter((c) => (c.territoryId || FLAGSHIP_TERRITORY_ID) === auth.user.territoryId)
    } else if (territoryQuery && territoryQuery !== 'all') {
      contacts = contacts.filter((c) => (c.territoryId || FLAGSHIP_TERRITORY_ID) === territoryQuery)
    }

    const audienceCounts = {
      all: contacts.length,
      realEstate: contacts.filter(
        (c) =>
          (c.tags || []).some((t) => /real estate|plots|land|venture/i.test(t)) ||
          /plot|land|real estate/i.test(c.listingTitle || '')
      ).length,
      merchants: contacts.filter(
        (c) => c.stage === 'WON' || (c.tags || []).some((t) => /merchant|listing-owner/i.test(t))
      ).length,
    }

    return NextResponse.json({
      success: true,
      broadcasts,
      total: broadcasts.length,
      audienceCounts,
      sandboxMode: true,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON request payload' }, { status: 400 })
    }

    const { title, message, imageUrl, targetAudience = 'ALL', territoryId } = body || {}

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Broadcast campaign title is required' }, { status: 400 })
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Broadcast message content is required' }, { status: 400 })
    }

    if (message.trim().length > 4096) {
      return NextResponse.json(
        { success: false, error: 'Message exceeds maximum length of 4096 characters' },
        { status: 400 }
      )
    }

    const store = loadStore()
    if (!store.broadcasts) store.broadcasts = []

    let targetTerritoryId: string
    if (auth.user.role === 'SUPER_ADMIN') {
      targetTerritoryId = territoryId || auth.user.territoryId || FLAGSHIP_TERRITORY_ID
    } else {
      targetTerritoryId = auth.user.territoryId || FLAGSHIP_TERRITORY_ID
      if (territoryId && territoryId !== targetTerritoryId) {
        return NextResponse.json(
          {
            success: false,
            error: `Access forbidden: You cannot stage broadcasts for territory "${territoryId}".`,
          },
          { status: 403 }
        )
      }
    }

    // Verify territory access
    const access = await requireTerritoryAccess(req, targetTerritoryId)
    if (access.errorResponse) return access.errorResponse

    // Calculate matched recipients
    const contacts = (store.contacts || []).filter(
      (c) => (c.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritoryId
    )

    let matchedCount = contacts.length
    if (targetAudience === 'REAL_ESTATE') {
      matchedCount = contacts.filter(
        (c) =>
          (c.tags || []).some((t) => /real estate|plots|land|venture/i.test(t)) ||
          /plot|land|real estate/i.test(c.listingTitle || '')
      ).length
    } else if (targetAudience === 'MERCHANTS') {
      matchedCount = contacts.filter(
        (c) => c.stage === 'WON' || (c.tags || []).some((t) => /merchant|listing-owner/i.test(t))
      ).length
    }

    const newCampaign: BroadcastCampaign = {
      id: `bcast_${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      imageUrl: imageUrl?.trim() || undefined,
      targetAudience,
      territoryId: targetTerritoryId,
      status: 'staged',
      matchedRecipients: matchedCount,
      createdAt: new Date().toISOString(),
      stagedBy: auth.user.userId,
    }

    store.broadcasts.unshift(newCampaign)
    saveStore(store)

    logAuditEvent({
      actorId: auth.user.userId,
      actorName: auth.user.phone || 'Admin',
      actorRole: auth.user.role,
      territoryId: targetTerritoryId,
      action: 'BROADCAST_STAGED',
      details: `Staged broadcast "${newCampaign.title}" for audience ${targetAudience} (${matchedCount} recipients)`,
    })

    return NextResponse.json(
      {
        success: true,
        staged: true,
        dispatched: false,
        recipientCount: matchedCount,
        campaign: newCampaign,
        broadcast: newCampaign,
        notice:
          'Campaign staged in sandbox. Zero external WhatsApp dispatches occurred.',
        sandboxNotice:
          'Campaign staged locally. External WhatsApp broadcast dispatch requires verified Meta Cloud API message templates.',
      },
      { status: 201 }
    )
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Campaign ID is required' }, { status: 400 })
    }

    const store = loadStore()
    const broadcasts = store.broadcasts || []
    const idx = broadcasts.findIndex((b) => b.id === id)

    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Broadcast campaign not found' }, { status: 404 })
    }

    const campaign = broadcasts[idx]
    const campaignTerritoryId = campaign.territoryId || FLAGSHIP_TERRITORY_ID

    const access = await requireTerritoryAccess(req, campaignTerritoryId)
    if (access.errorResponse) return access.errorResponse

    store.broadcasts = broadcasts.filter((b) => b.id !== id)
    saveStore(store)

    return NextResponse.json({ success: true, message: 'Broadcast campaign deleted successfully' })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
