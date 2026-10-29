import { loadStore, saveStore } from './store'
import type { Listing } from './types'

export interface WhatsAppSendOptions {
  toPhone: string
  messageText: string
  imageUrl?: string
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'document'
  buttons?: Array<{ id: string; title: string }>
  listSections?: Array<{
    title: string
    rows: Array<{ id: string; title: string; description?: string }>
  }>
  listButtonText?: string
  footerText?: string
  territoryId?: string
  contactName?: string
}

export interface WhatsAppDispatchResult {
  ok: boolean
  error?: string
  providerDelivered?: boolean
  notice?: string
  messageId?: string
}

/**
 * Format and dispatch listing as a Rich WhatsApp Media Card with Photo & Call Action
 */
export async function sendListingWhatsAppCard(
  toPhone: string,
  listing: Listing,
  existingStore?: any
): Promise<WhatsAppDispatchResult> {
  const caption =
    `📸 *${listing.title}*\n` +
    `📍 ${listing.address}\n\n` +
    `సేవలు (Services):\n` +
    `• ${listing.description.slice(0, 160)}\n` +
    (listing.price ? `• ధర / రేటు: ${listing.price}\n` : '') +
    `\n📞 ${listing.phone}\n` +
    `💬 వాట్సాప్ చాట్: https://wa.me/91${(listing.whatsapp || listing.phone).replace(/\D/g, '')}\n` +
    `(స్థితి: ✅ అందుబాటులో ఉంది)\n\n` +
    `💡 మీ షాప్ లేదా సర్వీస్ ప్రమోషన్ వీడియోల కోసం 9441348175 ను సంప్రదించండి.\n` +
    `🌐 https://choutuppal.in/business/${listing.slug}`

  return sendWhatsAppFlowMessage({
    toPhone,
    messageText: caption,
    imageUrl: listing.coverImage || listing.gallery?.[0] || undefined,
    contactName: listing.title,
    territoryId: listing.territoryId || 'territory_choutuppal',
  }, existingStore)
}

/**
 * Pure builder function for compliant Meta WhatsApp Cloud API JSON payloads.
 * Strictly enforces Meta length limits, button counts, and HTTPS media URL validation.
 */
export function buildWhatsAppPayload(options: WhatsAppSendOptions, cleanPhone: string): any {
  const payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
  }

  // 1. Interactive Buttons (up to 3 buttons)
  if (options.buttons && options.buttons.length > 0) {
    payload.type = 'interactive'
    payload.interactive = {
      type: 'button',
      body: { text: (options.messageText || '').slice(0, 1024) },
      action: {
        buttons: options.buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: {
            id: b.id,
            title: b.title.slice(0, 20),
          },
        })),
      },
    }

    if (options.imageUrl && /^https?:\/\//i.test(options.imageUrl)) {
      payload.interactive.header = {
        type: 'image',
        image: { url: options.imageUrl },
      }
    }
    if (options.footerText) {
      payload.interactive.footer = { text: options.footerText.slice(0, 60) }
    }
  }
  // 2. Interactive List (4 to 10 rows)
  else if (options.listSections && options.listSections.length > 0) {
    payload.type = 'interactive'
    payload.interactive = {
      type: 'list',
      body: { text: (options.messageText || '').slice(0, 1024) },
      action: {
        button: (options.listButtonText || 'Select Option').slice(0, 20),
        sections: options.listSections.map((s) => ({
          title: s.title.slice(0, 24),
          rows: s.rows.map((r) => ({
            id: r.id,
            title: r.title.slice(0, 24),
            description: r.description ? r.description.slice(0, 72) : undefined,
          })),
        })),
      },
    }
    if (options.footerText) {
      payload.interactive.footer = { text: options.footerText.slice(0, 60) }
    }
  }
  // 3. Media Message with Image, Video, or Document
  else if (options.mediaUrl || options.imageUrl) {
    const mediaUrl = options.mediaUrl || options.imageUrl || ''
    const hasValidUrl = /^https:\/\//i.test(mediaUrl)
    if (hasValidUrl) {
      if (options.mediaType === 'video' || /\.(mp4|mov|avi|webm)(\?.*)?$/i.test(mediaUrl)) {
        payload.type = 'video'
        payload.video = {
          url: mediaUrl,
          link: mediaUrl,
          caption: (options.messageText || '').slice(0, 1024),
        }
      } else if (options.mediaType === 'document' || /\.(pdf|doc|docx|csv|xlsx)(\?.*)?$/i.test(mediaUrl)) {
        payload.type = 'document'
        payload.document = {
          url: mediaUrl,
          link: mediaUrl,
          caption: (options.messageText || '').slice(0, 1024),
          filename: mediaUrl.split('/').pop()?.split('?')[0] || 'document.pdf',
        }
      } else {
        payload.type = 'image'
        payload.image = {
          url: mediaUrl,
          link: mediaUrl,
          caption: (options.messageText || '').slice(0, 1024),
        }
      }
    } else {
      payload.type = 'text'
      payload.text = { body: (options.messageText || '').slice(0, 4096) }
    }
  }
  // 4. Plain Text Message
  else {
    payload.type = 'text'
    payload.text = { body: (options.messageText || '').slice(0, 4096) }
  }

  return payload
}

export function buildWhatsAppCloudApiPayload(params: {
  to?: string
  toPhone?: string
  text?: string
  messageText?: string
  mediaUrl?: string
  imageUrl?: string
  mediaType?: 'image' | 'video' | 'document'
  buttons?: Array<{ id: string; title: string }>
  listSections?: any[]
  listButtonText?: string
  footerText?: string
}): any {
  const cleanPhone = (params.to || params.toPhone || '').replace(/\D/g, '')
  const opts: WhatsAppSendOptions = {
    toPhone: cleanPhone,
    messageText: params.text || params.messageText || '',
    mediaUrl: params.mediaUrl,
    imageUrl: params.imageUrl,
    mediaType: params.mediaType,
    buttons: params.buttons,
    listSections: params.listSections,
    listButtonText: params.listButtonText,
    footerText: params.footerText,
  }
  return buildWhatsAppPayload(opts, cleanPhone)
}

/**
 * Dispatches a flow message via WhatsApp Cloud API or logs to sandbox inbox.
 * Enforces honest delivery reporting: if Meta credentials are not configured,
 * stores the message locally in CRM inbox without falsely claiming external provider delivery.
 */
export async function sendWhatsAppFlowMessage(
  options: WhatsAppSendOptions,
  existingStore?: any
): Promise<WhatsAppDispatchResult> {
  const store = existingStore || loadStore()
  const cleanPhone = options.toPhone.replace(/\D/g, '')
  const territoryId = options.territoryId || 'territory_choutuppal'

  const token = store.settings?.whatsappToken || process.env.WHATSAPP_TOKEN
  const phoneId = store.settings?.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID

  let providerDelivered = false
  let msgStatus: 'sent' | 'delivered' | 'failed' = 'sent'
  let dispatchError: string | undefined

  if (token && phoneId) {
    try {
      const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`
      const payload = buildWhatsAppPayload(options, cleanPhone)

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        providerDelivered = true
        msgStatus = 'sent'
      } else {
        const errData = await res.json().catch(() => ({}))
        providerDelivered = false
        msgStatus = 'failed'
        dispatchError = errData?.error?.message || `WhatsApp Meta API error (${res.status})`
        console.warn('[WhatsApp Meta API] Dispatch failed:', errData)
      }
    } catch (apiErr: any) {
      providerDelivered = false
      msgStatus = 'failed'
      dispatchError = apiErr?.message || 'WhatsApp Meta API network call failed'
      console.warn('[WhatsApp Meta API] Network call failed:', apiErr)
    }
  } else {
    // Sandbox mode: credentials not configured. Save locally without falsely claiming external delivery.
    providerDelivered = false
    msgStatus = 'sent'
  }

  const generatedMsgId = `msg_out_${Date.now()}`

  // Log message to admin store with honest delivery status
  store.messages.unshift({
    id: generatedMsgId,
    phone: cleanPhone,
    contactName: options.contactName,
    direction: 'outbound',
    messageText: options.messageText,
    imageUrl: options.imageUrl,
    territoryId,
    status: msgStatus,
    createdAt: new Date().toISOString(),
  })

  if (!existingStore) {
    saveStore(store)
  }

  if (dispatchError) {
    return { ok: false, error: dispatchError, providerDelivered: false, messageId: generatedMsgId }
  }

  return {
    ok: true,
    providerDelivered,
    messageId: generatedMsgId,
    notice: providerDelivered
      ? 'Delivered via Meta WhatsApp Cloud API'
      : 'Saved locally in CRM inbox (WhatsApp provider credentials not configured)',
  }
}
