import { NextResponse } from 'next/server'
import { loadStore, saveStore } from '@/lib/store'
import { ShortItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { url, title, phone, tag } = body

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 })
    }

    const store = loadStore()
    if (!store.shorts) store.shorts = []

    // Derive thumbnail if YouTube
    let thumbnail = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=80'
    const ytMatch = url.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)([\w-]{11})/)
    if (ytMatch) {
      thumbnail = `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg`
    }

    const newShort: ShortItem = {
      id: `sh_${Date.now()}`,
      title: title || 'Local Reel Submission',
      videoUrl: url,
      thumbnailUrl: thumbnail,
      tags: tag ? [tag] : ['Choutuppal', 'Community'],
      views: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
    }

    store.shorts.unshift(newShort)
    saveStore(store)

    return NextResponse.json({
      success: true,
      message: 'Short/Reel submitted successfully',
      short: newShort,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
