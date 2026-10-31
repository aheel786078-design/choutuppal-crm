import { NextResponse } from 'next/server'
import { loadStore, saveStore, logAuditEvent, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import { getFlowTemplate } from '@/lib/flows/templates'
import type { FlowRow, FlowNodeRow, FlowNodeType } from '@/lib/flows/types'

export async function GET() {
  try {
    const store = loadStore()
    const flows: FlowRow[] = (store.flows || []).map((raw) => ({
      id: raw.id,
      name: raw.name || 'Untitled WhatsApp Flow',
      description: raw.description || null,
      status: (raw.status as any) || (raw.isActive ? 'active' : 'draft'),
      trigger_type: ((raw as any).trigger_type || 'keyword') as any,
      trigger_config: (raw as any).trigger_config || {
        keywords: raw.trigger_keywords || (raw.triggerKeyword ? [raw.triggerKeyword] : ['HI', 'MENU']),
        match_type: 'contains',
      },
      entry_node_id: (raw as any).entry_node_id || raw.entryNodeId || 'start',
      created_at: raw.createdAt || new Date().toISOString(),
      updated_at: raw.updatedAt || new Date().toISOString(),
      run_count: (raw as any).execution_count || (raw as any).run_count || 0,
      territoryId: raw.territoryId || FLAGSHIP_TERRITORY_ID,
    }))

    return NextResponse.json({ flows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const store = loadStore()

    const flowId = body.id || `flow_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    let nodes: FlowNodeRow[] = []
    let templateSlug: string | undefined = body.template_slug

    if (templateSlug) {
      const template = getFlowTemplate(templateSlug)
      if (template) {
        nodes = template.nodes.map((n, idx) => ({
          id: `node_${flowId}_${idx + 1}`,
          flow_id: flowId,
          node_key: n.node_key,
          node_type: n.node_type as FlowNodeType,
          config: n.config as Record<string, unknown>,
          position_x: 100 + (idx % 3) * 280,
          position_y: 100 + Math.floor(idx / 3) * 240,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
      }
    }

    if (nodes.length === 0) {
      nodes = [
        {
          id: `node_${flowId}_start`,
          flow_id: flowId,
          node_key: 'start',
          node_type: 'start',
          config: { next_node_key: 'entry_message' },
          position_x: 120,
          position_y: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: `node_${flowId}_msg`,
          flow_id: flowId,
          node_key: 'entry_message',
          node_type: 'send_message',
          config: {
            text: 'నమస్కారం! Welcome to Choutuppal App WhatsApp Service.\n\nPlease select an option below:',
            next_node_key: 'end',
          },
          position_x: 120,
          position_y: 260,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: `node_${flowId}_end`,
          flow_id: flowId,
          node_key: 'end',
          node_type: 'end',
          config: {},
          position_x: 120,
          position_y: 440,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]
    }

    const defaultKeywords = [body.name?.toUpperCase().replace(/\s+/g, '_') || 'START']
    const triggerConfig = body.trigger_config || { keywords: defaultKeywords, match_type: 'contains' }

    const newFlow: any = {
      id: flowId,
      name: body.name?.trim() || 'New WhatsApp Flow',
      description: body.description || '',
      status: 'draft',
      territoryId: body.territoryId || FLAGSHIP_TERRITORY_ID,
      version: 1,
      trigger_type: body.trigger_type || 'keyword',
      trigger_config: triggerConfig,
      triggerKeyword: defaultKeywords[0],
      trigger_keywords: defaultKeywords,
      entry_node_id: 'start',
      entryNodeId: 'start',
      flow_nodes: nodes,
      nodes: nodes.map((n) => ({
        id: n.node_key,
        name: n.node_key,
        type: n.node_type,
        config: n.config,
        positionX: n.position_x,
        positionY: n.position_y,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (!store.flows) store.flows = []
    store.flows.unshift(newFlow)
    saveStore(store)

    logAuditEvent({
      actorId: 'admin_user',
      actorName: 'Admin',
      actorRole: 'SUPER_ADMIN',
      action: 'flow.created',
      entityType: 'flow',
      entityId: flowId,
      outcome: 'SUCCESS',
      details: `Created new WhatsApp flow "${newFlow.name}" (${flowId})`,
    })

    const flowReturn: FlowRow = {
      id: newFlow.id,
      name: newFlow.name,
      description: newFlow.description,
      status: 'draft',
      trigger_type: newFlow.trigger_type,
      trigger_config: newFlow.trigger_config,
      entry_node_id: newFlow.entry_node_id,
      created_at: newFlow.createdAt,
      updated_at: newFlow.updatedAt,
      run_count: 0,
      territoryId: newFlow.territoryId,
    }

    return NextResponse.json({ flow: flowReturn, nodes })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
