import crypto from 'crypto'
import type {
  AdminDataStore,
  ListingPlan,
  PaymentOrder,
  PaymentTransaction,
  ListingSubscription,
  FeaturedPromotion,
  PaymentTransactionStatus,
  AuditLog,
} from './types'
import { saveStore } from './store'

export interface CreateGatewayOrderParams {
  orderId: string
  amount: number
  currency: string
  receipt: string
  notes?: Record<string, string>
}

export interface GatewayOrderResult {
  gatewayOrderId: string
  amount: number
  currency: string
  keyId: string
  mock: boolean
}

export interface PaymentGatewayAdapter {
  name: string
  createOrder(params: CreateGatewayOrderParams): Promise<GatewayOrderResult>
  verifyWebhookSignature(params: { rawBody: string; signature: string; secret: string }): boolean
  verifyPaymentSignature(params: { orderId: string; paymentId: string; signature: string; secret: string }): boolean
}

export const DEFAULT_MOCK_SECRET = 'sandbox_mock_secret_key_choutuppal_2026'
export const DEFAULT_MOCK_KEY_ID = 'rzp_test_mock_choutuppal_key'

/**
 * Mock & Sandbox Payment Gateway Adapter
 * Implements standard provider HMAC-SHA256 signature validation and order generation.
 */
export class MockPaymentGatewayAdapter implements PaymentGatewayAdapter {
  name = 'mock_gateway'

  async createOrder(params: CreateGatewayOrderParams): Promise<GatewayOrderResult> {
    const randomSuffix = crypto.randomBytes(6).toString('hex')
    const gatewayOrderId = `order_mock_${Date.now()}_${randomSuffix}`
    const keyId = process.env.RAZORPAY_KEY_ID || DEFAULT_MOCK_KEY_ID

    return {
      gatewayOrderId,
      amount: params.amount,
      currency: params.currency,
      keyId,
      mock: true,
    }
  }

  verifyWebhookSignature(params: { rawBody: string; signature: string; secret: string }): boolean {
    if (!params.rawBody || !params.signature || !params.secret) {
      return false
    }
    try {
      const expectedSignature = crypto
        .createHmac('sha256', params.secret)
        .update(params.rawBody)
        .digest('hex')

      const sigBuf = Buffer.from(params.signature, 'utf8')
      const expBuf = Buffer.from(expectedSignature, 'utf8')

      if (sigBuf.length !== expBuf.length) {
        return false
      }
      return crypto.timingSafeEqual(sigBuf, expBuf)
    } catch {
      return false
    }
  }

  verifyPaymentSignature(params: { orderId: string; paymentId: string; signature: string; secret: string }): boolean {
    if (!params.orderId || !params.paymentId || !params.signature || !params.secret) {
      return false
    }
    try {
      const payload = `${params.orderId}|${params.paymentId}`
      const expectedSignature = crypto
        .createHmac('sha256', params.secret)
        .update(payload)
        .digest('hex')

      const sigBuf = Buffer.from(params.signature, 'utf8')
      const expBuf = Buffer.from(expectedSignature, 'utf8')

      if (sigBuf.length !== expBuf.length) {
        return false
      }
      return crypto.timingSafeEqual(sigBuf, expBuf)
    } catch {
      return false
    }
  }
}

/**
 * Razorpay Gateway Adapter (Live or Sandbox via credentials)
 */
export class RazorpayGatewayAdapter implements PaymentGatewayAdapter {
  name = 'razorpay'

  private keyId: string
  private keySecret: string

  constructor(keyId?: string, keySecret?: string) {
    this.keyId = keyId || process.env.RAZORPAY_KEY_ID || ''
    this.keySecret = keySecret || process.env.RAZORPAY_KEY_SECRET || ''
  }

  async createOrder(params: CreateGatewayOrderParams): Promise<GatewayOrderResult> {
    if (!this.keyId || !this.keySecret) {
      // Graceful fallback to mock if live keys are not set
      const mockAdapter = new MockPaymentGatewayAdapter()
      return mockAdapter.createOrder(params)
    }

    // In a live integration, calls Razorpay Orders API via fetch:
    // https://api.razorpay.com/v1/orders
    const authHeader = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')
    try {
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${authHeader}`,
        },
        body: JSON.stringify({
          amount: Math.round(params.amount * 100), // Razorpay requires paise
          currency: params.currency,
          receipt: params.receipt,
          notes: params.notes,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Razorpay API error (${res.status}): ${errText}`)
      }

      const data = await res.json()
      return {
        gatewayOrderId: data.id,
        amount: params.amount,
        currency: params.currency,
        keyId: this.keyId,
        mock: false,
      }
    } catch (err: any) {
      console.warn('[Razorpay Adapter] Gateway order creation failed, falling back to mock adapter:', err?.message)
      const mockAdapter = new MockPaymentGatewayAdapter()
      return mockAdapter.createOrder(params)
    }
  }

  verifyWebhookSignature(params: { rawBody: string; signature: string; secret: string }): boolean {
    const mock = new MockPaymentGatewayAdapter()
    return mock.verifyWebhookSignature(params)
  }

  verifyPaymentSignature(params: { orderId: string; paymentId: string; signature: string; secret: string }): boolean {
    const mock = new MockPaymentGatewayAdapter()
    return mock.verifyPaymentSignature(params)
  }
}

/**
 * Returns the active payment gateway adapter based on environment configuration.
 */
export function getPaymentGatewayAdapter(): PaymentGatewayAdapter {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    return new RazorpayGatewayAdapter(process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET)
  }
  return new MockPaymentGatewayAdapter()
}

/**
 * Generates an HMAC-SHA256 test signature for mock/sandbox webhook testing.
 */
export function generateTestWebhookSignature(rawBody: string, secret = DEFAULT_MOCK_SECRET): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
}

/**
 * Generates an HMAC-SHA256 test payment signature for mock/sandbox checkout verification.
 */
export function generateTestPaymentSignature(orderId: string, paymentId: string, secret = DEFAULT_MOCK_SECRET): string {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
}

/**
 * Finds authoritative plan from store.plans by planId.
 */
export function getAuthoritativePlan(planId: string, store: AdminDataStore): ListingPlan | null {
  return (store.plans || []).find((p) => p.id === planId && p.isActive) || null
}

export interface ActivateOrderOptions {
  paymentId: string
  amount: number
  currency: string
  method?: string
  status?: PaymentTransactionStatus
  notes?: string
  rawSignature?: string
  actorId?: string
  actorName?: string
  persist?: boolean
}

export interface ActivationResult {
  success: boolean
  message: string
  order: PaymentOrder
  payment: PaymentTransaction
  subscription?: ListingSubscription
  promotion?: FeaturedPromotion
}

/**
 * Authoritatively activates listing entitlements upon verified payment.
 * Strict idempotency: if order is already marked 'paid', returns existing records
 * without creating duplicate subscriptions or promotions.
 */
export function activateEntitlementsFromOrder(
  orderId: string,
  options: ActivateOrderOptions,
  store: AdminDataStore
): ActivationResult {
  if (!store.orders) store.orders = []
  if (!store.payments) store.payments = []
  if (!store.subscriptions) store.subscriptions = []
  if (!store.featuredPromotions) store.featuredPromotions = []
  if (!store.auditLogs) store.auditLogs = []

  const orderIndex = store.orders.findIndex((o) => o.id === orderId)
  if (orderIndex === -1) {
    throw new Error(`Order not found (${orderId})`)
  }

  const order = store.orders[orderIndex]

  // Replay & Idempotency check: Order is already paid
  if (order.status === 'paid') {
    const existingPayment = store.payments.find((p) => p.orderId === orderId) || {
      id: `pay_existing_${orderId}`,
      orderId,
      gatewayPaymentId: options.paymentId,
      amount: order.amount,
      currency: order.currency,
      status: 'verified' as PaymentTransactionStatus,
      createdAt: order.updatedAt,
      updatedAt: order.updatedAt,
    }

    const existingSub = store.subscriptions.find((s) => s.orderId === orderId)
    const existingPromo = store.featuredPromotions.find((p) => p.orderId === orderId)

    return {
      success: true,
      message: 'Order already paid and activated (idempotent result)',
      order,
      payment: existingPayment,
      subscription: existingSub,
      promotion: existingPromo,
    }
  }

  // Validate amount and currency match order
  if (options.amount !== order.amount) {
    throw new Error(`Amount mismatch: expected ${order.amount}, received ${options.amount}`)
  }
  if (options.currency.toUpperCase() !== order.currency.toUpperCase()) {
    throw new Error(`Currency mismatch: expected ${order.currency}, received ${options.currency}`)
  }

  // Load authoritative plan
  const plan = (store.plans || []).find((p) => p.id === order.planId)
  if (!plan) {
    throw new Error(`Plan configuration not found (${order.planId})`)
  }

  const now = new Date()
  const durationDays = plan.durationDays || 30
  const durationMs = durationDays * 24 * 60 * 60 * 1000
  const expiresAt = new Date(now.getTime() + durationMs).toISOString()

  // 1. Update order status
  order.status = 'paid'
  order.updatedAt = now.toISOString()
  store.orders[orderIndex] = order

  // 2. Create PaymentTransaction
  const payment: PaymentTransaction = {
    id: `pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    orderId: order.id,
    gatewayPaymentId: options.paymentId,
    amount: options.amount,
    currency: options.currency,
    status: options.status || 'verified',
    verifiedAt: now.toISOString(),
    paymentMethod: options.method || 'online',
    rawSignature: options.rawSignature,
    notes: options.notes,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
  store.payments.push(payment)

  let subscription: ListingSubscription | undefined
  let promotion: FeaturedPromotion | undefined

  // 3. Activate Premium Subscription (if plan is premium or bundle)
  if (plan.type === 'premium' || plan.type === 'bundle') {
    subscription = {
      id: `sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      listingId: order.listingId,
      territoryId: order.territoryId,
      planId: plan.id,
      status: 'active',
      startsAt: now.toISOString(),
      expiresAt,
      autoRenew: false,
      orderId: order.id,
      notes: `Activated via order ${order.id} (${options.status || 'verified'})`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
    store.subscriptions.push(subscription)
  }

  // 4. Activate Featured Promotion (if plan is featured or bundle)
  if (plan.type === 'featured' || plan.type === 'bundle') {
    promotion = {
      id: `promo_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      listingId: order.listingId,
      territoryId: order.territoryId,
      status: 'active',
      startsAt: now.toISOString(),
      expiresAt,
      placement: 'all',
      priority: 100,
      orderId: order.id,
      notes: `Activated via order ${order.id} (${options.status || 'verified'})`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
    store.featuredPromotions.push(promotion)
  }

  // 5. Append audit log
  const audit: AuditLog = {
    id: `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    actorId: options.actorId || 'SYSTEM',
    actorName: options.actorName || 'Payment Gateway Handler',
    actorRole: 'SYSTEM',
    territoryId: order.territoryId,
    action: options.status === 'manually_verified' ? 'PAYMENT_MANUALLY_VERIFIED' : 'PAYMENT_VERIFIED',
    details: `Order ${order.id} verified for listing ${order.listingId}. Plan ${plan.name} (${plan.type}) activated until ${expiresAt}.`,
    metadata: {
      orderId: order.id,
      paymentId: payment.id,
      listingId: order.listingId,
      planId: plan.id,
      amount: options.amount,
      method: options.method,
      status: options.status || 'verified',
    },
    createdAt: now.toISOString(),
  }
  store.auditLogs.push(audit)

  // Atomic persist to disk (can be bypassed for isolated in-memory test fixtures)
  if (options.persist !== false) {
    saveStore(store)
  }

  return {
    success: true,
    message: `Plan ${plan.name} successfully activated`,
    order,
    payment,
    subscription,
    promotion,
  }
}
