import { NextResponse } from 'next/server'
import { loadStore, saveStore, logAuditEvent, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import type { FlowRow, FlowNodeRow, FlowNodeType } from '@/lib/flows/types'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const store = loadStore()
    const raw = (store.flows || []).find((f) => f.id === id)

    if (!raw) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 })
    }

    // Standardize nodes to FlowNodeRow[]
    let nodes: FlowNodeRow[] = []
    if (Array.isArray((raw as any).flow_nodes) && (raw as any).flow_nodes.length > 0) {
      nodes = (raw as any).flow_nodes
    } else if (Array.isArray(raw.nodes) && raw.nodes.length > 0) {
      nodes = raw.nodes.map((n: any, idx: number) => ({
        id: n.id || `node_${idx + 1}`,
        flow_id: raw.id,
        node_key: n.node_key || n.id || `node_${idx + 1}`,
        node_type: (n.node_type || n.type || 'send_message') as FlowNodeType,
        config: n.config || {},
        position_x: n.position_x ?? n.positionX ?? (120 + (idx % 3) * 280),
        position_y: n.position_y ?? n.positionY ?? (100 + Math.floor(idx / 3) * 220),
        created_at: n.created_at || raw.createdAt || new Date().toISOString(),
        updated_at: n.updated_at || raw.updatedAt || new Date().toISOString(),
      }))
    } else {
      nodes = [
        {
          id: 'start_1',
          flow_id: raw.id,
          node_key: 'start',
          node_type: 'start',
          config: { next_node_key: 'welcome_msg' },
          position_x: 100,
          position_y: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'welcome_1',
          flow_id: raw.id,
          node_key: 'welcome_msg',
          node_type: 'send_message',
          config: {
            text: raw.initial_message || raw.description || 'నమస్కారం! Welcome to Choutuppal App WhatsApp Service.',
            next_node_key: 'end',
          },
          position_x: 100,
          position_y: 260,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'end_1',
          flow_id: raw.id,
          node_key: 'end',
          node_type: 'end',
          config: {},
          position_x: 100,
          position_y: 440,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]
    }

    const flow: FlowRow = {
      id: raw.id,
      name: raw.name || 'Untitled WhatsApp Flow',
      description: raw.description || null,
      status: (raw.status as any) || (raw.isActive ? 'active' : 'draft'),
      trigger_type: ((raw as any).trigger_type || 'keyword') as any,
      trigger_config: (raw as any).trigger_config || {
        keywords: raw.trigger_keywords || (raw.triggerKeyword ? [raw.triggerKeyword] : ['HI', 'MENU']),
        match_type: 'contains',
      },
      entry_node_id: (raw as any).entry_node_id || raw.entryNodeId || nodes[0]?.node_key || 'start',
      created_at: raw.createdAt || new Date().toISOString(),
      updated_at: raw.updatedAt || new Date().toISOString(),
      run_count: (raw as any).execution_count || (raw as any).run_count || 0,
      territoryId: raw.territoryId || FLAGSHIP_TERRITORY_ID,
    }

    return NextResponse.json({ flow, nodes })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const store = loadStore()

    const idx = (store.flows || []).findIndex((f) => f.id === id)
    if (idx === -1) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 })
    }

    const current = store.flows[idx]
    const updatedNodes: FlowNodeRow[] = Array.isArray(body.nodes)
      ? body.nodes.map((n: any, i: number) => ({
          id: n.id || `node_${id}_${i + 1}`,
          flow_id: id,
          node_key: n.node_key || n.id || `node_${i + 1}`,
          node_type: n.node_type || n.type || 'send_message',
          config: n.config || {},
          position_x: n.position_x ?? n.positionX ?? 100,
          position_y: n.position_y ?? n.positionY ?? 100,
          created_at: n.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
      : (current as any).flow_nodes || []

    const keywords = Array.isArray(body.trigger_config?.keywords)
      ? body.trigger_config.keywords
      : current.trigger_keywords || [current.triggerKeyword || 'FLOW']

    const updatedFlow: any = {
      ...current,
      name: body.name !== undefined ? body.name.trim() : current.name,
      description: body.description !== undefined ? body.description : current.description,
      trigger_type: body.trigger_type || (current as any).trigger_type || 'keyword',
      trigger_config: body.trigger_config || (current as any).trigger_config || { keywords },
      trigger_keywords: keywords,
      triggerKeyword: keywords[0] || 'FLOW',
      entry_node_id: body.entry_node_id || current.entryNodeId || 'start',
      entryNodeId: body.entry_node_id || current.entryNodeId || 'start',
      flow_nodes: updatedNodes,
      nodes: updatedNodes.map((n) => ({
        id: n.node_key,
        name: n.node_key,
        type: n.node_type,
        config: n.config,
        positionX: n.position_x,
        positionY: n.position_y,
      })),
      updatedAt: new Date().toISOString(),
    }

    store.flows[idx] = updatedFlow
    saveStore(store)

    logAuditEvent({
      actorId: 'admin_user',
      actorName: 'Admin / Flow Editor',
      actorRole: 'SUPER_ADMIN',
      action: 'flow.updated',
      entityType: 'flow',
      entityId: id,
      outcome: 'SUCCESS',
      details: `Saved flow "${updatedFlow.name}" with ${updatedNodes.length} nodes.`,
    })

    const flowReturn: FlowRow = {
      id: updatedFlow.id,
      name: updatedFlow.name,
      description: updatedFlow.description || null,
      status: updatedFlow.status || 'draft',
      trigger_type: updatedFlow.trigger_type,
      trigger_config: updatedFlow.trigger_config,
      entry_node_id: updatedFlow.entry_node_id,
      created_at: updatedFlow.createdAt,
      updated_at: updatedFlow.updatedAt,
      run_count: updatedFlow.execution_count || 0,
      territoryId: updatedFlow.territoryId,
    }

    return NextResponse.json({ flow: flowReturn, nodes: updatedNodes })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const store = loadStore()

    const idx = (store.flows || []).findIndex((f) => f.id === id)
    if (idx === -1) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 })
    }

    const [deleted] = store.flows.splice(idx, 1)
    saveStore(store)

    logAuditEvent({
      actorId: 'admin_user',
      actorName: 'Admin',
      actorRole: 'SUPER_ADMIN',
      action: 'flow.deleted',
      entityType: 'flow',
      entityId: id,
      outcome: 'SUCCESS',
      details: `Deleted flow "${deleted.name}" (${id})`,
    })

    return NextResponse.json({ ok: true, deletedId: id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
