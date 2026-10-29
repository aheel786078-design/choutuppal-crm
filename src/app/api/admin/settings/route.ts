import { NextResponse } from 'next/server'
import { loadStore, saveStore, logAuditEvent, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import { requireSuperAdmin } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await requireSuperAdmin(req)
    if (auth.errorResponse) return auth.errorResponse

    const store = loadStore()
    const settings = store.settings || {
      whatsappToken: '',
      whatsappPhoneNumberId: '',
      whatsappVerifyToken: 'choutuppal_verify_token',
      syncListingsToCrmFlow: true,
      autoSendListingPhotoInChat: true,
    }

    const token = settings.whatsappToken || ''
    const maskedToken = token.length > 8
      ? `${token.slice(0, 4)}...${token.slice(-4)}`
      : (token ? '********' : '')

    return NextResponse.json({
      success: true,
      settings: {
        whatsappPhoneNumberId: settings.whatsappPhoneNumberId || '',
        whatsappVerifyToken: settings.whatsappVerifyToken || 'choutuppal_verify_token',
        syncListingsToCrmFlow: settings.syncListingsToCrmFlow !== false,
        autoSendListingPhotoInChat: settings.autoSendListingPhotoInChat !== false,
        hasCustomToken: Boolean(token),
        maskedToken,
      },
      webhookCallbackUrl: 'https://choutuppal.in/api/whatsapp/webhook',
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireSuperAdmin(req)
    if (auth.errorResponse) return auth.errorResponse

    const body = await req.json()
    const store = loadStore()

    if (!store.settings) {
      store.settings = {
        whatsappToken: '',
        whatsappPhoneNumberId: '',
        whatsappVerifyToken: 'choutuppal_verify_token',
        syncListingsToCrmFlow: true,
        autoSendListingPhotoInChat: true,
      }
    }

    // Only update whatsappToken if a new non-masked value was provided
    if (body.whatsappToken && !body.whatsappToken.includes('...') && !body.whatsappToken.startsWith('****')) {
      store.settings.whatsappToken = body.whatsappToken.trim()
    }

    if (typeof body.whatsappPhoneNumberId === 'string') {
      store.settings.whatsappPhoneNumberId = body.whatsappPhoneNumberId.trim()
    }

    if (typeof body.whatsappVerifyToken === 'string') {
      store.settings.whatsappVerifyToken = body.whatsappVerifyToken.trim()
    }

    if (typeof body.syncListingsToCrmFlow === 'boolean') {
      store.settings.syncListingsToCrmFlow = body.syncListingsToCrmFlow
    }

    if (typeof body.autoSendListingPhotoInChat === 'boolean') {
      store.settings.autoSendListingPhotoInChat = body.autoSendListingPhotoInChat
    }

    saveStore(store)

    logAuditEvent({
      actorId: auth.user.userId,
      actorName: auth.user.phone,
      actorRole: auth.user.role,
      territoryId: FLAGSHIP_TERRITORY_ID,
      action: 'SYSTEM_SETTINGS_UPDATED',
      details: 'Super Admin updated WhatsApp Cloud API & CRM sync settings.',
    })

    return NextResponse.json({
      success: true,
      message: 'System settings saved successfully.',
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
