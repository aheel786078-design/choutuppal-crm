import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getStore, saveStore, logAuditEvent, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import { activateEntitlementsFromOrder } from '@/lib/payment-gateway'
import { getExpiringEntitlements, resolveListingEntitlements } from '@/lib/entitlement-resolver'
import { requireAuth, requireSuperAdmin, requireTerritoryAccess } from '@/lib/auth-server'
import type {
  ListingPlan,
  ListingSubscription,
  FeaturedPromotion,
  PaymentOrder,
  AuditLog,
} from '@/lib/types'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse
    const user = auth.user

    const store = getStore()
    const url = new URL(req.url)
    let territoryId = url.searchParams.get('territoryId')
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')?.toLowerCase()

    // Territory scoping: Non-super-admins cannot inspect monetization metrics outside their assigned territory
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_OPERATOR') {
      territoryId = user.territoryId || FLAGSHIP_TERRITORY_ID
    }

    let subscriptions = store.subscriptions || []
    let promotions = store.featuredPromotions || []
    let orders = store.orders || []
    let payments = store.payments || []
    let plans = store.plans || []

    if (territoryId && territoryId !== 'ALL') {
      subscriptions = subscriptions.filter((s) => s.territoryId === territoryId)
      promotions = promotions.filter((p) => p.territoryId === territoryId)
      orders = orders.filter((o) => o.territoryId === territoryId)
    }

    if (search) {
      subscriptions = subscriptions.filter(
        (s) =>
          s.id.toLowerCase().includes(search) ||
          s.listingId.toLowerCase().includes(search) ||
          s.planId.toLowerCase().includes(search)
      )
      promotions = promotions.filter(
        (p) =>
          p.id.toLowerCase().includes(search) ||
          p.listingId.toLowerCase().includes(search)
      )
      orders = orders.filter(
        (o) =>
          o.id.toLowerCase().includes(search) ||
          o.listingId.toLowerCase().includes(search) ||
          (o.gatewayOrderId && o.gatewayOrderId.toLowerCase().includes(search))
      )
    }

    const expiringData = getExpiringEntitlements(store, 7)

    const stats = {
      totalPlans: plans.length,
      activePlans: plans.filter((p) => p.isActive).length,
      totalSubscriptions: (store.subscriptions || []).length,
      activeSubscriptions: (store.subscriptions || []).filter((s) => s.status === 'active').length,
      totalFeaturedPromotions: (store.featuredPromotions || []).length,
      activeFeaturedPromotions: (store.featuredPromotions || []).filter((p) => p.status === 'active').length,
      totalOrders: (store.orders || []).length,
      completedOrders: (store.orders || []).filter((o) => o.status === 'paid').length,
      expiringIn7Days: expiringData.expiringSubscriptions.length + expiringData.expiringPromotions.length,
    }

    return NextResponse.json({
      success: true,
      stats,
      plans,
      subscriptions,
      promotions,
      orders,
      expiringData,
    })
  } catch (err: any) {
    console.error('[Admin Monetization GET] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to retrieve monetization data' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse
    const user = auth.user

    const body = await req.json().catch(() => ({}))
    const { action } = body

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    const store = getStore()
    if (!store.plans) store.plans = []
    if (!store.subscriptions) store.subscriptions = []
    if (!store.featuredPromotions) store.featuredPromotions = []
    if (!store.orders) store.orders = []
    if (!store.payments) store.payments = []
    if (!store.auditLogs) store.auditLogs = []

    const now = new Date()

    // -----------------------------------------------------------------------
    // Action 1: Create Plan (Super Admin Only)
    // -----------------------------------------------------------------------
    if (action === 'create_plan') {
      if (user.role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Forbidden: Super Administrator privilege required to configure billing plans.' },
          { status: 403 }
        )
      }

      const { name, type, price, currency, billingInterval, durationDays, features } = body
      if (!name || !type || typeof price !== 'number') {
        return NextResponse.json({ error: 'name, type, and numeric price are required' }, { status: 400 })
      }

      const planId = `plan_${type}_${Date.now()}`
      const newPlan: ListingPlan = {
        id: planId,
        name,
        type,
        price,
        currency: currency || 'INR',
        billingInterval: billingInterval || 'monthly',
        durationDays: typeof durationDays === 'number' ? durationDays : 30,
        features: Array.isArray(features) ? features : [],
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      store.plans.push(newPlan)
      saveStore(store)

      logAuditEvent({
        actorId: user.userId,
        actorName: user.phone,
        actorRole: user.role,
        action: 'PLAN_CREATED',
        entityType: 'monetization',
        entityId: planId,
        outcome: 'SUCCESS',
        details: `Created new ${type} plan '${name}' priced at ${price} ${newPlan.currency}`,
        metadata: { planId, name, price, type },
      })

      return NextResponse.json({ success: true, plan: newPlan })
    }

    // -----------------------------------------------------------------------
    // Action 2: Update / Toggle Plan (Super Admin Only)
    // -----------------------------------------------------------------------
    if (action === 'update_plan') {
      if (user.role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Forbidden: Super Administrator privilege required to configure billing plans.' },
          { status: 403 }
        )
      }

      const { planId, name, price, isActive, durationDays, features } = body
      const planIdx = store.plans.findIndex((p) => p.id === planId)
      if (planIdx === -1) {
        return NextResponse.json({ error: `Plan not found: ${planId}` }, { status: 404 })
      }

      const existing = store.plans[planIdx]
      if (name) existing.name = name
      if (typeof price === 'number') existing.price = price
      if (typeof isActive === 'boolean') existing.isActive = isActive
      if (typeof durationDays === 'number') existing.durationDays = durationDays
      if (Array.isArray(features)) existing.features = features
      existing.updatedAt = now.toISOString()
      store.plans[planIdx] = existing

      saveStore(store)

      logAuditEvent({
        actorId: user.userId,
        actorName: user.phone,
        actorRole: user.role,
        action: 'PLAN_UPDATED',
        entityType: 'monetization',
        entityId: planId,
        outcome: 'SUCCESS',
        details: `Updated plan '${existing.name}' (active: ${existing.isActive})`,
        metadata: { planId, price: existing.price, isActive: existing.isActive },
      })

      return NextResponse.json({ success: true, plan: existing })
    }

    // -----------------------------------------------------------------------
    // Action 3: Grant Authorized Subscription
    // -----------------------------------------------------------------------
    if (action === 'grant_subscription') {
      const { listingId, planId, durationDays, reasonNotes, territoryId } = body
      if (!listingId) {
        return NextResponse.json({ error: 'listingId is required' }, { status: 400 })
      }

      const listing = (store.listings || []).find((l) => l.id === listingId || l.slug === listingId)
      if (!listing) {
        return NextResponse.json({ error: `Listing not found: ${listingId}` }, { status: 404 })
      }

      const targetTerritory = listing.territoryId || FLAGSHIP_TERRITORY_ID
      const access = await requireTerritoryAccess(req, targetTerritory)
      if (access.errorResponse) return access.errorResponse

      const days = typeof durationDays === 'number' && durationDays > 0 ? durationDays : 30
      const expiresAt = new Date(now.getTime() + days * 86400000).toISOString()

      const newSub: ListingSubscription = {
        id: `sub_grant_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        listingId: listing.id,
        territoryId: territoryId || targetTerritory,
        planId: planId || 'plan_premium_monthly',
        status: 'active',
        startsAt: now.toISOString(),
        expiresAt,
        autoRenew: false,
        notes: reasonNotes || 'Admin manual promotional grant',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      store.subscriptions.push(newSub)
      saveStore(store)

      logAuditEvent({
        actorId: user.userId,
        actorName: user.phone,
        actorRole: user.role,
        territoryId: newSub.territoryId,
        action: 'SUBSCRIPTION_GRANTED',
        entityType: 'monetization',
        entityId: newSub.id,
        outcome: 'SUCCESS',
        details: `Granted Premium subscription to listing '${listing.title}' until ${expiresAt}. Reason: ${newSub.notes}`,
        metadata: { listingId: listing.id, subscriptionId: newSub.id, expiresAt },
      })

      return NextResponse.json({ success: true, subscription: newSub })
    }

    // -----------------------------------------------------------------------
    // Action 4: Grant Authorized Featured Promotion
    // -----------------------------------------------------------------------
    if (action === 'grant_promotion') {
      const { listingId, durationDays, priority, placement, categoryId, reasonNotes, territoryId } = body
      if (!listingId) {
        return NextResponse.json({ error: 'listingId is required' }, { status: 400 })
      }

      const listing = (store.listings || []).find((l) => l.id === listingId || l.slug === listingId)
      if (!listing) {
        return NextResponse.json({ error: `Listing not found: ${listingId}` }, { status: 404 })
      }

      const targetTerritory = listing.territoryId || FLAGSHIP_TERRITORY_ID
      const access = await requireTerritoryAccess(req, targetTerritory)
      if (access.errorResponse) return access.errorResponse

      const days = typeof durationDays === 'number' && durationDays > 0 ? durationDays : 30
      const expiresAt = new Date(now.getTime() + days * 86400000).toISOString()
      const promoPriority = typeof priority === 'number' ? priority : 100

      const newPromo: FeaturedPromotion = {
        id: `promo_grant_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        listingId: listing.id,
        territoryId: territoryId || targetTerritory,
        status: 'active',
        startsAt: now.toISOString(),
        expiresAt,
        placement: placement || 'all',
        categoryId: categoryId || listing.categoryId,
        priority: promoPriority,
        notes: reasonNotes || 'Admin manual featured grant',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      store.featuredPromotions.push(newPromo)
      saveStore(store)

      logAuditEvent({
        actorId: user.userId,
        actorName: user.phone,
        actorRole: user.role,
        territoryId: newPromo.territoryId,
        action: 'PROMOTION_GRANTED',
        entityType: 'monetization',
        entityId: newPromo.id,
        outcome: 'SUCCESS',
        details: `Granted Featured promotion to listing '${listing.title}' (priority ${promoPriority}) until ${expiresAt}. Reason: ${newPromo.notes}`,
        metadata: { listingId: listing.id, promotionId: newPromo.id, priority: promoPriority, expiresAt },
      })

      return NextResponse.json({ success: true, promotion: newPromo })
    }

    // -----------------------------------------------------------------------
    // Action 5: Verify Offline / Manual Payment
    // -----------------------------------------------------------------------
    if (action === 'verify_offline_payment') {
      const { orderId, paymentReference, notes } = body
      if (!orderId) {
        return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
      }

      const order = store.orders.find((o) => o.id === orderId)
      if (!order) {
        return NextResponse.json({ error: `Order not found: ${orderId}` }, { status: 404 })
      }

      const targetTerritory = order.territoryId || FLAGSHIP_TERRITORY_ID
      const access = await requireTerritoryAccess(req, targetTerritory)
      if (access.errorResponse) return access.errorResponse

      const activation = activateEntitlementsFromOrder(
        order.id,
        {
          paymentId: paymentReference || `offline_ref_${Date.now()}`,
          amount: order.amount,
          currency: order.currency,
          method: 'offline_cash_upi',
          status: 'manually_verified',
          notes: notes || 'Verified offline by Admin with physical/UPI receipt',
          actorId: user.userId,
          actorName: user.phone,
        },
        store
      )

      logAuditEvent({
        actorId: user.userId,
        actorName: user.phone,
        actorRole: user.role,
        territoryId: targetTerritory,
        action: 'OFFLINE_PAYMENT_VERIFIED',
        entityType: 'monetization',
        entityId: order.id,
        outcome: 'SUCCESS',
        details: `Manually verified offline payment for Order ${order.id} (₹${order.amount}). Reference: ${paymentReference || 'N/A'}`,
        metadata: { orderId: order.id, amount: order.amount, paymentReference },
      })

      return NextResponse.json({
        success: true,
        message: 'Order manually verified and entitlements activated',
        order: activation.order,
        payment: activation.payment,
        subscription: activation.subscription,
        promotion: activation.promotion,
      })
    }

    // -----------------------------------------------------------------------
    // Action 6: Suspend or Cancel Subscription
    // -----------------------------------------------------------------------
    if (action === 'cancel_subscription') {
      const { subscriptionId, reason } = body
      const subIdx = store.subscriptions.findIndex((s) => s.id === subscriptionId)
      if (subIdx === -1) {
        return NextResponse.json({ error: `Subscription not found: ${subscriptionId}` }, { status: 404 })
      }

      const sub = store.subscriptions[subIdx]
      const targetTerritory = sub.territoryId || FLAGSHIP_TERRITORY_ID
      const access = await requireTerritoryAccess(req, targetTerritory)
      if (access.errorResponse) return access.errorResponse

      sub.status = 'cancelled'
      sub.updatedAt = now.toISOString()
      sub.notes = `${sub.notes || ''} [Cancelled: ${reason || 'Admin action'}]`

      saveStore(store)

      logAuditEvent({
        actorId: user.userId,
        actorName: user.phone,
        actorRole: user.role,
        territoryId: targetTerritory,
        action: 'SUBSCRIPTION_CANCELLED',
        entityType: 'monetization',
        entityId: subscriptionId,
        outcome: 'SUCCESS',
        details: `Cancelled subscription ${subscriptionId}. Reason: ${reason || 'N/A'}`,
        metadata: { subscriptionId, reason },
      })

      return NextResponse.json({ success: true, subscription: sub })
    }

    // -----------------------------------------------------------------------
    // Action 7: Extend Subscription
    // -----------------------------------------------------------------------
    if (action === 'extend_subscription') {
      const { subscriptionId, additionalDays, reason } = body
      const subIdx = store.subscriptions.findIndex((s) => s.id === subscriptionId)
      if (subIdx === -1) {
        return NextResponse.json({ error: `Subscription not found: ${subscriptionId}` }, { status: 404 })
      }

      const sub = store.subscriptions[subIdx]
      const targetTerritory = sub.territoryId || FLAGSHIP_TERRITORY_ID
      const access = await requireTerritoryAccess(req, targetTerritory)
      if (access.errorResponse) return access.errorResponse

      const days = typeof additionalDays === 'number' && additionalDays > 0 ? additionalDays : 30
      const currentExpiry = new Date(sub.expiresAt).getTime()
      const baseTime = currentExpiry > now.getTime() ? currentExpiry : now.getTime()
      const newExpiry = new Date(baseTime + days * 86400000).toISOString()

      sub.expiresAt = newExpiry
      sub.status = 'active'
      sub.updatedAt = now.toISOString()
      sub.notes = `${sub.notes || ''} [Extended by ${days}d: ${reason || 'Admin action'}]`

      saveStore(store)

      logAuditEvent({
        actorId: user.userId,
        actorName: user.phone,
        actorRole: user.role,
        territoryId: targetTerritory,
        action: 'SUBSCRIPTION_EXTENDED',
        entityType: 'monetization',
        entityId: subscriptionId,
        outcome: 'SUCCESS',
        details: `Extended subscription ${subscriptionId} by ${days} days until ${newExpiry}`,
        metadata: { subscriptionId, additionalDays: days, newExpiry },
      })

      return NextResponse.json({ success: true, subscription: sub })
    }

    return NextResponse.json({ error: `Unrecognized action: ${action}` }, { status: 400 })
  } catch (err: any) {
    console.error('[Admin Monetization POST] Error:', err)
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status: 500 })
  }
}
