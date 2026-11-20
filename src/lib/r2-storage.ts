import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function sanitizeEnv(val?: string): string {
  if (!val) return ''
  return val.trim().replace(/^["']|["']$/g, '').trim()
}

function sanitizeAccountId(val?: string): string {
  return sanitizeEnv(val).replace(/\s+/g, '')
}

function sanitizePublicDomain(val?: string): string {
  let domain = sanitizeEnv(val) || 'https://images.choutuppal.in'
  domain = domain.replace(/\/+$/, '')
  if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
    domain = `https://${domain}`
  }
  return domain
}

const accountId = sanitizeAccountId(process.env.R2_ACCOUNT_ID)
const accessKeyId = sanitizeEnv(process.env.R2_ACCESS_KEY_ID)
const secretAccessKey = sanitizeEnv(process.env.R2_SECRET_ACCESS_KEY)
const bucketName = sanitizeEnv(process.env.R2_BUCKET_NAME) || 'choutuppal-media'
const publicDomain = sanitizePublicDomain(process.env.R2_PUBLIC_DOMAIN)

export const isR2Configured = Boolean(
  accountId && accessKeyId && secretAccessKey && !accountId.includes('your-cloudflare')
)

export function formatR2PublicUrl(key: string): string {
  const cleanKey = key.replace(/^\/+/, '')
  return `${publicDomain}/${cleanKey}`
}

function getR2Client(): S3Client | null {
  if (!isR2Configured) return null
  try {
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`
    return new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  } catch (err) {
    console.error('[R2 Storage] Failed to initialize S3Client:', err)
    return null
  }
}

/**
 * Generate a pre-signed upload URL for direct browser-to-R2 upload
 */
export async function getR2PresignedUploadUrl(
  filename: string,
  contentType: string,
): Promise<{ uploadUrl: string; publicUrl: string; key: string } | null> {
  const client = getR2Client()
  if (!client) return null

  try {
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = `uploads/${Date.now()}-${cleanFilename}`
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 })
    const publicUrl = formatR2PublicUrl(key)

    return { uploadUrl, publicUrl, key }
  } catch (err) {
    console.error('[R2 Storage] getR2PresignedUploadUrl error:', err)
    return null
  }
}

/**
 * Direct server-side upload to Cloudflare R2
 */
export async function uploadBufferToR2(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string | null> {
  const client = getR2Client()
  if (!client) {
    console.warn('[R2 Storage] R2 client is not configured or failed initialization.')
    return null
  }

  try {
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = `uploads/${Date.now()}-${cleanFilename}`
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    )

    return formatR2PublicUrl(key)
  } catch (err) {
    console.error('[R2 Storage] uploadBufferToR2 error:', err)
    return null
  }
}
