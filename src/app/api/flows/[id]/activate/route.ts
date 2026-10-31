import { NextResponse } from 'next/server'
import { loadStore, saveStore, logAuditEvent } from '@/lib/store'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const nextStatus = body.status || 'active'

    const store = loadStore()
    const idx = (store.flows || []).findIndex((f) => f.id === id)

    if (idx === -1) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 })
    }

    const current = store.flows[idx]
    current.status = nextStatus
    current.isActive = nextStatus === 'active' || nextStatus === 'published'
    current.updatedAt = new Date().toISOString()

    saveStore(store)

    logAuditEvent({
      actorId: 'admin_user',
      actorName: 'Admin',
      actorRole: 'SUPER_ADMIN',
      action: 'flow.status_changed',
      entityType: 'flow',
      entityId: id,
      outcome: 'SUCCESS',
      details: `Changed flow "${current.name}" status to ${nextStatus}`,
    })

    return NextResponse.json({ success: true, status: nextStatus })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
