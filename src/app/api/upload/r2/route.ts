import { NextResponse } from 'next/server'
import { getR2PresignedUploadUrl, uploadBufferToR2, isR2Configured } from '@/lib/r2-storage'

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || ''

    // 1. JSON Request for presigned upload URL (preferred for fast client-side direct upload)
    if (contentType.includes('application/json')) {
      const body = await req.json()
      const { filename, fileType } = body

      if (!filename) {
        return NextResponse.json({ error: 'filename is required' }, { status: 400 })
      }

      if (!isR2Configured) {
        // Fallback for development before R2 keys are provided
        const mockUrl = `https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=800`
        return NextResponse.json({
          success: true,
          mock: true,
          uploadUrl: null,
          publicUrl: mockUrl,
          message: 'R2 not configured; returned fallback media URL.',
        })
      }

      const presigned = await getR2PresignedUploadUrl(filename, fileType || 'image/jpeg')
      return NextResponse.json({
        success: true,
        ...presigned,
      })
    }

    // 2. Direct Multipart FormData upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
      }

      if (!isR2Configured) {
        const mockUrl = `https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=800`
        return NextResponse.json({
          success: true,
          publicUrl: mockUrl,
          message: 'R2 not configured; returned fallback media URL.',
        })
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const publicUrl = await uploadBufferToR2(buffer, file.name, file.type || 'image/jpeg')

      return NextResponse.json({
        success: true,
        publicUrl,
      })
    }

    return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 400 })
  } catch (err: any) {
    console.error('[R2 Upload API Error]:', err)
    return NextResponse.json({ error: err.message || 'R2 upload failed' }, { status: 500 })
  }
}
