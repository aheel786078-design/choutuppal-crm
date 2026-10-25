import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const accountId = process.env.R2_ACCOUNT_ID || ''
const accessKeyId = process.env.R2_ACCESS_KEY_ID || ''
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || ''
const bucketName = process.env.R2_BUCKET_NAME || 'choutuppal-media'
const publicDomain = process.env.R2_PUBLIC_DOMAIN || 'https://media.choutuppal.in'

export const isR2Configured = Boolean(
  accountId && accessKeyId && secretAccessKey && !accountId.includes('your-cloudflare')
)

function getR2Client(): S3Client | null {
  if (!isR2Configured) return null
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
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

  const key = `uploads/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 })
  const publicUrl = `${publicDomain}/${key}`

  return { uploadUrl, publicUrl, key }
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
  if (!client) return null

  const key = `uploads/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  )

  return `${publicDomain}/${key}`
}
