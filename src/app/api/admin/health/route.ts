import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { requireAuth } from '@/lib/auth-server'
import { isR2Configured } from '@/lib/r2-storage'
import { getPaymentGatewayAdapter } from '@/lib/payment-gateway'
import type { SystemHealthReport, HealthStatusLabel } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    // 1. Enforce Server-Side Authentication
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const now = new Date().toISOString()

    // 2. Process & Runtime Diagnostic
    const mem = process.memoryUsage()
    const appDiagnostic = {
      status: 'HEALTHY' as const,
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      memoryUsageMB: {
        rss: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
        heapTotal: Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10,
        heapUsed: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
      },
      environment: process.env.NODE_ENV || 'development',
    }

    // 3. Local JSON Data Store Diagnostics (Strictly Non-Destructive)
    const storeRelativePath = path.join('data', 'admin_data.json')
    const storeAbsolutePath = path.resolve(process.cwd(), storeRelativePath)

    let storageStatus: 'CONNECTED' | 'ERROR' = 'ERROR'
    let isReadable = false
    let isWritable = false
    let isParseable = false
    let fileSizeBytes = 0
    let sha256Hash = ''
    let lastModified = ''
    let storageError: string | undefined
    let parsedData: any = null

    try {
      if (fs.existsSync(storeAbsolutePath)) {
        const stats = fs.statSync(storeAbsolutePath)
        fileSizeBytes = stats.size
        lastModified = stats.mtime.toISOString()

        // Read and hash
        const rawContent = fs.readFileSync(storeAbsolutePath, 'utf-8')
        isReadable = true
        sha256Hash = crypto.createHash('sha256').update(rawContent).digest('hex')

        // Parse test
        parsedData = JSON.parse(rawContent)
        isParseable = true

        // Writable check using fs.access (non-destructive; does NOT write to disk)
        fs.accessSync(storeAbsolutePath, fs.constants.R_OK | fs.constants.W_OK)
        isWritable = true

        storageStatus = 'CONNECTED'
      } else {
        storageError = 'Data store file does not exist at expected location.'
      }
    } catch (err: any) {
      storageStatus = 'ERROR'
      storageError = err?.message || 'Failed to inspect local data store.'
    }

    const recordCounts = {
      listings: Array.isArray(parsedData?.listings) ? parsedData.listings.length : 0,
      contacts: Array.isArray(parsedData?.contacts) ? parsedData.contacts.length : 0,
      deals: Array.isArray(parsedData?.deals) ? parsedData.deals.length : 0,
      franchises: Array.isArray(parsedData?.franchises) ? parsedData.franchises.length : 0,
      territories: Array.isArray(parsedData?.territories) ? parsedData.territories.length : 0,
      automations: Array.isArray(parsedData?.automations) ? parsedData.automations.length : 0,
      orders: Array.isArray(parsedData?.orders) ? parsedData.orders.length : 0,
      subscriptions: Array.isArray(parsedData?.subscriptions) ? parsedData.subscriptions.length : 0,
      governmentContacts: Array.isArray(parsedData?.governmentContacts) ? parsedData.governmentContacts.length : 0,
    }

    // 4. WhatsApp Cloud API Integration Status
    const whatsappToken = parsedData?.settings?.whatsappToken || process.env.WHATSAPP_TOKEN
    const whatsappPhoneId = parsedData?.settings?.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID
    const hasWhatsAppCreds = Boolean(whatsappToken && whatsappPhoneId)

    let whatsappStatus: HealthStatusLabel = 'NOT_CONFIGURED'
    let whatsappDetails = 'WhatsApp Cloud API credentials not configured. Messages simulated in local CRM sandbox.'

    if (hasWhatsAppCreds) {
      // Credentials exist, but external live API ping is not called to prevent unsolicited side effects
      whatsappStatus = 'NOT_VERIFIED'
      whatsappDetails = 'Phone ID and access token configured. Outbound network probe deferred to prevent live messaging side effects.'
    }

    // 5. Payment Gateway Integration Status
    const paymentAdapter = getPaymentGatewayAdapter()
    let paymentStatus: HealthStatusLabel = 'MOCK'
    let paymentDetails = 'Application using offline MockPaymentGatewayAdapter in sandbox test mode.'

    if (paymentAdapter.name === 'razorpay') {
      paymentStatus = 'NOT_VERIFIED'
      paymentDetails = 'Razorpay Key ID and Secret configured. External gateway charge probe deferred to prevent billing side effects.'
    }

    // 6. Cloudflare R2 Storage Status
    let r2Status: HealthStatusLabel = 'NOT_CONFIGURED'
    let r2Details = 'Cloudflare R2 bucket credentials not configured. Presigned upload URLs unavailable; media uses preset/external URLs.'

    if (isR2Configured) {
      r2Status = 'NOT_VERIFIED'
      r2Details = 'Cloudflare R2 S3 credentials detected. Bucket access ping deferred to prevent unnecessary remote API calls.'
    }

    // 7. Automation Engine Status
    const automationsList = Array.isArray(parsedData?.automations) ? parsedData.automations : []
    const activeRules = automationsList.filter((a: any) => a.status === 'active' || a.isActive).length
    const draftRules = automationsList.filter((a: any) => a.status === 'draft').length
    const pausedRules = automationsList.filter((a: any) => a.status === 'paused' || a.status === 'disabled').length

    const healthReport: SystemHealthReport = {
      timestamp: now,
      app: {
        ...appDiagnostic,
        status: storageStatus === 'CONNECTED' ? 'HEALTHY' : 'DEGRADED',
      },
      storage: {
        status: storageStatus,
        type: 'LOCAL_JSON',
        storePath: storeRelativePath,
        readable: isReadable,
        writable: isWritable,
        parseable: isParseable,
        fileSizeBytes,
        sha256Hash,
        lastModified,
        recordCounts,
        error: storageError,
      },
      integrations: {
        whatsappCloudApi: {
          status: whatsappStatus,
          phoneNumberIdConfigured: Boolean(whatsappPhoneId),
          tokenConfigured: Boolean(whatsappToken),
          syncListingsConfigured: parsedData?.settings?.syncListingsToCrmFlow !== false,
          details: whatsappDetails,
        },
        r2Storage: {
          status: r2Status,
          details: r2Details,
        },
        paymentGateway: {
          status: paymentStatus,
          activeAdapter: paymentAdapter.name,
          details: paymentDetails,
        },
      },
      automations: {
        totalRules: automationsList.length,
        activeRules,
        draftRules,
        pausedRules,
        status: 'MOCK',
        details: `${automationsList.length} rules loaded. WhatsApp execution operates in safe sandbox simulation mode.`,
      },
    }

    return NextResponse.json({
      success: true,
      report: healthReport,
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'System health diagnostic inspection failed.',
        details: err?.message || 'Unknown internal diagnostic error',
      },
      { status: 500 }
    )
  }
}
