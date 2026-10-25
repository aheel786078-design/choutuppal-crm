import { loadStore, saveStore } from './store'
import { Listing } from './types'

export interface WhatsAppSendOptions {
  toPhone: string
  messageText: string
  imageUrl?: string
  buttons?: Array<{ id: string; title: string }>
  listSections?: Array<{
    title: string
    rows: Array<{ id: string; title: string; description?: string }>
  }>
  listButtonText?: string
}

/**
 * Format and dispatch listing as a Rich WhatsApp Media Card with Photo & Call Action
 * Following the exact Master Specification:
 * 📸 [Shop / Service Name]
 * 📍 Location / Landmark
 * సేవలు (Services):
 * • Service Details
 * (స్థితి: ✅ అందుబాటులో ఉంది)
 * 📞 Phone
 * 💬 WhatsApp Link
 * 🌐 Website: https://choutuppal.in
 */
export async function sendListingWhatsAppCard(
  toPhone: string,
  listing: Listing,
): Promise<{ ok: boolean; error?: string }> {
  const store = loadStore()
  const cleanPhone = toPhone.replace(/\D/g, '')

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

  // Log message to admin store
  store.messages.unshift({
    id: `msg_${Date.now()}`,
    phone: cleanPhone,
    contactName: listing.title,
    direction: 'outbound',
    messageText: caption,
    imageUrl: listing.coverImage || listing.gallery[0] || undefined,
    status: 'sent',
    createdAt: new Date().toISOString(),
  })

  saveStore(store)

  // If actual Meta credentials are configured, send to Meta Cloud API
  const token = store.settings.whatsappToken || process.env.WHATSAPP_TOKEN
  const phoneId = store.settings.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID

  if (token && phoneId) {
    try {
      const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
      }

      if (listing.coverImage) {
        payload.type = 'image'
        payload.image = {
          url: listing.coverImage,
          caption: caption,
        }
      } else {
        payload.type = 'text'
        payload.text = { body: caption }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json()
        console.warn('[WhatsApp Meta API] Dispatch failed:', errData)
      }
    } catch (apiErr) {
      console.warn('[WhatsApp Meta API] Network call failed:', apiErr)
    }
  }

  return { ok: true }
}
