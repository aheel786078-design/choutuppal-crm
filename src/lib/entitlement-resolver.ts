import type {
  AdminDataStore,
  Listing,
  ListingEntitlements,
  ListingSubscription,
  FeaturedPromotion,
} from './types'
import { FLAGSHIP_TERRITORY_ID } from './store'

/**
 * Resolves live entitlements for a listing by evaluating its publication status,
 * subscriptions, time-bounded featured promotions, and territory scoping.
 *
 * Enforces authoritative server-side rules across Website and WhatsApp CRM:
 * 1. Expired promotions immediately lose priority and featured badges.
 * 2. Unpublished, rejected, or paused listings never receive public display,
 *    even if an active paid order exists.
 * 3. Featured entitlement does not automatically grant Premium privileges.
 * 4. Backward-compatible fallback to baseline boolean flags only when no
 *    explicit promotion/subscription records exist for the listing.
 */
export function resolveListingEntitlements(
  listingId: string,
  store: AdminDataStore,
  asOf?: Date | string | number
): ListingEntitlements {
  const now = asOf ? new Date(asOf).getTime() : Date.now()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

  const listing = (store.listings || []).find((l) => l.id === listingId || l.slug === listingId)
  if (!listing) {
    return {
      listingId,
      isPremium: false,
      isFeatured: false,
      activeSubscription: null,
      activePromotion: null,
      eligibleForWebsite: false,
      eligibleForWhatsApp: false,
      featuredPriority: 0,
      reasons: [`Listing not found in store (${listingId})`],
      expiringSoon: false,
    }
  }

  const reasons: string[] = []
  const isPublishedOrApproved = ['published', 'approved', 'APPROVED'].includes(listing.status)

  if (!isPublishedOrApproved) {
    reasons.push(`Listing status is '${listing.status}' (requires published or approved)`)
  }

  // -------------------------------------------------------------------------
  // 1. Subscription & Premium Entitlement Resolution
  // -------------------------------------------------------------------------
  let isPremium = false
  let activeSubscription: ListingSubscription | null = null
  let subExpiringSoon = false

  const listingSubs = (store.subscriptions || []).filter(
    (s) => s.listingId === listing.id || (listing.slug && s.listingId === listing.slug)
  )

  if (listingSubs.length > 0) {
    // Look for active subscription within valid date window
    const activeSub = listingSubs.find((s) => {
      if (s.status !== 'active') return false
      const starts = new Date(s.startsAt).getTime()
      const expires = new Date(s.expiresAt).getTime()
      return starts <= now && expires >= now
    })

    if (activeSub) {
      activeSubscription = activeSub
      isPremium = isPublishedOrApproved
      const expires = new Date(activeSub.expiresAt).getTime()
      if (expires >= now && expires <= now + sevenDaysMs) {
        subExpiringSoon = true
      }
      reasons.push(
        isPublishedOrApproved
          ? `Active Premium subscription (valid until ${activeSub.expiresAt})`
          : `Active subscription held, but listing is not published/approved (${listing.status})`
      )
    } else {
      // Find latest subscription to report status
      const latestSub = [...listingSubs].sort(
        (a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime()
      )[0]
      isPremium = false
      reasons.push(`Subscription is ${latestSub.status} (expired: ${latestSub.expiresAt})`)
    }
  } else {
    // Grandfathered backward-compatibility for baseline seeded records
    if (listing.isPremium) {
      isPremium = isPublishedOrApproved
      reasons.push('Grandfathered baseline premium status (legacy boolean flag)')
    }
  }

  // -------------------------------------------------------------------------
  // 2. Featured Promotion & Priority Resolution
  // -------------------------------------------------------------------------
  let isFeatured = false
  let activePromotion: FeaturedPromotion | null = null
  let featuredPriority = 0
  let promoExpiringSoon = false

  const listingPromos = (store.featuredPromotions || []).filter(
    (p) => p.listingId === listing.id || (listing.slug && p.listingId === listing.slug)
  )

  if (listingPromos.length > 0) {
    // Look for active promotion within valid date window
    const activePromo = listingPromos.find((p) => {
      if (p.status !== 'active') return false
      const starts = new Date(p.startsAt).getTime()
      const expires = new Date(p.expiresAt).getTime()
      return starts <= now && expires >= now
    })

    if (activePromo) {
      activePromotion = activePromo
      isFeatured = isPublishedOrApproved
      featuredPriority = typeof activePromo.priority === 'number' ? activePromo.priority : 100
      const expires = new Date(activePromo.expiresAt).getTime()
      if (expires >= now && expires <= now + sevenDaysMs) {
        promoExpiringSoon = true
      }
      reasons.push(
        isPublishedOrApproved
          ? `Active Featured promotion (priority: ${featuredPriority}, expires: ${activePromo.expiresAt})`
          : `Active promotion held, but listing is not published/approved (${listing.status})`
      )
    } else {
      // Promotions exist but are expired/cancelled/scheduled
      const latestPromo = [...listingPromos].sort(
        (a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime()
      )[0]
      isFeatured = false
      featuredPriority = 0
      reasons.push(`Featured promotion is ${latestPromo.status} (ended: ${latestPromo.expiresAt})`)
    }
  } else {
    // Grandfathered backward-compatibility for baseline seeded records
    if (listing.isFeatured) {
      isFeatured = isPublishedOrApproved
      featuredPriority = isFeatured ? 10 : 0
      reasons.push('Grandfathered baseline featured status (legacy boolean flag)')
    }
  }

  // -------------------------------------------------------------------------
  // 3. Platform & Channel Eligibility
  // -------------------------------------------------------------------------
  const eligibleForWebsite = isPublishedOrApproved
  const eligibleForWhatsApp = isPublishedOrApproved

  return {
    listingId: listing.id,
    isPremium,
    isFeatured,
    activeSubscription,
    activePromotion,
    eligibleForWebsite,
    eligibleForWhatsApp,
    featuredPriority,
    reasons,
    expiringSoon: subExpiringSoon || promoExpiringSoon,
  }
}

/**
 * Returns a bulk map of ListingEntitlements for all listings in the store.
 */
export function getListingEntitlementsMap(
  store: AdminDataStore,
  asOf?: Date | string | number
): Map<string, ListingEntitlements> {
  const map = new Map<string, ListingEntitlements>()
  for (const listing of store.listings || []) {
    map.set(listing.id, resolveListingEntitlements(listing.id, store, asOf))
  }
  return map
}

/**
 * Lightweight helper to determine if a listing is currently Premium.
 */
export function isListingPremium(
  listing: Listing,
  store?: AdminDataStore,
  asOf?: Date | string | number
): boolean {
  if (!listing) return false
  if (!store) {
    return Boolean(listing.isPremium) && ['published', 'approved', 'APPROVED'].includes(listing.status)
  }
  const ent = resolveListingEntitlements(listing.id, store, asOf)
  return ent.isPremium
}

/**
 * Lightweight helper to determine if a listing is currently Featured.
 */
export function isListingFeatured(
  listing: Listing,
  store?: AdminDataStore,
  asOf?: Date | string | number
): boolean {
  if (!listing) return false
  if (!store) {
    return Boolean(listing.isFeatured) && ['published', 'approved', 'APPROVED'].includes(listing.status)
  }
  const ent = resolveListingEntitlements(listing.id, store, asOf)
  return ent.isFeatured
}

/**
 * Finds all subscriptions and promotions that are expiring within the specified window.
 */
export function getExpiringEntitlements(
  store: AdminDataStore,
  windowDays = 7,
  asOf?: Date | string | number
): {
  expiringSubscriptions: ListingSubscription[]
  expiringPromotions: FeaturedPromotion[]
  expiredSubscriptions: ListingSubscription[]
  expiredPromotions: FeaturedPromotion[]
} {
  const now = asOf ? new Date(asOf).getTime() : Date.now()
  const windowMs = windowDays * 24 * 60 * 60 * 1000

  const expiringSubscriptions: ListingSubscription[] = []
  const expiredSubscriptions: ListingSubscription[] = []
  for (const sub of store.subscriptions || []) {
    const expires = new Date(sub.expiresAt).getTime()
    if (expires < now) {
      expiredSubscriptions.push(sub)
    } else if (expires <= now + windowMs && sub.status === 'active') {
      expiringSubscriptions.push(sub)
    }
  }

  const expiringPromotions: FeaturedPromotion[] = []
  const expiredPromotions: FeaturedPromotion[] = []
  for (const promo of store.featuredPromotions || []) {
    const expires = new Date(promo.expiresAt).getTime()
    if (expires < now) {
      expiredPromotions.push(promo)
    } else if (expires <= now + windowMs && promo.status === 'active') {
      expiringPromotions.push(promo)
    }
  }

  return {
    expiringSubscriptions,
    expiringPromotions,
    expiredSubscriptions,
    expiredPromotions,
  }
}
