import { NextResponse } from 'next/server'
import { loadStore, saveStore, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import { ShortItem, ApprovalItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { url, title, phone, tag, territoryId } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'Valid URL is required' }, { status: 400 })
    }

    // SSRF / Malicious scheme protection
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      return NextResponse.json({ success: false, error: 'URL must use https or http scheme' }, { status: 400 })
    }

    const store = loadStore()
    if (!store.shorts) store.shorts = []
    if (!store.approvals) store.approvals = []

    // Derive thumbnail if YouTube
    let thumbnail = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=80'
    const ytMatch = url.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)([\w-]{11})/)
    if (ytMatch) {
      thumbnail = `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg`
    }

    const assignedTerritory = territoryId || FLAGSHIP_TERRITORY_ID
    const newShortId = `sh_${Date.now()}`

    const newShort: ShortItem = {
      id: newShortId,
      title: title || 'Local Reel Submission',
      videoUrl: url,
      thumbnailUrl: thumbnail,
      tags: tag ? [tag] : ['Community'],
      views: 1,
      isActive: false, // Requires admin moderation approval before public display
      createdAt: new Date().toISOString(),
    }

    // Route into moderation approval queue
    const approvalItem: ApprovalItem = {
      id: `appr_short_${Date.now()}`,
      type: 'CITIZEN_REPORT',
      title: `Reel Submission: ${newShort.title}`,
      submitterName: phone ? `User (${phone})` : 'Anonymous Citizen',
      submitterPhone: phone || '9999999999',
      territoryId: assignedTerritory,
      status: 'pending',
      mediaUrl: thumbnail,
      data: {
        shortId: newShortId,
        url,
        title: newShort.title,
      },
      submittedAt: new Date().toISOString(),
    }

    store.shorts.unshift(newShort)
    store.approvals.unshift(approvalItem)
    saveStore(store)

    return NextResponse.json({
      success: true,
      message: 'Short/Reel submitted successfully and queued for admin moderation approval.',
      short: newShort,
      approvalId: approvalItem.id,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
