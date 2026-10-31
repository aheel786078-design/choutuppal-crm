import { NextResponse } from 'next/server'
import { loadStore, mutateStore } from '@/lib/store'
import type { StoryComment } from '@/lib/types'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const store = loadStore()
    const story = (store.stories || []).find((s) => s.id === id)

    if (!story) {
      return NextResponse.json({ success: false, error: 'Story not found' }, { status: 404 })
    }

    const comments = (story.comments || [])
      .filter((c) => c.status !== 'hidden')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      success: true,
      storyId: id,
      comments,
      commentsCount: comments.length,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))

    const rawText = String(body.text || '').trim()
    const rawName = String(body.userName || body.name || 'Citizen').trim()
    const rawPhone = String(body.userPhone || body.phone || '').trim()
    const isOwnerReply = Boolean(body.isOwnerReply)

    if (!rawText || rawText.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Comment text is required (min 2 chars)' },
        { status: 400 }
      )
    }

    if (rawText.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Comment exceeds max length (500 chars)' },
        { status: 400 }
      )
    }

    // Basic profanity / spam check
    const prohibitedWords = ['http://', 'https://', 'bit.ly', 'telegram.me', 't.me']
    const hasSpamLink = prohibitedWords.some((w) => rawText.toLowerCase().includes(w))
    if (hasSpamLink && !isOwnerReply) {
      return NextResponse.json(
        { success: false, error: 'Links are not permitted in story comments' },
        { status: 400 }
      )
    }

    const newComment: StoryComment = {
      id: `cm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      storyId: id,
      userName: rawName.slice(0, 50) || 'Citizen',
      userPhone: rawPhone || undefined,
      text: rawText,
      isOwnerReply,
      createdAt: new Date().toISOString(),
      status: 'published',
    }

    let updatedCommentsCount = 0
    let storyFound = false

    await mutateStore((store) => {
      const story = (store.stories || []).find((s) => s.id === id)
      if (!story) return

      storyFound = true
      if (!Array.isArray(story.comments)) {
        story.comments = []
      }

      story.comments.unshift(newComment)
      updatedCommentsCount = story.comments.filter((c) => c.status !== 'hidden').length
    })

    if (!storyFound) {
      return NextResponse.json({ success: false, error: 'Story not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      storyId: id,
      comment: newComment,
      commentsCount: updatedCommentsCount,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
