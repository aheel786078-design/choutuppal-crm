/**
 * Media-upload helper for WhatsApp flow attachments.
 */

export const MEDIA_MAX_BYTES = 16 * 1024 * 1024

export const MEDIA_MAX_BYTES_BY_KIND = {
  image: 5 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  audio: 16 * 1024 * 1024,
  document: 16 * 1024 * 1024,
} as const

export async function uploadAccountMedia(
  fileOrBucket: File | string,
  maybeFile?: File,
  options?: { accountId?: string; bucket?: string }
): Promise<{ url: string; publicUrl: string; path: string }> {
  const file = fileOrBucket instanceof File ? fileOrBucket : (maybeFile as File)
  try {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/upload/r2', {
      method: 'POST',
      body: formData,
    })

    if (res.ok) {
      const data = await res.json()
      if (data.url) {
        return { url: data.url, publicUrl: data.url, path: data.url }
      }
    }
  } catch (err) {
    console.warn('API upload failed, falling back to local object URL:', err)
  }

  // Fallback to object URL
  const localUrl = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(file) : ''
  return { url: localUrl, publicUrl: localUrl, path: file.name }
}
