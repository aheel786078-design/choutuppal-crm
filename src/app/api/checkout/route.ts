import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getStore, saveStore } from '@/lib/store'
import { getPaymentGatewayAdapter, getAuthoritativePlan } from '@/lib/payment-gateway'
import type { PaymentOrder } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { listingId, planId, ownerPhone } = body
    const idempotencyKey = body.idempotencyKey || `idem_${crypto.randomBytes(8).toString('hex')}`

    if (!listingId || typeof listingId !== 'string') {
      return NextResponse.json({ error: 'listingId is required' }, { status: 400 })
    }
    if (!planId || typeof planId !== 'string') {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    const store = getStore()
    const listing = (store.listings || []).find((l) => l.id === listingId || l.slug === listingId)
    if (!listing) {
      return NextResponse.json({ error: `Listing not found: ${listingId}` }, { status: 404 })
    }

    // Load authoritative plan from server store
    const plan = getAuthoritativePlan(planId, store)
    if (!plan) {
      return NextResponse.json({ error: `Active plan not found: ${planId}` }, { status: 404 })
    }

    if (!store.orders) store.orders = []

    // Idempotency check: if an order with this key already exists
    const existingOrder = store.orders.find(
      (o) => o.idempotencyKey === idempotencyKey && o.listingId === listing.id && o.planId === plan.id
    )
    if (existingOrder) {
      return NextResponse.json({
        success: true,
        orderId: existingOrder.id,
        amount: existingOrder.amount,
        currency: existingOrder.currency,
        planName: plan.name,
        planType: plan.type,
        gatewayOrderId: existingOrder.gatewayOrderId,
        status: existingOrder.status,
        idempotent: true,
      })
    }

    const orderId = `ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    const adapter = getPaymentGatewayAdapter()

    // Create gateway order
    const gatewayResult = await adapter.createOrder({
      orderId,
      amount: plan.price,
      currency: plan.currency || 'INR',
      receipt: `rcpt_${orderId}`,
      notes: {
        listingId: listing.id,
        listingTitle: listing.title,
        planId: plan.id,
        planName: plan.name,
      },
    })

    const newOrder: PaymentOrder = {
      id: orderId,
      listingId: listing.id,
      planId: plan.id,
      amount: plan.price,
      currency: plan.currency || 'INR',
      status: 'pending',
      gateway: adapter.name,
      gatewayOrderId: gatewayResult.gatewayOrderId,
      idempotencyKey,
      territoryId: listing.territoryId,
      ownerPhone: ownerPhone || listing.phone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    store.orders.push(newOrder)
    saveStore(store)

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      amount: newOrder.amount,
      currency: newOrder.currency,
      planName: plan.name,
      planType: plan.type,
      durationDays: plan.durationDays,
      gatewayOrderId: gatewayResult.gatewayOrderId,
      keyId: gatewayResult.keyId,
      mock: gatewayResult.mock,
      idempotencyKey,
    })
  } catch (err: any) {
    console.error('[Checkout API] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
