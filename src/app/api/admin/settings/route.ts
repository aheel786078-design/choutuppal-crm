import { NextResponse } from 'next/server'
import { loadStore, saveStore, logAuditEvent, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import { requireSuperAdmin } from '@/lib/auth-server'
import { getBaseUrl } from '@/lib/utils'
import { getSupabaseAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await requireSuperAdmin(req)
    if (auth.errorResponse) return auth.errorResponse

    const store = loadStore()
    if (!store.settings) {
      store.settings = {
        whatsappToken: '',
        whatsappPhoneNumberId: '',
        whatsappBusinessAccountId: '',
        whatsappVerifyToken: 'choutuppal_verify_token',
        syncListingsToCrmFlow: true,
        autoSendListingPhotoInChat: true,
      }
    }

    const supabase = getSupabaseAdminClient()

    // 1. If local /tmp settings have no token, restore from Supabase persistent territory branding
    if (!store.settings.whatsappToken && supabase) {
      try {
        const { data: t } = await supabase
          .from('territories')
          .select('branding')
          .eq('id', FLAGSHIP_TERRITORY_ID)
          .single()
        if (t?.branding?.whatsappSettings) {
          const ws = t.branding.whatsappSettings
          if (ws.whatsappToken) store.settings.whatsappToken = ws.whatsappToken
          if (ws.whatsappPhoneNumberId) store.settings.whatsappPhoneNumberId = ws.whatsappPhoneNumberId
          if (ws.whatsappBusinessAccountId) store.settings.whatsappBusinessAccountId = ws.whatsappBusinessAccountId
          if (ws.whatsappVerifyToken) store.settings.whatsappVerifyToken = ws.whatsappVerifyToken
          if (typeof ws.syncListingsToCrmFlow === 'boolean') store.settings.syncListingsToCrmFlow = ws.syncListingsToCrmFlow
          if (typeof ws.autoSendListingPhotoInChat === 'boolean') store.settings.autoSendListingPhotoInChat = ws.autoSendListingPhotoInChat
          saveStore(store)
        }
      } catch (sbErr) {
        console.warn('[Admin Settings GET] Supabase branding sync error:', sbErr)
      }
    }

    const settings = store.settings
    const token = settings.whatsappToken || ''
    const maskedToken = token.length > 8
      ? `${token.slice(0, 4)}...${token.slice(-4)}`
      : (token ? '********' : '')

    // 2. Fetch recent WhatsApp activity from Supabase (persistent across all serverless containers)
    let recentActivity: Array<{
      id: string
      phone: string
      contactName?: string
      direction: 'inbound' | 'outbound'
      messageText: string
      status: string
      errorDetails?: string
      createdAt: string
    }> = []

    if (supabase) {
      try {
        const { data: dbMsgs } = await supabase
          .from('whatsapp_messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(15)

        if (dbMsgs && dbMsgs.length > 0) {
          recentActivity = dbMsgs.map((m: any) => ({
            id: m.id,
            phone: m.phone,
            contactName: m.contact_name || undefined,
            direction: (m.direction || '').toLowerCase().includes('in') ? 'inbound' : 'outbound',
            messageText: m.message_text || m.text || '',
            status: m.status || 'sent',
            errorDetails: m.metadata?.errorDetails || undefined,
            createdAt: m.created_at || m.timestamp || new Date().toISOString(),
          }))
        }
      } catch (msgErr) {
        console.warn('[Admin Settings GET] Supabase whatsapp_messages fetch error:', msgErr)
      }
    }

    // Fallback to store.messages if Supabase has no records yet
    if (recentActivity.length === 0) {
      recentActivity = (store.messages || []).slice(0, 10).map((m) => ({
        id: m.id,
        phone: m.phone,
        contactName: m.contactName,
        direction: m.direction,
        messageText: m.messageText,
        status: m.status,
        errorDetails: m.errorDetails,
        createdAt: m.createdAt,
      }))
    }

    return NextResponse.json({
      success: true,
      settings: {
        whatsappPhoneNumberId: settings.whatsappPhoneNumberId || '',
        whatsappBusinessAccountId: settings.whatsappBusinessAccountId || '',
        whatsappVerifyToken: settings.whatsappVerifyToken || 'choutuppal_verify_token',
        syncListingsToCrmFlow: settings.syncListingsToCrmFlow !== false,
        autoSendListingPhotoInChat: settings.autoSendListingPhotoInChat !== false,
        showOfficialGuarantee: Boolean(settings.showOfficialGuarantee),
        hasCustomToken: Boolean(token),
        maskedToken,
      },
      webhookCallbackUrl: `${getBaseUrl()}/api/whatsapp/webhook`,
      recentActivity,
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
        whatsappBusinessAccountId: '',
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

    if (typeof body.whatsappBusinessAccountId === 'string') {
      store.settings.whatsappBusinessAccountId = body.whatsappBusinessAccountId.trim()
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

    if (typeof body.showOfficialGuarantee === 'boolean') {
      store.settings.showOfficialGuarantee = body.showOfficialGuarantee
    }

    saveStore(store)

    // Persist settings to Supabase territory_choutuppal branding so they survive serverless restarts
    const supabase = getSupabaseAdminClient()
    if (supabase) {
      try {
        const { data: t } = await supabase
          .from('territories')
          .select('branding')
          .eq('id', FLAGSHIP_TERRITORY_ID)
          .single()

        const updatedBranding = {
          ...(t?.branding || {}),
          whatsappSettings: {
            whatsappToken: store.settings.whatsappToken,
            whatsappPhoneNumberId: store.settings.whatsappPhoneNumberId,
            whatsappBusinessAccountId: store.settings.whatsappBusinessAccountId,
            whatsappVerifyToken: store.settings.whatsappVerifyToken,
            syncListingsToCrmFlow: store.settings.syncListingsToCrmFlow,
            autoSendListingPhotoInChat: store.settings.autoSendListingPhotoInChat,
          },
        }

        await supabase
          .from('territories')
          .update({ branding: updatedBranding })
          .eq('id', FLAGSHIP_TERRITORY_ID)
      } catch (sbSaveErr) {
        console.warn('[Admin Settings POST] Supabase branding persist error:', sbSaveErr)
      }
    }

    logAuditEvent({
      actorId: auth.user.userId,
      actorName: auth.user.phone,
      actorRole: auth.user.role,
      territoryId: FLAGSHIP_TERRITORY_ID,
      action: 'SYSTEM_SETTINGS_UPDATED',
      details: 'Super Admin updated WhatsApp Cloud API & CRM sync settings (synced to Supabase).',
    })

    return NextResponse.json({
      success: true,
      message: 'System settings saved and synchronized to database successfully.',
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
