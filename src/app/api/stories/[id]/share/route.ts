import { NextResponse } from 'next/server'
import { mutateStore } from '@/lib/store'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    let updatedShares = 0
    let storyFound = false

    await mutateStore((store) => {
      const story = (store.stories || []).find((s) => s.id === id)
      if (!story) return

      storyFound = true
      story.sharesCount = (story.sharesCount || 0) + 1
      updatedShares = story.sharesCount
    })

    if (!storyFound) {
      return NextResponse.json({ success: false, error: 'Story not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      storyId: id,
      sharesCount: updatedShares,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
