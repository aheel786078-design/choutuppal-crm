import { NextResponse } from 'next/server'
import { loadStore, saveStore, isListingPublished, logAuditEvent, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import type { WhatsAppFlow, FlowStatus, FlowTrigger, FlowNode } from '@/lib/types'
import { STANDARD_CATEGORIES } from '@/lib/constants'
import { requireAuth, requireTerritoryAccess } from '@/lib/auth-server'

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse
    const user = auth.user

    const store = loadStore()
    let publishedListings = store.listings
      .filter((l) => isListingPublished(l))
      .map((l) => ({
        id: l.id,
        title: l.title,
        slug: l.slug,
        categoryName: l.categoryName || l.categoryId,
        phone: l.phone,
        whatsapp: l.whatsapp,
        address: l.address,
        coverImage: l.coverImage,
        territoryId: l.territoryId,
      }))

    let flows = store.flows || []

    // Multi-tenant territory scoping: Non-super-admins only see flows within their assigned territory
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_OPERATOR') {
      const userTerritory = user.territoryId || FLAGSHIP_TERRITORY_ID
      flows = flows.filter((f) => (f.territoryId || FLAGSHIP_TERRITORY_ID) === userTerritory)
      publishedListings = publishedListings.filter(
        (l) => (l.territoryId || FLAGSHIP_TERRITORY_ID) === userTerritory
      )
    }

    return NextResponse.json({
      success: true,
      flows,
      categories: STANDARD_CATEGORIES,
      activeListingCount: publishedListings.length,
      listings: publishedListings,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse
    const user = auth.user

    const body = await req.json()
    const store = loadStore()

    // 1. Dry run preview mode (no mutations)
    if (body.dryRun) {
      const candidateFlows: WhatsAppFlow[] = Array.isArray(body.flows) ? body.flows : (body.flow ? [body.flow] : [])
      return NextResponse.json({
        success: true,
        dryRun: true,
        candidateCount: candidateFlows.length,
        summary: candidateFlows.map((f: WhatsAppFlow) => ({
          id: f.id,
          name: f.name,
          status: f.status || 'draft',
          triggersCount: f.triggers?.length || f.trigger_keywords?.length || 0,
          nodeCount: f.nodes?.length || 0,
          initial_message: (f.initial_message || '').slice(0, 100),
          buttonCount: f.button_options?.length || 0,
        })),
      })
    }

    // 2. Handle batch import from CSV or builder
    if (Array.isArray(body.flows)) {
      const imported: WhatsAppFlow[] = []

      let createdCount = 0
      let updatedCount = 0

      for (const f of body.flows) {
        // Enforce territory scoping on batch items
        let targetTerritory = f.territoryId || user.territoryId || FLAGSHIP_TERRITORY_ID
        if (user.role !== 'SUPER_ADMIN') {
          targetTerritory = user.territoryId || FLAGSHIP_TERRITORY_ID
        }

        const flowId = f.id || `flow_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
        const status: FlowStatus = f.status || 'draft'
        const triggers: FlowTrigger[] = f.triggers && Array.isArray(f.triggers) && f.triggers.length > 0
          ? f.triggers
          : (f.trigger_keywords && Array.isArray(f.trigger_keywords)
              ? f.trigger_keywords.map((kw: string) => ({ type: 'keyword' as const, value: kw }))
              : (f.triggerKeyword ? [{ type: 'keyword' as const, value: f.triggerKeyword }] : [{ type: 'keyword' as const, value: 'hi' }]))

        const canonicalFlow: WhatsAppFlow = {
          id: flowId,
          name: f.name || 'Untitled WhatsApp Flow',
          description: f.description || '',
          status,
          territoryId: targetTerritory,
          version: f.version || 1,
          triggers,
          nodes: Array.isArray(f.nodes) ? f.nodes : [],
          entryNodeId: f.entryNodeId || (f.nodes?.[0]?.id || 'start'),
          initial_message: f.initial_message || f.description || '',
          imageUrl: f.imageUrl,
          template_slug: f.template_slug || undefined,
          // Backward-compatibility properties
          triggerKeyword: f.triggerKeyword || triggers[0]?.value?.toUpperCase() || 'FLOW',
          trigger_keywords: f.trigger_keywords || triggers.map((t) => t.value),
          trigger_type: f.trigger_type || 'keyword',
          button_options: f.button_options || [],
          listingSortMode: f.listingSortMode,
          listingSortOrder: f.listingSortOrder,
          categoryPriority: f.categoryPriority,
          listingPageSize: f.listingPageSize,
          isActive: status === 'published',
          type: f.type || 'CATEGORY_BUTTONS',
          sendPhotos: Boolean(f.imageUrl || f.sendPhotos),
          actionButtons: f.actionButtons || (f.button_options || []).map((b: string, i: number) => ({
            id: `btn_${i + 1}`,
            title: b.slice(0, 20),
            action: 'BUTTON_REPLY',
          })),
          categoriesOrder: f.categoriesOrder || STANDARD_CATEGORIES.map((c) => c.slug),
          createdAt: f.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        const existingIdx = store.flows.findIndex((cf) => cf.id === flowId)
        if (existingIdx >= 0) {
          store.flows[existingIdx] = canonicalFlow
          updatedCount++
        } else {
          store.flows.unshift(canonicalFlow)
          createdCount++
        }
        imported.push(canonicalFlow)
      }

      saveStore(store)

      logAuditEvent({
        actorId: user.userId,
        actorName: user.phone,
        actorRole: user.role,
        territoryId: user.role === 'SUPER_ADMIN' ? undefined : user.territoryId,
        action: 'flows.batch_import',
        entityType: 'flow',
        outcome: 'SUCCESS',
        details: `Imported ${imported.length} WhatsApp flows (${createdCount} created, ${updatedCount} updated).`,
        metadata: { importedCount: imported.length, createdCount, updatedCount },
      })

      return NextResponse.json({
        success: true,
        message: `Successfully imported ${imported.length} custom flows! (${createdCount} created, ${updatedCount} updated)`,
        importedCount: imported.length,
        createdCount,
        updatedCount,
        totalActiveFlows: store.flows.length,
        flows: imported,
      })
    }

    // 3. Handle single flow creation
    let targetTerritory = body.territoryId || user.territoryId || FLAGSHIP_TERRITORY_ID
    if (user.role !== 'SUPER_ADMIN') {
      targetTerritory = user.territoryId || FLAGSHIP_TERRITORY_ID
    }

    const flowId = body.id || `flow_${Date.now()}`
    const status: FlowStatus = body.status || (body.isActive ? 'published' : 'draft')
    const triggers: FlowTrigger[] = body.triggers && Array.isArray(body.triggers) && body.triggers.length > 0
      ? body.triggers
      : (body.triggerKeyword
          ? [{ type: 'keyword' as const, value: body.triggerKeyword }]
          : [{ type: 'keyword' as const, value: 'hi' }])

    const nodes: FlowNode[] = Array.isArray(body.nodes) && body.nodes.length > 0
      ? body.nodes
      : [
          {
            id: 'start',
            type: 'start',
            name: 'Start',
            config: { nextNodeId: 'entry_message' },
            positionX: 100,
            positionY: 100,
          },
          {
            id: 'entry_message',
            type: body.actionButtons?.length ? 'send_buttons' : 'send_message',
            name: 'Message',
            config: {
              text: body.initial_message || body.description || 'Welcome to Choutuppal App!',
              buttons: (body.actionButtons || []).map((b: any) => ({
                id: b.id || 'btn_1',
                title: b.title || 'Option',
                action: b.action || 'BUTTON_REPLY',
              })),
            },
            positionX: 100,
            positionY: 220,
          },
        ]

    const newFlow: WhatsAppFlow = {
      id: flowId,
      name: body.name || 'New WhatsApp Flow',
      description: body.description || '',
      status,
      territoryId: targetTerritory,
      version: 1,
      triggers,
      nodes,
      entryNodeId: body.entryNodeId || 'start',
      initial_message: body.initial_message || body.description || '',
      imageUrl: body.imageUrl,
      template_slug: body.template_slug || undefined,
      triggerKeyword: (body.triggerKeyword || triggers[0]?.value || 'FLOW').toUpperCase(),
      trigger_keywords: triggers.map((t) => t.value),
      trigger_type: body.trigger_type || 'keyword',
      listingSortMode: body.listingSortMode,
      listingSortOrder: body.listingSortOrder,
      categoryPriority: body.categoryPriority,
      listingPageSize: body.listingPageSize,
      isActive: status === 'published',
      type: body.type || 'LISTINGS_WITH_PHOTOS',
      sendPhotos: body.sendPhotos !== undefined ? Boolean(body.sendPhotos) : true,
      actionButtons: body.actionButtons || [
        { id: 'btn_call', title: '📞 Call', action: 'TEL_PROMPT' },
        { id: 'btn_wa', title: '💬 WhatsApp', action: 'WA_REDIRECT' },
      ],
      categoriesOrder: body.categoriesOrder || STANDARD_CATEGORIES.map((c) => c.slug),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const existingIdx = store.flows.findIndex((cf) => cf.id === flowId)
    if (existingIdx >= 0) {
      store.flows[existingIdx] = newFlow
    } else {
      store.flows.unshift(newFlow)
    }

    saveStore(store)

    logAuditEvent({
      actorId: user.userId,
      actorName: user.phone,
      actorRole: user.role,
      territoryId: targetTerritory,
      action: existingIdx >= 0 ? 'flow.updated' : 'flow.created',
      entityType: 'flow',
      entityId: flowId,
      outcome: 'SUCCESS',
      details: `${existingIdx >= 0 ? 'Updated' : 'Created'} WhatsApp flow "${newFlow.name}" (${flowId}) in territory ${targetTerritory}`,
      metadata: { flowId, name: newFlow.name, status: newFlow.status },
    })

    return NextResponse.json({
      success: true,
      message: 'WhatsApp Bot Flow saved successfully!',
      flow: newFlow,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse
    const user = auth.user

    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Flow ID is required' }, { status: 400 })
    }

    const store = loadStore()
    const idx = store.flows.findIndex((f) => f.id === id)

    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Flow not found' }, { status: 404 })
    }

    const currentFlow = store.flows[idx]
    const currentTerritory = currentFlow.territoryId || FLAGSHIP_TERRITORY_ID

    // Territory IDOR / BOLA Guard
    const access = await requireTerritoryAccess(req, currentTerritory)
    if (access.errorResponse) return access.errorResponse

    // Non-super-admins cannot reassign flow territory
    if (user.role !== 'SUPER_ADMIN') {
      delete updates.territoryId
    }

    // Synchronize status and isActive
    let status = updates.status || currentFlow.status
    if (updates.isActive !== undefined && updates.status === undefined) {
      status = updates.isActive ? 'published' : 'paused'
    } else if (updates.status !== undefined && updates.isActive === undefined) {
      updates.isActive = status === 'published'
    }

    store.flows[idx] = {
      ...currentFlow,
      ...updates,
      status,
      updatedAt: new Date().toISOString(),
    }

    saveStore(store)

    logAuditEvent({
      actorId: user.userId,
      actorName: user.phone,
      actorRole: user.role,
      territoryId: currentTerritory,
      action: 'flow.updated',
      entityType: 'flow',
      entityId: id,
      outcome: 'SUCCESS',
      details: `Updated flow "${store.flows[idx].name}" (${id})`,
      metadata: { flowId: id, status },
    })

    return NextResponse.json({
      success: true,
      message: 'Flow updated successfully!',
      flow: store.flows[idx],
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse
    const user = auth.user

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Flow ID is required' }, { status: 400 })
    }

    const store = loadStore()
    const idx = store.flows.findIndex((f) => f.id === id)

    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Flow not found' }, { status: 404 })
    }

    const targetFlow = store.flows[idx]
    const targetTerritory = targetFlow.territoryId || FLAGSHIP_TERRITORY_ID

    // Territory IDOR Guard
    const access = await requireTerritoryAccess(req, targetTerritory)
    if (access.errorResponse) return access.errorResponse

    const [deleted] = store.flows.splice(idx, 1)
    saveStore(store)

    logAuditEvent({
      actorId: user.userId,
      actorName: user.phone,
      actorRole: user.role,
      territoryId: targetTerritory,
      action: 'flow.deleted',
      entityType: 'flow',
      entityId: id,
      outcome: 'SUCCESS',
      details: `Deleted flow "${deleted.name}" (${id}) from territory ${targetTerritory}`,
      metadata: { flowId: id, name: deleted.name },
    })

    return NextResponse.json({
      success: true,
      message: `Flow "${deleted.name}" deleted successfully!`,
      flowId: id,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
