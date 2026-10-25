import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'csv', 'sample_automations.csv')
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ success: false, automations: [] })
    }

    const content = fs.readFileSync(csvPath, 'utf-8')
    const lines = content.split('\n').filter((l) => l.trim().length > 0)
    const header = lines[0].split(',')

    const automations = []
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',')
      if (parts.length >= 6) {
        automations.push({
          id: `auto_${i}`,
          name: parts[0]?.trim(),
          trigger_type: parts[1]?.trim(),
          trigger_value: parts[2]?.trim(),
          action_type: parts[3]?.trim(),
          action_value: parts[4]?.trim(),
          is_active: parts[5]?.trim() === 'true',
          description: parts[6]?.trim() || '',
        })
      }
    }

    return NextResponse.json({
      success: true,
      count: automations.length,
      automations,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
