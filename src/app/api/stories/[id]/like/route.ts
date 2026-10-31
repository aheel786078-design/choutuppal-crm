import { NextResponse } from 'next/server'
import { loadStore, mutateStore } from '@/lib/store'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    
    // Determine user identifier (client token, user identifier, or forwarded IP)
    const clientIdentifier =
      body.clientId ||
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      'anonymous_user'

    let resultLikesCount = 0
    let resultIsLiked = false
    let storyFound = false

    await mutateStore((store) => {
      const story = (store.stories || []).find((s) => s.id === id)
      if (!story) return

      storyFound = true
      if (typeof story.likesCount !== 'number') {
        story.likesCount = story.views ? Math.floor(story.views / 3) : 8
      }
      if (!Array.isArray(story.likedUserIps)) {
        story.likedUserIps = []
      }

      const existingIndex = story.likedUserIps.indexOf(clientIdentifier)
      if (existingIndex >= 0) {
        // Toggle Unlike
        story.likedUserIps.splice(existingIndex, 1)
        story.likesCount = Math.max(0, story.likesCount - 1)
        resultIsLiked = false
      } else {
        // Toggle Like
        story.likedUserIps.push(clientIdentifier)
        story.likesCount += 1
        resultIsLiked = true
      }

      resultLikesCount = story.likesCount
    })

    if (!storyFound) {
      return NextResponse.json({ success: false, error: 'Story not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      storyId: id,
      likesCount: resultLikesCount,
      isLiked: resultIsLiked,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
