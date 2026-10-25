import { NextResponse } from 'next/server'
import { getR2PresignedUploadUrl, uploadBufferToR2, isR2Configured } from '@/lib/r2-storage'
import { requireAuth } from '@/lib/auth-server'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
])

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const contentType = req.headers.get('content-type') || ''

    // 1. JSON Request for presigned upload URL
    if (contentType.includes('application/json')) {
      const body = await req.json()
      const { filename, fileType } = body

      if (!filename) {
        return NextResponse.json({ error: 'filename is required' }, { status: 400 })
      }

      const mime = (fileType || 'image/jpeg').toLowerCase()
      if (!ALLOWED_MIME_TYPES.has(mime)) {
        return NextResponse.json(
          { error: 'Invalid file type. Only JPEG, PNG, WebP, GIF, and MP4 are permitted.' },
          { status: 400 }
        )
      }

      if (!isR2Configured) {
        const mockUrl = `https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=800`
        return NextResponse.json({
          success: true,
          mock: true,
          uploadUrl: null,
          publicUrl: mockUrl,
          message: 'R2 not configured; returned fallback media URL.',
        })
      }

      const presigned = await getR2PresignedUploadUrl(filename, mime)
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

      const mime = (file.type || 'image/jpeg').toLowerCase()
      if (!ALLOWED_MIME_TYPES.has(mime)) {
        return NextResponse.json(
          { error: 'Invalid file type. Only JPEG, PNG, WebP, GIF, and MP4 are permitted.' },
          { status: 400 }
        )
      }

      // Max 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File size exceeds 10MB limit.' },
          { status: 400 }
        )
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
      const publicUrl = await uploadBufferToR2(buffer, file.name, mime)

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
