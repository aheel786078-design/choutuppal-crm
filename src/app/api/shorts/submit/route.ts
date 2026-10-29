import { NextResponse } from 'next/server'
import { loadStore, saveStore, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import { ShortItem, ApprovalItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

function isPrivateOrLocalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '::1' ||
    lower === '[::1]' ||
    lower === '0.0.0.0' ||
    lower === '169.254.169.254' ||
    lower === 'metadata.google.internal' ||
    lower === 'instance-data' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.lan')
  ) {
    return true
  }

  // IPv4 regex check
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const match = lower.match(ipv4Regex)
  if (match) {
    const p1 = parseInt(match[1], 10)
    const p2 = parseInt(match[2], 10)
    if (p1 === 10) return true // 10.0.0.0/8
    if (p1 === 127) return true // 127.0.0.0/8
    if (p1 === 169 && p2 === 254) return true // 169.254.0.0/16
    if (p1 === 172 && p2 >= 16 && p2 <= 31) return true // 172.16.0.0/12
    if (p1 === 192 && p2 === 168) return true // 192.168.0.0/16
    if (p1 === 0) return true // 0.0.0.0/8
  }

  return false
}

export async function POST(req: Request) {
  try {
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON request body' }, { status: 400 })
    }

    const { url, title, phone, tag, territoryId } = body || {}

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ success: false, error: 'Valid video URL is required' }, { status: 400 })
    }

    const trimmedUrl = url.trim()
    if (trimmedUrl.length > 2048) {
      return NextResponse.json({ success: false, error: 'URL exceeds maximum allowed length (2048 characters)' }, { status: 400 })
    }

    // URL Parsing and SSRF / Protocol Validation
    let parsedUrl: URL
    try {
      parsedUrl = new URL(trimmedUrl)
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 })
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json(
        { success: false, error: 'URL must use http or https scheme' },
        { status: 400 }
      )
    }

    if (isPrivateOrLocalHost(parsedUrl.hostname)) {
      return NextResponse.json(
        { success: false, error: 'Local, internal, and loopback addresses are prohibited for security' },
        { status: 400 }
      )
    }

    if (parsedUrl.port && parsedUrl.port !== '80' && parsedUrl.port !== '443') {
      return NextResponse.json(
        { success: false, error: 'Custom ports are not allowed for submitted URLs' },
        { status: 400 }
      )
    }

    const store = loadStore()
    if (!store.shorts) store.shorts = []
    if (!store.approvals) store.approvals = []

    const normalizedUrl = parsedUrl.href

    // Duplicate Check 1: Pending Moderation Approvals
    const hasPendingDuplicate = store.approvals.some(
      (a) =>
        a.status === 'pending' &&
        a.data?.url &&
        a.data.url.trim().toLowerCase() === normalizedUrl.toLowerCase()
    )
    if (hasPendingDuplicate) {
      return NextResponse.json(
        {
          success: false,
          error: 'This video has already been submitted and is currently awaiting moderation approval.',
        },
        { status: 409 }
      )
    }

    // Duplicate Check 2: Recently added short within last 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    const hasRecentDuplicate = store.shorts.some((s) => {
      if (s.videoUrl && s.videoUrl.trim().toLowerCase() === normalizedUrl.toLowerCase()) {
        const createdMs = s.createdAt ? new Date(s.createdAt).getTime() : 0
        return createdMs > fiveMinutesAgo
      }
      return false
    })
    if (hasRecentDuplicate) {
      return NextResponse.json(
        {
          success: false,
          error: 'This video was recently submitted. Please wait before submitting again.',
        },
        { status: 409 }
      )
    }

    // Derive thumbnail if YouTube
    let thumbnail = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=80'
    const ytMatch = normalizedUrl.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)([\w-]{11})/)
    if (ytMatch) {
      thumbnail = `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg`
    }

    // Territory Assignment & Validation
    let assignedTerritory = FLAGSHIP_TERRITORY_ID
    if (typeof territoryId === 'string' && territoryId.trim()) {
      const matchTerr = (store.territories || []).find((t) => t.id === territoryId.trim())
      if (matchTerr) {
        assignedTerritory = matchTerr.id
      }
    }

    // Sanitize Title & Tag
    const cleanTitle =
      typeof title === 'string' && title.trim()
        ? title.trim().replace(/<[^>]*>?/gm, '').slice(0, 150)
        : 'Local Reel Submission'

    const cleanTag =
      typeof tag === 'string' && tag.trim()
        ? tag.trim().replace(/<[^>]*>?/gm, '').slice(0, 50)
        : 'Community'

    let cleanPhone = ''
    if (typeof phone === 'string' && phone.trim()) {
      cleanPhone = phone.replace(/[^0-9]/g, '')
      if (cleanPhone.length > 15) cleanPhone = cleanPhone.slice(0, 15)
    }

    const newShortId = `sh_${Date.now()}`

    // Create inactive short record (never trust client isActive)
    const newShort: ShortItem = {
      id: newShortId,
      title: cleanTitle,
      videoUrl: normalizedUrl,
      thumbnailUrl: thumbnail,
      tags: [cleanTag],
      territoryId: assignedTerritory,
      views: 0,
      isActive: false, // Strict: requires admin moderation approval before public display
      createdAt: new Date().toISOString(),
    }

    // Route into moderation approval queue
    const approvalItem: ApprovalItem = {
      id: `appr_short_${Date.now()}`,
      type: 'CITIZEN_REPORT',
      title: `Reel Submission: ${cleanTitle}`,
      submitterName: cleanPhone ? `Citizen (${cleanPhone})` : 'Anonymous Citizen',
      submitterPhone: cleanPhone || '9999999999',
      territoryId: assignedTerritory,
      status: 'pending',
      mediaUrl: thumbnail,
      data: {
        shortId: newShortId,
        url: normalizedUrl,
        title: cleanTitle,
        tags: [cleanTag],
        territoryId: assignedTerritory,
      },
      submittedAt: new Date().toISOString(),
    }

    store.shorts.unshift(newShort)
    store.approvals.unshift(approvalItem)
    saveStore(store)

    return NextResponse.json(
      {
        success: true,
        message: 'Short/Reel submitted successfully and queued for admin moderation approval.',
        short: newShort,
        approvalId: approvalItem.id,
      },
      { status: 201 }
    )
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

