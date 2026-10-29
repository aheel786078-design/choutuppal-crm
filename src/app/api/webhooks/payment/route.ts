import { NextRequest, NextResponse } from 'next/server'
import { getStore, saveStore } from '@/lib/store'
import {
  getPaymentGatewayAdapter,
  activateEntitlementsFromOrder,
  DEFAULT_MOCK_SECRET,
} from '@/lib/payment-gateway'
import type { WebhookEvent, PaymentTransaction } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature =
      req.headers.get('x-razorpay-signature') ||
      req.headers.get('x-payment-signature') ||
      ''

    const webhookSecret =
      process.env.PAYMENT_WEBHOOK_SECRET ||
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      DEFAULT_MOCK_SECRET

    const adapter = getPaymentGatewayAdapter()
    const isSignatureValid = adapter.verifyWebhookSignature({
      rawBody,
      signature,
      secret: webhookSecret,
    })

    if (!isSignatureValid) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
    }

    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 })
    }

    const eventId =
      payload.id ||
      payload.event_id ||
      payload.eventId ||
      `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const eventType = payload.event || payload.eventType || payload.type || 'payment.captured'

    const store = getStore()
    if (!store.webhookEvents) store.webhookEvents = []

    // Replay & Duplicate Webhook Protection
    const isDuplicate = store.webhookEvents.some(
      (e) => e.eventId === eventId && e.status === 'processed'
    )
    if (isDuplicate) {
      return NextResponse.json(
        { success: true, message: 'Event already processed (duplicate ignored)', eventId },
        { status: 200 }
      )
    }

    // Extract Order & Payment attributes
    const rawOrderId =
      payload.payload?.payment?.entity?.order_id ||
      payload.payload?.order?.entity?.id ||
      payload.orderId ||
      payload.order_id

    const rawPaymentId =
      payload.payload?.payment?.entity?.id ||
      payload.paymentId ||
      payload.payment_id ||
      `pay_${Date.now()}`

    let rawAmount = payload.amount
    if (payload.payload?.payment?.entity?.amount !== undefined) {
      rawAmount = payload.payload.payment.entity.amount / 100 // Convert from paise
    }

    const rawCurrency =
      payload.payload?.payment?.entity?.currency ||
      payload.currency ||
      'INR'

    const paymentMethod =
      payload.payload?.payment?.entity?.method ||
      payload.method ||
      'online'

    if (!rawOrderId) {
      const ignoredEvent: WebhookEvent = {
        id: `wevt_${Date.now()}`,
        eventId,
        gateway: adapter.name,
        eventType,
        status: 'ignored',
        receivedAt: new Date().toISOString(),
        payloadSummary: { reason: 'No orderId in payload' },
      }
      store.webhookEvents.push(ignoredEvent)
      saveStore(store)
      return NextResponse.json({ success: true, message: 'Ignored: No orderId' }, { status: 200 })
    }

    // Match order by internal id or gatewayOrderId
    const order = (store.orders || []).find(
      (o) => o.id === rawOrderId || o.gatewayOrderId === rawOrderId
    )

    if (!order) {
      const failedEvent: WebhookEvent = {
        id: `wevt_${Date.now()}`,
        eventId,
        gateway: adapter.name,
        eventType,
        status: 'failed',
        receivedAt: new Date().toISOString(),
        payloadSummary: { rawOrderId, error: 'Order not found in store' },
      }
      store.webhookEvents.push(failedEvent)
      saveStore(store)
      return NextResponse.json({ error: `Order not found for ${rawOrderId}` }, { status: 404 })
    }

    // Handle Payment Failure Event
    if (eventType === 'payment.failed') {
      order.status = 'failed'
      order.updatedAt = new Date().toISOString()
      const failureTx: PaymentTransaction = {
        id: `pay_${Date.now()}`,
        orderId: order.id,
        gatewayPaymentId: rawPaymentId,
        amount: Number(rawAmount) || order.amount,
        currency: rawCurrency,
        status: 'failed',
        failureReasonCode: payload.payload?.payment?.entity?.error_code || 'GATEWAY_FAILURE',
        notes: payload.payload?.payment?.entity?.error_description || 'Payment failed at gateway',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      if (!store.payments) store.payments = []
      store.payments.push(failureTx)

      store.webhookEvents.push({
        id: `wevt_${Date.now()}`,
        eventId,
        gateway: adapter.name,
        eventType,
        status: 'processed',
        receivedAt: new Date().toISOString(),
        payloadSummary: { orderId: order.id, status: 'failed' },
      })
      saveStore(store)

      return NextResponse.json({ success: true, orderId: order.id, status: 'failed' })
    }

    // Handle Successful Payment Event: payment.captured, order.paid, payment.authorized
    const numAmount = Number(rawAmount) || order.amount
    const activation = activateEntitlementsFromOrder(
      order.id,
      {
        paymentId: rawPaymentId,
        amount: numAmount,
        currency: rawCurrency,
        method: paymentMethod,
        rawSignature: signature,
        status: 'verified',
        notes: `Webhook verified via ${eventType}`,
        actorId: 'WEBHOOK',
        actorName: `Gateway Webhook (${adapter.name})`,
      },
      store
    )

    // Record processed webhook event
    const processedEvent: WebhookEvent = {
      id: `wevt_${Date.now()}`,
      eventId,
      gateway: adapter.name,
      eventType,
      status: 'processed',
      receivedAt: new Date().toISOString(),
      payloadSummary: {
        orderId: order.id,
        listingId: order.listingId,
        planId: order.planId,
        amount: numAmount,
        currency: rawCurrency,
      },
    }
    store.webhookEvents.push(processedEvent)
    saveStore(store)

    return NextResponse.json({
      success: true,
      eventId,
      orderId: order.id,
      status: 'paid',
      planActivated: activation.subscription?.planId || activation.promotion?.id,
    })
  } catch (err: any) {
    console.error('[Payment Webhook API] Error:', err)
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 500 })
  }
}
