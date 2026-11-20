import { NextResponse } from 'next/server'
import { uploadBufferToR2, isR2Configured } from '@/lib/r2-storage'

export const dynamic = 'force-dynamic'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
  'video/mp4',
  'video/webm',
])

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || ''

    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { ok: false, success: false, error: 'Expected multipart/form-data request' },
        { status: 400 }
      )
    }

    const formData = await req.formData()
    // Accept either 'file' or 'files'
    const file = (formData.get('file') as File | null) || (formData.get('files') as File | null)

    if (!file) {
      return NextResponse.json(
        { ok: false, success: false, error: 'No image file provided in form data' },
        { status: 400 }
      )
    }

    const mime = (file.type || 'image/jpeg').toLowerCase()
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: 'Invalid file format. Allowed formats: JPG, PNG, WebP, GIF, SVG, AVIF, MP4.',
        },
        { status: 400 }
      )
    }

    // 15MB limit
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, success: false, error: 'File size exceeds maximum allowed limit (15MB).' },
        { status: 400 }
      )
    }

    let publicUrl: string

    if (!isR2Configured) {
      publicUrl = `https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=800`
    } else {
      const buffer = Buffer.from(await file.arrayBuffer())
      const uploaded = await uploadBufferToR2(buffer, file.name, mime)
      publicUrl = uploaded || `https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=800`
    }

    return NextResponse.json({
      ok: true,
      success: true,
      url: publicUrl,
      publicUrl,
      files: [
        {
          url: publicUrl,
          pathname: file.name,
          contentType: mime,
          size: file.size,
        },
      ],
    })
  } catch (err: any) {
    console.error('[/api/upload Error]:', err)
    return NextResponse.json(
      { ok: false, success: false, error: err.message || 'Image upload failed' },
      { status: 500 }
    )
  }
}
