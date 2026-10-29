import { NextResponse } from 'next/server'
import { loadStore, saveStore, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import type { WhatsAppMessage, ConversationSummary, CRMContact } from '@/lib/types'
import { requireAuth, requireTerritoryAccess } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const { searchParams } = new URL(req.url)
    const phoneParam = searchParams.get('phone')
    const searchQuery = searchParams.get('search')?.trim().toLowerCase()
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const store = loadStore()
    const allMessages = store.messages || []
    const allContacts = store.contacts || []

    // ------------------------------------------------------------------------
    // CASE A: SPECIFIC CONVERSATION THREAD
    // ------------------------------------------------------------------------
    if (phoneParam) {
      const cleanPhone = phoneParam.replace(/\D/g, '')
      if (cleanPhone.length < 10) {
        return NextResponse.json({ success: false, error: 'Invalid phone number format' }, { status: 400 })
      }

      // Find all messages for this phone
      const phoneMessages = allMessages.filter(
        (m) => (m.phone || '').replace(/\D/g, '') === cleanPhone
      )

      // Determine conversation territory
      const matchedContact = allContacts.find(
        (c) => (c.phone || '').replace(/\D/g, '') === cleanPhone
      )
      const convTerritoryId =
        phoneMessages[0]?.territoryId ||
        matchedContact?.territoryId ||
        FLAGSHIP_TERRITORY_ID

      // Enforce cross-tenant isolation
      const access = await requireTerritoryAccess(req, convTerritoryId)
      if (access.errorResponse) return access.errorResponse

      // Filter messages strictly to this territory (or all if super admin)
      let authorizedMessages = phoneMessages
      if (auth.user.role !== 'SUPER_ADMIN') {
        authorizedMessages = phoneMessages.filter(
          (m) => (m.territoryId || FLAGSHIP_TERRITORY_ID) === auth.user.territoryId
        )
      }

      // Sort chronologically (oldest to newest for chat view)
      authorizedMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

      const contactName =
        matchedContact?.name ||
        authorizedMessages[authorizedMessages.length - 1]?.contactName ||
        `Customer (${cleanPhone})`

      return NextResponse.json({
        success: true,
        phone: cleanPhone,
        contactName,
        territoryId: convTerritoryId,
        messages: authorizedMessages,
        total: authorizedMessages.length,
      })
    }

    // ------------------------------------------------------------------------
    // CASE B: LIST ALL CONVERSATIONS (GROUPED BY PHONE)
    // ------------------------------------------------------------------------
    // Filter messages by caller's territory
    let scopedMessages = allMessages
    if (auth.user.role !== 'SUPER_ADMIN') {
      scopedMessages = allMessages.filter(
        (m) => (m.territoryId || FLAGSHIP_TERRITORY_ID) === auth.user.territoryId
      )
    }

    // Group messages by phone
    const conversationsMap = new Map<string, WhatsAppMessage[]>()
    for (const msg of scopedMessages) {
      const phone = (msg.phone || '').replace(/\D/g, '')
      if (!phone) continue
      if (!conversationsMap.has(phone)) {
        conversationsMap.set(phone, [])
      }
      conversationsMap.get(phone)!.push(msg)
    }

    // Also include contacts that have no messages yet in this territory
    let scopedContacts = allContacts
    if (auth.user.role !== 'SUPER_ADMIN') {
      scopedContacts = allContacts.filter(
        (c) => (c.territoryId || FLAGSHIP_TERRITORY_ID) === auth.user.territoryId
      )
    }
    for (const contact of scopedContacts) {
      const phone = (contact.phone || '').replace(/\D/g, '')
      if (phone && !conversationsMap.has(phone)) {
        conversationsMap.set(phone, [])
      }
    }

    const conversations: ConversationSummary[] = []

    for (const [phone, msgs] of conversationsMap.entries()) {
      // Sort messages descending to get latest
      msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const latestMsg = msgs[0]

      const matchedContact = scopedContacts.find(
        (c) => (c.phone || '').replace(/\D/g, '') === phone
      )

      const contactName =
        matchedContact?.name ||
        latestMsg?.contactName ||
        `Customer (${phone})`

      const territoryId =
        latestMsg?.territoryId ||
        matchedContact?.territoryId ||
        auth.user.territoryId ||
        FLAGSHIP_TERRITORY_ID

      const unreadCount = msgs.filter(
        (m) => m.direction === 'inbound' && m.status !== 'read'
      ).length

      const summary: ConversationSummary = {
        phone,
        contactName,
        territoryId,
        lastMessage: latestMsg?.messageText || matchedContact?.lastMessage || 'New Lead Contact',
        lastMessageAt: latestMsg?.createdAt || matchedContact?.lastContactAt || matchedContact?.createdAt || new Date().toISOString(),
        lastDirection: latestMsg?.direction || 'inbound',
        unreadCount,
        totalMessages: msgs.length,
        assignedStaffId: latestMsg?.assignedStaffId,
        assignedStaffName: latestMsg?.assignedStaffName,
      }

      // Filter by search query if provided
      if (searchQuery) {
        const matchesName = summary.contactName.toLowerCase().includes(searchQuery)
        const matchesPhone = summary.phone.includes(searchQuery)
        const matchesMessage = summary.lastMessage.toLowerCase().includes(searchQuery)
        if (!matchesName && !matchesPhone && !matchesMessage) {
          continue
        }
      }

      // Filter unreadOnly
      if (unreadOnly && summary.unreadCount === 0) {
        continue
      }

      conversations.push(summary)
    }

    // Sort conversations descending by lastMessageAt
    conversations.sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    )

    return NextResponse.json({
      success: true,
      conversations,
      total: conversations.length,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON request payload' }, { status: 400 })
    }

    const { action = 'send', phone } = body || {}

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      return NextResponse.json({ success: false, error: 'Phone number must contain at least 10 digits' }, { status: 400 })
    }

    const store = loadStore()
    if (!store.messages) store.messages = []
    if (!store.contacts) store.contacts = []

    // Check existing conversation territory
    const last10 = cleanPhone.slice(-10)
    const existingMsg = store.messages.find(
      (m) => (m.phone || '').replace(/\D/g, '').slice(-10) === last10
    )
    const existingContact = store.contacts.find(
      (c) => (c.phone || '').replace(/\D/g, '').slice(-10) === last10
    )

    let targetTerritoryId =
      existingMsg?.territoryId ||
      existingContact?.territoryId ||
      auth.user.territoryId ||
      FLAGSHIP_TERRITORY_ID

    // Franchise Admin is locked to own territory
    if (auth.user.role !== 'SUPER_ADMIN') {
      const resolvedTerritoryId =
        existingMsg?.territoryId || existingContact?.territoryId || FLAGSHIP_TERRITORY_ID
      if ((existingMsg || existingContact) && resolvedTerritoryId !== auth.user.territoryId) {
        return NextResponse.json(
          {
            success: false,
            error: `Access forbidden: Conversation belongs to another territory "${resolvedTerritoryId}".`,
          },
          { status: 403 }
        )
      }
      targetTerritoryId = auth.user.territoryId
    }

    // ------------------------------------------------------------------------
    // ACTION: MARK CONVERSATION AS READ
    // ------------------------------------------------------------------------
    if (action === 'mark_read') {
      const access = await requireTerritoryAccess(req, targetTerritoryId)
      if (access.errorResponse) return access.errorResponse

      let updatedCount = 0
      for (const m of store.messages) {
        if (
          (m.phone || '').replace(/\D/g, '') === cleanPhone &&
          m.direction === 'inbound' &&
          m.status !== 'read'
        ) {
          m.status = 'read'
          updatedCount++
        }
      }

      if (updatedCount > 0) {
        saveStore(store)
      }

      return NextResponse.json({
        success: true,
        message: 'Conversation marked as read',
        updatedCount,
      })
    }

    // ------------------------------------------------------------------------
    // ACTION: ASSIGN CONVERSATION TO STAFF
    // ------------------------------------------------------------------------
    if (action === 'assign') {
      const access = await requireTerritoryAccess(req, targetTerritoryId)
      if (access.errorResponse) return access.errorResponse

      const staffName = body.staffName || body.assignedTo || 'Staff Member'
      const staffId = body.staffId || `staff_${String(staffName).toLowerCase().replace(/\s+/g, '_')}`

      // Update recent messages for this contact
      for (const m of store.messages) {
        if ((m.phone || '').replace(/\D/g, '') === cleanPhone) {
          m.assignedStaffId = staffId
          m.assignedStaffName = staffName
        }
      }

      // Update contact notes if exists
      if (existingContact) {
        existingContact.notes = `Assigned to ${staffName} (${staffId}). ${existingContact.notes || ''}`.trim()
      }

      saveStore(store)

      return NextResponse.json({
        success: true,
        message: `Conversation assigned to ${staffName}`,
        assignedTo: staffName,
        assignedStaff: { staffId, staffName },
        conversation: {
          phone: cleanPhone,
          assignedTo: staffName,
          assignedStaffId: staffId,
          assignedStaffName: staffName,
        },
      })
    }

    // ------------------------------------------------------------------------
    // ACTION: SEND REPLY
    // ------------------------------------------------------------------------
    const { messageText, imageUrl } = body

    if (!messageText || typeof messageText !== 'string' || !messageText.trim()) {
      return NextResponse.json({ success: false, error: 'Message text cannot be empty' }, { status: 400 })
    }

    const trimmedText = messageText.trim()
    if (trimmedText.length > 4096) {
      return NextResponse.json({ success: false, error: 'Message exceeds maximum length of 4096 characters' }, { status: 400 })
    }

    // Check WhatsApp Provider Credentials
    const token = store.settings?.whatsappToken || process.env.WHATSAPP_TOKEN
    const phoneId = store.settings?.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID

    let providerDelivered = false
    let providerStatus: 'sent' | 'delivered' | 'failed' = 'sent'

    if (token && phoneId) {
      try {
        const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`
        const payload: any = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
        }

        if (imageUrl) {
          payload.type = 'image'
          payload.image = { url: imageUrl, caption: trimmedText }
        } else {
          payload.type = 'text'
          payload.text = { body: trimmedText }
        }

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
          providerStatus = 'sent'
        } else {
          providerStatus = 'failed'
        }
      } catch {
        providerStatus = 'failed'
      }
    } else {
      // Local development/sandbox mode:
      // Credentials not configured; store locally without falsely claiming external provider delivery.
      providerDelivered = false
      providerStatus = 'sent'
    }

    const contactName = existingContact?.name || existingMsg?.contactName || 'Customer'

    const newMsg: WhatsAppMessage = {
      id: `msg_out_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      phone: cleanPhone,
      contactName,
      direction: 'outbound',
      messageText: trimmedText,
      imageUrl: imageUrl && typeof imageUrl === 'string' ? imageUrl.trim() : undefined,
      territoryId: targetTerritoryId,
      status: providerStatus,
      createdAt: new Date().toISOString(),
    }

    store.messages.unshift(newMsg)

    // Update or create CRM contact
    if (existingContact) {
      existingContact.lastMessage = trimmedText
      existingContact.lastContactAt = new Date().toISOString()
      existingContact.messageCount = (existingContact.messageCount || 0) + 1
    } else {
      const newContact: CRMContact = {
        id: `cnt_${Date.now()}`,
        name: contactName,
        phone: cleanPhone,
        tags: ['WhatsApp Lead'],
        stage: 'CONTACTED',
        territoryId: targetTerritoryId,
        lastMessage: trimmedText,
        lastContactAt: new Date().toISOString(),
        messageCount: 1,
        createdAt: new Date().toISOString(),
      }
      store.contacts.unshift(newContact)
    }

    saveStore(store)

    return NextResponse.json(
      {
        success: true,
        message: newMsg,
        providerDelivered,
        notice: providerDelivered
          ? 'Message sent via Meta WhatsApp Cloud API'
          : 'Message saved locally in CRM inbox (WhatsApp provider credentials not configured)',
      },
      { status: 201 }
    )
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
