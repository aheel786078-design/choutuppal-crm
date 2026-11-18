import { NextResponse } from 'next/server'
import { loadStore, saveStore, FLAGSHIP_TERRITORY_ID, logAuditEvent } from '@/lib/store'
import type { BroadcastCampaign } from '@/lib/types'
import { requireAuth, requireTerritoryAccess } from '@/lib/auth-server'
import { getSupabaseAdminClient } from '@/lib/supabase'
import { sendWhatsAppFlowMessage } from '@/lib/whatsapp-cloud-api'

export const dynamic = 'force-dynamic'

function mapRowToCampaign(row: any): BroadcastCampaign {
  return {
    id: row.id,
    title: row.name || 'Untitled Campaign',
    message: row.message_text || '',
    imageUrl: row.media_url || undefined,
    targetAudience: Array.isArray(row.target_tags) && row.target_tags.length > 0 ? row.target_tags[0] : 'ALL',
    territoryId: row.territory_id || FLAGSHIP_TERRITORY_ID,
    status: (row.status?.toLowerCase() === 'completed' ? 'completed' : row.status?.toLowerCase() === 'in_progress' ? 'sending' : 'staged') as any,
    matchedRecipients: row.total_recipients || row.sent_count || 0,
    createdAt: row.created_at || new Date().toISOString(),
    stagedBy: row.created_by || undefined,
  }
}

function mapCampaignToRow(c: BroadcastCampaign): any {
  return {
    id: c.id,
    territory_id: c.territoryId || FLAGSHIP_TERRITORY_ID,
    name: c.title,
    message_text: c.message,
    media_url: c.imageUrl || null,
    target_tags: [c.targetAudience],
    status: c.status === 'completed' ? 'COMPLETED' : c.status === 'sending' ? 'IN_PROGRESS' : 'DRAFT',
    total_recipients: c.matchedRecipients || 0,
    sent_count: c.status === 'completed' ? c.matchedRecipients : 0,
    created_by: c.stagedBy || null,
    created_at: c.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const store = loadStore()
    const { searchParams } = new URL(req.url)
    const territoryQuery = searchParams.get('territoryId')

    let broadcasts: BroadcastCampaign[] = []
    const supabase = getSupabaseAdminClient()
    if (supabase) {
      try {
        let query = supabase.from('broadcast_campaigns').select('*')
        if (auth.user.role !== 'SUPER_ADMIN') {
          query = query.eq('territory_id', auth.user.territoryId)
        } else if (territoryQuery && territoryQuery !== 'all') {
          query = query.eq('territory_id', territoryQuery)
        }
        const { data: supaBcasts, error: supaErr } = await query.order('created_at', { ascending: false })
        if (!supaErr && Array.isArray(supaBcasts) && supaBcasts.length > 0) {
          broadcasts = supaBcasts.map(mapRowToCampaign)
        }
      } catch (err) {
        console.warn('[Broadcasts GET] Supabase fetch error, fallback to store:', err)
      }
    }

    let storeBroadcasts = store.broadcasts || []
    if (auth.user.role !== 'SUPER_ADMIN') {
      storeBroadcasts = storeBroadcasts.filter((b) => (b.territoryId || FLAGSHIP_TERRITORY_ID) === auth.user.territoryId)
    } else if (territoryQuery && territoryQuery !== 'all') {
      storeBroadcasts = storeBroadcasts.filter((b) => (b.territoryId || FLAGSHIP_TERRITORY_ID) === territoryQuery)
    }

    if (broadcasts.length === 0) {
      broadcasts = storeBroadcasts
      if (supabase && storeBroadcasts.length > 0) {
        supabase.from('broadcast_campaigns').upsert(storeBroadcasts.map(mapCampaignToRow), { onConflict: 'id' }).then(() => {})
      }
    } else {
      const supaIds = new Set(broadcasts.map((b) => b.id))
      for (const sb of storeBroadcasts) {
        if (!supaIds.has(sb.id)) {
          broadcasts.push(sb)
        }
      }
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

    const sendNow = Boolean(body.sendNow || body.dispatch)
    let dispatchedCount = 0
    let failedCount = 0

    const newCampaign: BroadcastCampaign = {
      id: `bcast_${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      imageUrl: imageUrl?.trim() || undefined,
      targetAudience,
      territoryId: targetTerritoryId,
      status: sendNow ? 'sending' : 'staged',
      matchedRecipients: matchedCount,
      createdAt: new Date().toISOString(),
      stagedBy: auth.user.userId,
    }

    if (sendNow) {
      const targetContacts = (store.contacts || []).filter(
        (c) => (c.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritoryId
      )
      const recipientsToDispatch = targetContacts.slice(0, 50)
      for (const contact of recipientsToDispatch) {
        try {
          const res = await sendWhatsAppFlowMessage({
            toPhone: contact.phone,
            messageText: message.trim(),
            mediaUrl: imageUrl?.trim() || undefined,
            territoryId: targetTerritoryId,
            contactName: contact.name,
          })
          if (res.ok) {
            dispatchedCount++
          } else {
            failedCount++
          }
        } catch {
          failedCount++
        }
      }
      newCampaign.status = 'completed'
    }

    store.broadcasts.unshift(newCampaign)
    saveStore(store)

    // Persist to Supabase
    const supabase = getSupabaseAdminClient()
    if (supabase) {
      try {
        await supabase.from('broadcast_campaigns').upsert(mapCampaignToRow(newCampaign))
      } catch (err) {
        console.warn('[Broadcasts POST] Supabase insert warning:', err)
      }
    }

    logAuditEvent({
      actorId: auth.user.userId,
      actorName: auth.user.phone || 'Admin',
      actorRole: auth.user.role,
      territoryId: targetTerritoryId,
      action: sendNow ? 'BROADCAST_DISPATCHED' : 'BROADCAST_STAGED',
      details: sendNow
        ? `Dispatched broadcast "${newCampaign.title}" to ${dispatchedCount} contacts (${failedCount} failed)`
        : `Staged broadcast "${newCampaign.title}" for audience ${targetAudience} (${matchedCount} recipients)`,
    })

    return NextResponse.json(
      {
        success: true,
        staged: !sendNow,
        dispatched: sendNow,
        dispatchedCount,
        failedCount,
        recipientCount: matchedCount,
        campaign: newCampaign,
        broadcast: newCampaign,
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

    // Persist to Supabase
    const supabase = getSupabaseAdminClient()
    if (supabase) {
      try {
        await supabase.from('broadcast_campaigns').delete().eq('id', id)
      } catch (err) {
        console.warn('[Broadcasts DELETE] Supabase delete warning:', err)
      }
    }

    return NextResponse.json({ success: true, message: 'Broadcast campaign deleted successfully' })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
