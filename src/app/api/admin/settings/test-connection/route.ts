import { NextResponse } from 'next/server'
import { loadStore, saveStore, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import { requireSuperAdmin } from '@/lib/auth-server'
import { getBaseUrl } from '@/lib/utils'
import { sendWhatsAppFlowMessage } from '@/lib/whatsapp-cloud-api'
import { getSupabaseAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function mapMetaError(code?: number, message?: string): string {
  if (code === 190) {
    return 'Token Expired or Invalid (Error 190): Meta access token is expired or was revoked. Please generate a Permanent System User Token from Meta Business Settings.'
  }
  if (code === 100) {
    return 'Invalid Phone Number ID (Error 100): The Phone Number ID does not exist in this Meta App. Please copy the Phone Number ID directly from WhatsApp > API Setup.'
  }
  if (code === 200 || code === 298) {
    return 'Permission Denied: Your System User or Token lacks the "whatsapp_business_messaging" permission.'
  }
  if (code === 131030) {
    return 'Sandbox Restriction (Error 131030): If using a Meta Test Phone Number, the recipient phone must be verified and added under "To Phone Numbers" in Meta Developer Portal > WhatsApp > API Setup.'
  }
  if (code === 131047) {
    return 'Re-engagement Window Closed (Error 131047): More than 24 hours have passed since the user sent a message. An approved template message is required to start a new conversation.'
  }
  return message || 'Meta Graph API call failed'
}

export async function POST(req: Request) {
  try {
    const auth = await requireSuperAdmin(req)
    if (auth.errorResponse) return auth.errorResponse

    const body = await req.json().catch(() => ({}))
    const store = loadStore()
    const supabase = getSupabaseAdminClient()
    let savedSettings: any = store.settings || {}

    if (!savedSettings.whatsappToken && supabase) {
      try {
        const { data: t } = await supabase.from('territories').select('branding').eq('id', FLAGSHIP_TERRITORY_ID).single()
        if (t?.branding?.whatsappSettings) {
          savedSettings = { ...savedSettings, ...t.branding.whatsappSettings }
        }
      } catch {}
    }

    // Resolve credentials (from body or saved store settings or process.env)
    const token = (
      body.whatsappToken && !body.whatsappToken.includes('...') && !body.whatsappToken.startsWith('****')
        ? body.whatsappToken
        : savedSettings.whatsappToken || process.env.WHATSAPP_TOKEN || ''
    ).trim()

    const phoneId = (body.whatsappPhoneNumberId || savedSettings.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
    const wabaId = (body.whatsappBusinessAccountId || savedSettings.whatsappBusinessAccountId || '').trim()
    const verifyToken = (body.whatsappVerifyToken || savedSettings.whatsappVerifyToken || 'choutuppal_verify_token').trim()
    const testPhone = (body.testPhone || '').replace(/\D/g, '')

    // Handle action: 'register_phone' (2-step verification PIN activation)
    if (body.action === 'register_phone') {
      if (!phoneId || !token) {
        return NextResponse.json({ success: false, error: 'Phone Number ID and Access Token are required' }, { status: 400 })
      }
      const pin = (body.pin || '123456').trim()
      const regUrl = `https://graph.facebook.com/v21.0/${phoneId}/register`
      const regRes = await fetch(regUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          pin,
        }),
      })
      const regData = await regRes.json().catch(() => ({}))
      if (regRes.ok && (regData.success || regData.id)) {
        return NextResponse.json({
          success: true,
          registered: true,
          message: 'ఫోన్ నంబర్ విజయవంతంగా రిజిస్టర్ చేయబడింది! 6-డిజిట్ పిన్ యాక్టివేట్ అయింది.',
        })
      } else {
        return NextResponse.json({
          success: false,
          error: regData?.error?.message || 'Meta Phone registration call failed',
        }, { status: 400 })
      }
    }

    const diagnostics: {
      webhook: { ok: boolean; status: string; url: string; details?: string }
      metaPhoneApi: { ok: boolean; status: string; details?: any; error?: string; hint?: string }
      metaWabaApi?: { ok: boolean; status: string; details?: any; error?: string }
      testMessage?: { ok: boolean; status: string; recipientPhone?: string; details?: string }
      overallStatus: 'PASS' | 'PARTIAL' | 'FAIL'
    } = {
      webhook: { ok: false, status: 'untested', url: `${getBaseUrl()}/api/whatsapp/webhook` },
      metaPhoneApi: { ok: false, status: 'untested' },
      overallStatus: 'FAIL',
    }

    // ------------------------------------------------------------------------
    // 1. TEST LOCAL / LIVE WEBHOOK ENDPOINT
    // ------------------------------------------------------------------------
    try {
      const webhookTestUrl = `${getBaseUrl()}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(verifyToken)}&hub.challenge=crm_diag_challenge_${Date.now()}`
      const webhookRes = await fetch(webhookTestUrl, { method: 'GET', cache: 'no-store' })
      const webhookBody = await webhookRes.text()

      if (webhookRes.ok && webhookBody.includes('crm_diag_challenge')) {
        diagnostics.webhook = {
          ok: true,
          status: 'VERIFIED',
          url: `${getBaseUrl()}/api/whatsapp/webhook`,
          details: 'Webhook GET verification responded with HTTP 200 and valid challenge echo.',
        }
      } else {
        diagnostics.webhook = {
          ok: false,
          status: 'FAILED',
          url: `${getBaseUrl()}/api/whatsapp/webhook`,
          details: `Webhook verification failed with status ${webhookRes.status}: ${webhookBody.slice(0, 100)}`,
        }
      }
    } catch (whErr: any) {
      diagnostics.webhook = {
        ok: false,
        status: 'NETWORK_ERROR',
        url: `${getBaseUrl()}/api/whatsapp/webhook`,
        details: whErr.message || 'Failed to ping webhook URL',
      }
    }

    // ------------------------------------------------------------------------
    // 2. TEST META GRAPH API (Token & Phone Number ID)
    // ------------------------------------------------------------------------
    if (!token) {
      diagnostics.metaPhoneApi = {
        ok: false,
        status: 'TOKEN_MISSING',
        error: 'No WhatsApp Access Token provided or configured.',
        hint: 'Please paste your Permanent System User Token from Meta Business Settings.',
      }
    } else if (!phoneId) {
      diagnostics.metaPhoneApi = {
        ok: false,
        status: 'PHONE_ID_MISSING',
        error: 'No Phone Number ID provided or configured.',
        hint: 'Please enter your Phone Number ID from Meta Developer Portal > WhatsApp > API Setup.',
      }
    } else {
      try {
        const metaUrl = `https://graph.facebook.com/v21.0/${phoneId}?fields=id,verified_name,display_phone_number,quality_rating,code_verification_status,status`
        const metaRes = await fetch(metaUrl, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        const metaData = await metaRes.json().catch(() => ({}))

        if (metaRes.ok && metaData.id) {
          diagnostics.metaPhoneApi = {
            ok: true,
            status: 'CONNECTED',
            details: {
              phoneId: metaData.id,
              displayPhoneNumber: metaData.display_phone_number || 'N/A',
              verifiedName: metaData.verified_name || 'N/A',
              qualityRating: metaData.quality_rating || 'UNKNOWN',
              verificationStatus: metaData.code_verification_status || metaData.status || 'ACTIVE',
            },
          }
        } else {
          const errCode = metaData?.error?.code
          const errMsg = metaData?.error?.message || `Meta Graph API responded with HTTP ${metaRes.status}`
          diagnostics.metaPhoneApi = {
            ok: false,
            status: 'AUTH_FAILED',
            error: errMsg,
            hint: mapMetaError(errCode, errMsg),
          }
        }
      } catch (metaErr: any) {
        diagnostics.metaPhoneApi = {
          ok: false,
          status: 'NETWORK_ERROR',
          error: metaErr.message || 'Failed to connect to Meta Graph API servers',
        }
      }
    }

    // ------------------------------------------------------------------------
    // 3. TEST WABA ID & AUTO-SUBSCRIBE WEBHOOKS
    // ------------------------------------------------------------------------
    if (wabaId && token) {
      try {
        const wabaUrl = `https://graph.facebook.com/v21.0/${wabaId}?fields=id,name,timezone_id,currency`
        const wabaRes = await fetch(wabaUrl, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        const wabaData = await wabaRes.json().catch(() => ({}))

        // Ensure Meta App is subscribed to receive incoming WABA webhook messages
        let wabaSubscribed = false
        try {
          const subRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          })
          const subData = await subRes.json().catch(() => ({}))
          wabaSubscribed = Boolean(subData.success)
        } catch (subErr) {
          console.warn('[Test Connection] WABA subscription call error:', subErr)
        }

        if (wabaRes.ok && wabaData.id) {
          diagnostics.metaWabaApi = {
            ok: true,
            status: 'CONNECTED',
            details: {
              wabaId: wabaData.id,
              name: wabaData.name || 'WABA Account',
              currency: wabaData.currency || 'INR',
              wabaSubscribed,
            },
          }
        } else {
          diagnostics.metaWabaApi = {
            ok: false,
            status: 'FAILED',
            error: wabaData?.error?.message || `WABA check returned ${wabaRes.status}`,
          }
        }
      } catch (wabaErr: any) {
        diagnostics.metaWabaApi = {
          ok: false,
          status: 'NETWORK_ERROR',
          error: wabaErr.message,
        }
      }
    }

    // ------------------------------------------------------------------------
    // AUTO-PERSIST TO SUPABASE (If credentials tested successfully)
    // ------------------------------------------------------------------------
    if (diagnostics.metaPhoneApi.ok && token && phoneId) {
      store.settings = {
        ...(store.settings || {}),
        whatsappToken: token,
        whatsappPhoneNumberId: phoneId,
        whatsappBusinessAccountId: wabaId,
        whatsappVerifyToken: verifyToken,
        syncListingsToCrmFlow: store.settings?.syncListingsToCrmFlow !== false,
        autoSendListingPhotoInChat: store.settings?.autoSendListingPhotoInChat !== false,
      }
      saveStore(store)

      if (supabase) {
        try {
          const { data: t } = await supabase.from('territories').select('branding').eq('id', FLAGSHIP_TERRITORY_ID).single()
          const updatedBranding = {
            ...(t?.branding || {}),
            whatsappSettings: { ...store.settings },
          }
          await supabase.from('territories').update({ branding: updatedBranding }).eq('id', FLAGSHIP_TERRITORY_ID)
        } catch (syncDbErr) {
          console.warn('[Test Connection] Supabase persist error:', syncDbErr)
        }
      }
    }

    // ------------------------------------------------------------------------
    // 4. TEST LIVE MESSAGE SEND (If test phone number provided)
    // ------------------------------------------------------------------------
    if (testPhone && testPhone.length >= 10 && diagnostics.metaPhoneApi.ok) {
      try {
        const pingMessage =
          `✅ *Choutuppal CRM — WhatsApp Cloud API Live Test Ping*\n\n` +
          `మీ WhatsApp Cloud API కనెక్షన్ విజయవంతంగా కనెక్ట్ అయింది! 🚀\n` +
          `• Phone Number ID: ${phoneId}\n` +
          `• Webhook: Verified (200 OK)\n` +
          `• సమయం: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
          `💡 మీరు ఈ నంబర్‌కు ఏదైనా సందేశం (ఉదా: 'Hi' లేదా 'Menu') పంపితే ఆటో-రిప్లై వెంటనే అందుతుంది.`

        const sendRes = await sendWhatsAppFlowMessage({
          toPhone: testPhone,
          messageText: pingMessage,
          contactName: 'Test Recipient',
        })

        if (sendRes.ok && sendRes.providerDelivered) {
          diagnostics.testMessage = {
            ok: true,
            status: 'DELIVERED',
            recipientPhone: testPhone,
            details: `Test message successfully dispatched via Meta Graph API (Message ID: ${sendRes.messageId})`,
          }
        } else {
          diagnostics.testMessage = {
            ok: false,
            status: 'FAILED',
            recipientPhone: testPhone,
            details: sendRes.error || 'Failed to dispatch test message',
          }
        }
      } catch (sendErr: any) {
        diagnostics.testMessage = {
          ok: false,
          status: 'FAILED',
          recipientPhone: testPhone,
          details: sendErr.message || 'Exception dispatching test message',
        }
      }
    }

    // Overall Status
    if (diagnostics.webhook.ok && diagnostics.metaPhoneApi.ok) {
      diagnostics.overallStatus = 'PASS'
    } else if (diagnostics.webhook.ok || diagnostics.metaPhoneApi.ok) {
      diagnostics.overallStatus = 'PARTIAL'
    } else {
      diagnostics.overallStatus = 'FAIL'
    }

    return NextResponse.json({
      success: true,
      diagnostics,
      recentMessagesCount: (store.messages || []).length,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
