import { NextResponse } from 'next/server'
import { loadStore, saveStore } from '@/lib/store'
import { CRMFlowConfig } from '@/lib/types'
import { STANDARD_CATEGORIES } from '@/lib/constants'

export async function GET() {
  const store = loadStore()
  return NextResponse.json({
    success: true,
    flows: store.flows,
    categories: STANDARD_CATEGORIES,
    activeListingCount: store.listings.filter((l) => l.status === 'APPROVED').length,
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const store = loadStore()

    // Handle batch import from CSV
    if (Array.isArray(body.flows)) {
      for (const f of body.flows) {
        const flow: CRMFlowConfig = {
          id: f.id || `flow_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: f.name,
          triggerKeyword: (f.trigger_keywords?.[0] || 'FLOW').toUpperCase(),
          isActive: true,
          description: f.description || f.initial_message || '',
          type: 'LISTINGS_WITH_PHOTOS',
          sendPhotos: Boolean(f.imageUrl),
          actionButtons: (f.button_options || []).map((b: string, i: number) => ({
            id: `btn_${i + 1}`,
            title: b.slice(0, 20),
            action: 'BUTTON_REPLY',
          })),
          categoriesOrder: STANDARD_CATEGORIES.map((c) => c.slug),
          createdAt: new Date().toISOString(),
        }
        store.flows.unshift(flow)
      }
      saveStore(store)

      return NextResponse.json({
        success: true,
        message: `Successfully imported ${body.flows.length} custom flows from CSV!`,
        importedCount: body.flows.length,
      })
    }

    // Handle single flow creation
    const newFlow: CRMFlowConfig = {
      id: `flow_${Date.now()}`,
      name: body.name || 'New WhatsApp Flow',
      triggerKeyword: (body.triggerKeyword || 'FLOW').toUpperCase(),
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      description: body.description || '',
      type: body.type || 'LISTINGS_WITH_PHOTOS',
      sendPhotos: body.sendPhotos !== undefined ? Boolean(body.sendPhotos) : true,
      actionButtons: body.actionButtons || [
        { id: 'btn_call', title: '📞 Call', action: 'TEL_PROMPT' },
        { id: 'btn_wa', title: '💬 WhatsApp', action: 'WA_REDIRECT' },
      ],
      categoriesOrder: body.categoriesOrder || STANDARD_CATEGORIES.map((c) => c.slug),
      createdAt: new Date().toISOString(),
    }

    store.flows.unshift(newFlow)
    saveStore(store)

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

    store.flows[idx] = {
      ...store.flows[idx],
      ...updates,
    }

    saveStore(store)
    return NextResponse.json({
      success: true,
      message: 'Flow updated successfully!',
      flow: store.flows[idx],
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
