import { NextResponse } from 'next/server'
import { listFlowTemplates } from '@/lib/flows/templates'

export async function GET() {
  try {
    const templates = listFlowTemplates()
    return NextResponse.json({
      templates: templates.map((t) => ({
        slug: t.slug,
        name: t.name,
        description: t.description,
        icon: t.icon,
        node_count: t.nodes.length,
      })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
