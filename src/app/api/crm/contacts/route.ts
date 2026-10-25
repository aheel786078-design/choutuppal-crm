import { NextResponse } from 'next/server'
import { loadStore, saveStore } from '@/lib/store'
import { CRMContact } from '@/lib/types'

export async function GET() {
  const store = loadStore()
  return NextResponse.json({
    success: true,
    contacts: store.contacts,
    total: store.contacts.length,
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const store = loadStore()

    const newContact: CRMContact = {
      id: `cnt_${Date.now()}`,
      name: body.name || 'New Lead',
      phone: body.phone || '9848000000',
      email: body.email || '',
      tags: body.tags || ['Lead'],
      stage: body.stage || 'NEW_LEAD',
      listingId: body.listingId,
      listingTitle: body.listingTitle,
      notes: body.notes || '',
      messageCount: 0,
      lastContactAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }

    store.contacts.unshift(newContact)
    saveStore(store)

    return NextResponse.json({
      success: true,
      contact: newContact,
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
      return NextResponse.json({ success: false, error: 'Contact ID is required' }, { status: 400 })
    }

    const store = loadStore()
    const idx = store.contacts.findIndex((c) => c.id === id)

    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 })
    }

    store.contacts[idx] = {
      ...store.contacts[idx],
      ...updates,
      lastContactAt: new Date().toISOString(),
    }

    saveStore(store)
    return NextResponse.json({ success: true, contact: store.contacts[idx] })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
