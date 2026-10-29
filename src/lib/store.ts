import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import type {
  AdminDataStore,
  Territory,
  Franchise,
  FranchiseStaff,
  TerritoryDomain,
  AuditLog,
  Listing,
  CRMContact,
  CRMFlowConfig,
  WhatsAppFlow,
  ApprovalItem,
  UserStory,
  UserOffer,
  NewsItem,
  ShortItem,
  BannerItem,
  TickerItem,
  AppUser,
  WhatsAppMessage,
  CRMDeal,
  AutomationRule,
  BroadcastCampaign,
  ListingPlan,
  ListingSubscription,
  FeaturedPromotion,
  PaymentOrder,
  PaymentTransaction,
  WebhookEvent,
  GovernmentContact,
} from './types'
import { STANDARD_CATEGORIES, STANDARD_VILLAGES, PRESET_PHOTO_COVERS } from './constants'
import { getDefaultGovernmentContacts } from './government-contacts'
export { getDefaultGovernmentContacts } from './government-contacts'

export const FLAGSHIP_TERRITORY_ID = 'territory_choutuppal'

export const FLAGSHIP_CHOUTUPPAL_TERRITORY: Territory = {
  id: FLAGSHIP_TERRITORY_ID,
  name: 'Choutuppal Town & Mandal',
  slug: 'choutuppal',
  type: 'company_owned',
  status: 'active',
  district: 'Yadadri Bhuvanagiri',
  state: 'Telangana',
  pincodes: ['508252'],
  localities: ['Choutuppal Town', 'Panthangi', 'Malkapur', 'Peddakondur', 'Lingoji Guda', 'Koyalagudem'],
  primaryDomain: 'choutuppal.in',
  subdomain: 'choutuppal.choutuppal.in',
  isFlagship: true,
  immutable: true,
  branding: {
    logoUrl: 'https://i.ibb.co/BVdvN5rB/Untitled-design-removebg-preview.png',
    primaryColor: '#1d4ed8',
    tagline: 'Mana Choutuppal Local Search & WhatsApp Super App',
    heroTitle: 'చౌటుప్పల్ లోకల్ బిజినెస్ & రియల్ ఎస్టేట్',
  },
  contactPhone: '9494348175',
  whatsappNumber: '9494348175',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-10-25T00:00:00.000Z',
}

// Schema invariant: store deals: CRMDeal[]
export type { AdminDataStore }

export function getDefaultListingPlans(): ListingPlan[] {
  return [
    {
      id: 'plan_premium_monthly',
      name: 'Premium Listing',
      type: 'premium',
      price: 499,
      currency: 'INR',
      billingInterval: 'monthly',
      durationDays: 30,
      features: [
        'Extended business description',
        'Photo gallery & video showcase',
        'Direct call, WhatsApp & website buttons',
        'Enhanced profile layout',
        'Listing analytics',
      ],
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'plan_featured_monthly',
      name: 'Featured Boost',
      type: 'featured',
      price: 199,
      currency: 'INR',
      billingInterval: 'monthly',
      durationDays: 30,
      features: [
        'Featured badge on website & WhatsApp',
        'Priority ranking in category & search',
        'Priority in WhatsApp flow browser',
        'Top of homepage featured placement',
      ],
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'plan_bundle_monthly',
      name: 'Premium + Featured Bundle',
      type: 'bundle',
      price: 599,
      currency: 'INR',
      billingInterval: 'monthly',
      durationDays: 30,
      features: [
        'All Premium Listing features',
        'All Featured Boost priority benefits',
        'Dedicated merchant support',
        'Save ₹99/month compared to individual purchase',
      ],
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ]
}

export function getDataFilePath(): string {
  return process.env.CRM_DATA_FILE
    ? path.resolve(process.env.CRM_DATA_FILE)
    : path.join(process.cwd(), 'data', 'admin_data.json')
}

const DATA_FILE = getDataFilePath()

export function loadStore(customPath?: string): AdminDataStore {
  const targetFile = customPath || getDataFilePath()
  try {
    if (!fs.existsSync(targetFile)) {
      return getFallbackStore()
    }
    const raw = fs.readFileSync(targetFile, 'utf-8')
    const parsed = JSON.parse(raw)

    // Ensure Territories & Flagship Choutuppal Protection
    if (!parsed.territories || !Array.isArray(parsed.territories)) {
      parsed.territories = [FLAGSHIP_CHOUTUPPAL_TERRITORY, ...getInitialSampleTerritories()]
    } else {
      const flagshipIdx = parsed.territories.findIndex((t: Territory) => t.id === FLAGSHIP_TERRITORY_ID)
      if (flagshipIdx === -1) {
        parsed.territories.unshift(FLAGSHIP_CHOUTUPPAL_TERRITORY)
      } else {
        parsed.territories[flagshipIdx].isFlagship = true
        parsed.territories[flagshipIdx].type = 'company_owned'
        parsed.territories[flagshipIdx].immutable = true
      }
    }

    // Ensure Franchises with full lifecycle models
    if (!parsed.franchises || !Array.isArray(parsed.franchises) || parsed.franchises.length === 0) {
      parsed.franchises = getInitialSampleFranchises()
    } else {
      // Migrate any legacy franchise records
      parsed.franchises = parsed.franchises.map((f: any) => ({
        id: f.id || `fr_${Date.now()}`,
        territoryId: f.territoryId || (f.proposedArea?.toLowerCase().includes('suryapet') ? 'territory_suryapet' : 'territory_bhongir'),
        territoryName: f.territoryName || f.proposedArea || 'Local Town',
        territorySlug: f.territorySlug || (f.proposedArea?.toLowerCase().includes('suryapet') ? 'suryapet' : 'bhongir'),
        name: f.name || `${f.proposedArea || 'Town'} Franchise`,
        applicantName: f.applicantName || 'Applicant',
        applicantPhone: f.applicantPhone || '9848012345',
        email: f.email || 'franchise@choutuppal.in',
        experience: f.experience || 'Business Operator',
        status: f.status || 'application_submitted',
        planTier: f.planTier || 'PRO',
        featureLimits: f.featureLimits || {
          maxListings: 500,
          maxStaff: 5,
          maxMonthlyBroadcasts: 1000,
          customDomainAllowed: true,
          aiChatEnabled: true,
        },
        commercialModel: f.commercialModel || {
          type: 'fixed',
          setupFee: 25000,
          monthlyFee: 5000,
          revSharePct: 20,
          currency: 'INR',
        },
        assignedDomain: f.assignedDomain,
        activatedAt: f.activatedAt,
        expiresAt: f.expiresAt,
        createdAt: f.createdAt || new Date().toISOString(),
        updatedAt: f.updatedAt || new Date().toISOString(),
      }))
    }

    if (!parsed.franchiseStaff) parsed.franchiseStaff = []
    if (!parsed.territoryDomains) {
      parsed.territoryDomains = [
        {
          id: 'dom_choutuppal_main',
          territoryId: FLAGSHIP_TERRITORY_ID,
          domain: 'choutuppal.in',
          type: 'PRIMARY',
          isVerified: true,
          sslStatus: 'active',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]
    }
    if (!parsed.auditLogs) parsed.auditLogs = []

    // Backfill territory_id across all existing listings to Flagship Choutuppal
    if (parsed.listings && Array.isArray(parsed.listings)) {
      parsed.listings = parsed.listings.map((l: Listing) => ({
        ...l,
        territoryId: l.territoryId || FLAGSHIP_TERRITORY_ID,
      }))
    }

    // Backfill territory_id on contacts, approvals, stories, offers, news, shorts, banners, tickers
    if (parsed.contacts) parsed.contacts = parsed.contacts.map((c: any) => ({ ...c, territoryId: c.territoryId || FLAGSHIP_TERRITORY_ID }))
    if (parsed.approvals) parsed.approvals = parsed.approvals.map((a: any) => ({ ...a, territoryId: a.territoryId || FLAGSHIP_TERRITORY_ID }))
    if (parsed.stories) parsed.stories = parsed.stories.map((s: any) => ({ ...s, territoryId: s.territoryId || FLAGSHIP_TERRITORY_ID }))
    if (parsed.offers) parsed.offers = parsed.offers.map((o: any) => ({ ...o, territoryId: o.territoryId || FLAGSHIP_TERRITORY_ID }))
    if (parsed.news) parsed.news = parsed.news.map((n: any) => ({ ...n, territoryId: n.territoryId || FLAGSHIP_TERRITORY_ID }))
    if (parsed.shorts) parsed.shorts = parsed.shorts.map((s: any) => ({ ...s, territoryId: s.territoryId || FLAGSHIP_TERRITORY_ID }))
    if (parsed.banners) parsed.banners = parsed.banners.map((b: any) => ({ ...b, territoryId: b.territoryId || FLAGSHIP_TERRITORY_ID }))
    if (parsed.tickers) parsed.tickers = parsed.tickers.map((t: any) => ({ ...t, territoryId: t.territoryId || FLAGSHIP_TERRITORY_ID }))
    if (parsed.messages) parsed.messages = parsed.messages.map((m: any) => ({ ...m, territoryId: m.territoryId || FLAGSHIP_TERRITORY_ID }))
    if (!parsed.deals || !Array.isArray(parsed.deals) || parsed.deals.length === 0) {
      parsed.deals = getInitialSampleDeals()
    } else {
      parsed.deals = parsed.deals.map((d: any) => ({
        ...d,
        territoryId: d.territoryId || FLAGSHIP_TERRITORY_ID,
        currency: d.currency || 'INR',
        status: d.status || (d.stage === 'WON' ? 'WON' : d.stage === 'LOST' ? 'LOST' : 'OPEN'),
      }))
    }
    if (!parsed.automations || !Array.isArray(parsed.automations)) {
      parsed.automations = []
    } else {
      parsed.automations = parsed.automations.map((a: any) => ({
        ...a,
        territoryId: a.territoryId || FLAGSHIP_TERRITORY_ID,
        status: a.status || (a.is_active === false || a.isActive === false ? 'paused' : 'draft'),
      }))
    }
    if (!parsed.flows || !Array.isArray(parsed.flows)) {
      parsed.flows = []
    } else {
      parsed.flows = parsed.flows.map((f: any) => {
        const triggers = f.triggers && Array.isArray(f.triggers) && f.triggers.length > 0
          ? f.triggers
          : (f.trigger_keywords && Array.isArray(f.trigger_keywords)
              ? f.trigger_keywords.map((kw: string) => ({ type: 'keyword', value: kw }))
              : (f.triggerKeyword ? [{ type: 'keyword', value: f.triggerKeyword }] : [{ type: 'keyword', value: 'hi' }]))

        const status = f.status || (f.isActive === false ? 'paused' : 'published')
        const nodes = f.nodes && Array.isArray(f.nodes) ? f.nodes : []

        return {
          ...f,
          status,
          version: f.version || 1,
          triggers,
          nodes,
          entryNodeId: f.entryNodeId || (nodes[0]?.id || 'start'),
          updatedAt: f.updatedAt || f.createdAt || new Date().toISOString(),
        }
      })
    }
    if (!parsed.magicTokens) parsed.magicTokens = []
    if (!parsed.plans || !Array.isArray(parsed.plans) || parsed.plans.length === 0) {
      parsed.plans = getDefaultListingPlans()
    }
    if (!parsed.subscriptions || !Array.isArray(parsed.subscriptions)) {
      parsed.subscriptions = []
    }
    if (!parsed.featuredPromotions || !Array.isArray(parsed.featuredPromotions)) {
      parsed.featuredPromotions = []
    }
    if (!parsed.orders || !Array.isArray(parsed.orders)) {
      parsed.orders = []
    }
    if (!parsed.payments || !Array.isArray(parsed.payments)) {
      parsed.payments = []
    }
    if (!parsed.webhookEvents || !Array.isArray(parsed.webhookEvents)) {
      parsed.webhookEvents = []
    }
    if (!parsed.governmentContacts || !Array.isArray(parsed.governmentContacts) || parsed.governmentContacts.length === 0) {
      parsed.governmentContacts = getDefaultGovernmentContacts()
    }

    return parsed as AdminDataStore
  } catch (err) {
    console.error('[Admin Store] Read error:', err)
    return getFallbackStore()
  }
}

export const getStore = loadStore

export function saveStore(store: AdminDataStore, customPath?: string): void {
  const targetFile = customPath || getDataFilePath()
  if (!store || typeof store !== 'object') {
    throw new Error('[Admin Store] Refusing to save: invalid store payload (not an object)')
  }
  if (!Array.isArray(store.listings) || store.listings.length === 0) {
    throw new Error('[Admin Store] Invariant Violation: refusing to save empty listings array')
  }
  if (!Array.isArray(store.territories) || store.territories.length === 0) {
    throw new Error('[Admin Store] Invariant Violation: refusing to save empty territories array')
  }

  const dir = path.dirname(targetFile)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  const tempFile = `${targetFile}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 6)}`
  try {
    fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), 'utf-8')
    const stat = fs.statSync(tempFile)
    if (stat.size === 0) {
      throw new Error('[Admin Store] Invariant Violation: temp store file is empty (0 bytes)')
    }
    fs.renameSync(tempFile, targetFile)
  } catch (err) {
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile)
      } catch (_) {}
    }
    console.error('[Admin Store] Save error:', err)
    throw err
  }
}

/**
 * In-process asynchronous FIFO mutation queue.
 * Guarantees that concurrent mutations execute sequentially:
 *   1. Awaits completion of any in-flight mutation.
 *   2. Loads the fresh data store from disk (preventing stale reads).
 *   3. Executes mutator(store).
 *   4. Atomically persists store to disk via saveStore.
 *   5. Discards uncommitted in-memory changes if mutator throws (no partial writes).
 *   6. Automatically recovers queue on error so subsequent mutations are not blocked.
 *
 * NOTE: This protects concurrent requests within a single Node.js process.
 * Multi-process coordination requires external locks or an ACID database engine.
 */
let mutationQueue: Promise<unknown> = Promise.resolve()

export interface MutateStoreOptions {
  customPath?: string
}

export async function mutateStore<T>(
  mutator: (store: AdminDataStore) => Promise<T> | T,
  options?: MutateStoreOptions
): Promise<T> {
  const previous = mutationQueue

  let resolveNext: () => void
  mutationQueue = new Promise<void>((resolve) => {
    resolveNext = resolve
  })

  // Wait for prior mutation to settle (absorb failures to prevent cascade)
  await previous.catch(() => {})

  const targetFile = options?.customPath || getDataFilePath()

  try {
    const store = loadStore(targetFile)
    const result = await mutator(store)
    saveStore(store, targetFile)
    return result
  } finally {
    resolveNext!()
  }
}

export function createStoreBackup(label?: string): string {
  const dir = path.join(path.dirname(DATA_FILE), 'backups')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  const cleanLabel = label ? `_${label.replace(/[^a-zA-Z0-9_-]/g, '')}` : ''
  const backupFile = path.join(dir, `admin_data_${Date.now()}${cleanLabel}.json`)
  fs.copyFileSync(DATA_FILE, backupFile)
  return backupFile
}

// --------------------------------------------------------------------------
// CRM & Listing Synchronization Engine
// --------------------------------------------------------------------------

export interface SyncListingOptions {
  callerTerritoryId?: string
  callerRole?: string
  inStore?: AdminDataStore
}

/**
 * Synchronizes a listing with the store and auto-creates/updates the associated
 * CRM merchant contact lead. Ensures idempotent upserts and cross-territory isolation.
 */
export function syncListingToCrm(
  listing: Listing,
  optionsOrStore?: AdminDataStore | SyncListingOptions
): { listing: Listing; contact: CRMContact } {
  if (!listing) {
    throw new Error('Listing object is required for syncListingToCrm')
  }

  let store: AdminDataStore
  let callerTerritoryId: string | undefined
  let callerRole: string | undefined

  if (optionsOrStore && 'listings' in optionsOrStore && Array.isArray((optionsOrStore as AdminDataStore).listings)) {
    store = optionsOrStore as AdminDataStore
  } else if (optionsOrStore && typeof optionsOrStore === 'object') {
    const opts = optionsOrStore as SyncListingOptions
    callerTerritoryId = opts.callerTerritoryId
    callerRole = opts.callerRole
    store = opts.inStore || loadStore()
  } else {
    store = loadStore()
  }

  if (!store.listings) store.listings = []
  if (!store.contacts) store.contacts = []

  if (!listing.id) {
    listing.id = `lst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  }

  const targetTerritoryId = listing.territoryId || FLAGSHIP_TERRITORY_ID
  listing.territoryId = targetTerritoryId

  const existingListingIdx = store.listings.findIndex((l) => l.id === listing.id)
  const existingListing = existingListingIdx >= 0 ? store.listings[existingListingIdx] : null

  // Defense-in-depth: Reject unauthorized cross-territory operations if caller context is provided
  if (callerTerritoryId && callerRole !== 'SUPER_ADMIN') {
    if (targetTerritoryId !== callerTerritoryId) {
      throw new Error(`Forbidden: Caller from territory ${callerTerritoryId} cannot sync listing to territory ${targetTerritoryId}`)
    }
    if (existingListing && (existingListing.territoryId || FLAGSHIP_TERRITORY_ID) !== callerTerritoryId) {
      throw new Error(`Forbidden: Caller from territory ${callerTerritoryId} cannot modify listing belonging to ${existingListing.territoryId}`)
    }
  }

  // Prevent cross-territory reassignments by non-super-admins
  if (existingListing && existingListing.territoryId && existingListing.territoryId !== targetTerritoryId) {
    if (callerRole !== 'SUPER_ADMIN') {
      throw new Error(`Unauthorized cross-territory modification: Cannot move listing from ${existingListing.territoryId} to ${targetTerritoryId}`)
    }
  }

  // 1. Resolve or Create CRM Contact for Merchant Lead
  const listingPhone = (listing.phone || listing.whatsapp || '').trim()

  // Match existing contact by listingId first, then by phone within the same territory
  let contactIdx = store.contacts.findIndex((c) => c.listingId === listing.id)
  if (contactIdx === -1 && listingPhone) {
    contactIdx = store.contacts.findIndex(
      (c) => (c.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritoryId && c.phone === listingPhone
    )
  }

  let syncedContact: CRMContact

  const categoryTag = listing.categoryName ? [listing.categoryName] : []
  const premiumTags = listing.isPremium ? ['VIP', 'Premium'] : []

  if (contactIdx >= 0) {
    const existingContact = store.contacts[contactIdx]
    const mergedTags = Array.from(
      new Set([...(existingContact.tags || ['Listing-Owner', 'Merchant']), ...categoryTag, ...premiumTags])
    )

    syncedContact = {
      ...existingContact,
      name: existingContact.name || listing.title,
      listingId: listing.id,
      listingTitle: listing.title,
      phone: listingPhone || existingContact.phone,
      email: listing.email || existingContact.email || '',
      territoryId: targetTerritoryId,
      franchiseId: listing.franchiseId || existingContact.franchiseId,
      tags: mergedTags,
      notes: existingContact.notes || `Merchant listing: ${listing.title} (${listing.categoryName || 'General'}) in ${listing.villageName || listing.location || 'Town'}.`,
      lastContactAt: new Date().toISOString(),
    }
    store.contacts[contactIdx] = syncedContact
  } else {
    const contactId = `cnt_${listing.id.replace(/^lst_/, '')}`
    const initialTags = Array.from(new Set(['Listing-Owner', 'Merchant', ...categoryTag, ...premiumTags]))

    syncedContact = {
      id: contactId,
      name: listing.title,
      phone: listingPhone || '9848012345',
      email: listing.email || '',
      tags: initialTags,
      stage: 'WON',
      territoryId: targetTerritoryId,
      franchiseId: listing.franchiseId,
      listingId: listing.id,
      listingTitle: listing.title,
      notes: `Active merchant: ${listing.title} (${listing.categoryName || 'General'}) in ${listing.villageName || listing.location || 'Town'}.`,
      messageCount: 0,
      lastMessage: 'Listing synced to CRM WhatsApp Flow.',
      lastContactAt: new Date().toISOString(),
      createdAt: listing.createdAt || new Date().toISOString(),
    }
    store.contacts.push(syncedContact)
  }

  // 2. Upsert Listing into Store
  const updatedListing: Listing = {
    ...(existingListing || {}),
    ...listing,
    territoryId: targetTerritoryId,
    syncedToCrm: true,
    crmLeadId: syncedContact.id,
    updatedAt: new Date().toISOString(),
  }

  if (existingListingIdx >= 0) {
    store.listings[existingListingIdx] = updatedListing
  } else {
    store.listings.push(updatedListing)
  }

  // 3. Atomically Persist Store
  saveStore(store)

  return { listing: updatedListing, contact: syncedContact }
}

/**
 * Determines whether a listing is approved/published and eligible for public display.
 * Accepts canonical 'published', 'approved', and uppercase legacy 'APPROVED'.
 * Rejects 'pending_approval', 'PENDING', 'draft', 'rejected', 'REJECTED', 'changes_requested', 'paused', 'archived'.
 */
export function isListingPublished(listing: Listing | { status?: string } | undefined | null): boolean {
  if (!listing || !listing.status) return false
  const s = String(listing.status).toLowerCase().trim()
  return s === 'published' || s === 'approved'
}

// --------------------------------------------------------------------------
// Multi-Tenant Territory & Franchise Access Helpers
// --------------------------------------------------------------------------

export function getTerritory(territoryId: string): Territory | undefined {
  const store = loadStore()
  return (store.territories || []).find((t) => t.id === territoryId)
}

export function getTerritoryBySlug(slug: string): Territory | undefined {
  const store = loadStore()
  return (store.territories || []).find((t) => t.slug === slug.toLowerCase())
}

export function getTerritoryByDomain(domain: string): Territory | undefined {
  const store = loadStore()
  const clean = domain.split(':')[0].toLowerCase().trim()
  // Check primary domain or registered territory domains
  const foundInDomains = (store.territoryDomains || []).find((d) => d.domain === clean && d.isVerified)
  if (foundInDomains) {
    return getTerritory(foundInDomains.territoryId)
  }
  return (store.territories || []).find((t) => t.primaryDomain === clean || t.subdomain === clean)
}

export function getFranchise(franchiseId: string): Franchise | undefined {
  const store = loadStore()
  return (store.franchises || []).find((f) => f.id === franchiseId)
}

export function getFranchiseByTerritory(territoryId: string): Franchise | undefined {
  const store = loadStore()
  return (store.franchises || []).find((f) => f.territoryId === territoryId)
}

const SENSITIVE_KEY_REGEX = /(password|token|secret|cookie|auth|session|credential|key|authorization)/i

function sanitizeAuditMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined
  const cleaned: Record<string, any> = {}
  for (const [key, val] of Object.entries(metadata)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      cleaned[key] = '[REDACTED_SECRET]'
      continue
    }
    if (typeof val === 'string' && val.length > 2000) {
      cleaned[key] = val.slice(0, 2000) + '...[TRUNCATED]'
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      cleaned[key] = sanitizeAuditMetadata(val)
    } else {
      cleaned[key] = val
    }
  }
  return cleaned
}

export function logAuditEvent(params: {
  actorId: string
  actorName: string
  actorRole: 'SUPER_ADMIN' | 'PLATFORM_OPERATOR' | 'FRANCHISE_ADMIN' | 'FRANCHISE_STAFF' | 'MERCHANT' | 'USER' | 'SYSTEM'
  action: string
  details: string
  entityType?: 'listing' | 'contact' | 'staff' | 'flow' | 'deal' | 'broadcast' | 'setting' | 'monetization' | 'approval' | 'government_contact' | 'security' | string
  entityId?: string
  outcome?: 'SUCCESS' | 'FAILURE'
  requestId?: string
  territoryId?: string
  metadata?: Record<string, any>
  ipAddress?: string
  inStore?: AdminDataStore
  customPath?: string
}): AuditLog {
  const store = params.inStore || loadStore(params.customPath)
  const log: AuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    actorId: params.actorId || 'SYSTEM',
    actorName: params.actorName || 'System Service',
    actorRole: params.actorRole || 'SYSTEM',
    territoryId: params.territoryId,
    action: params.action,
    details: params.details,
    entityType: params.entityType,
    entityId: params.entityId,
    outcome: params.outcome || 'SUCCESS',
    requestId: params.requestId,
    metadata: sanitizeAuditMetadata(params.metadata),
    ipAddress: params.ipAddress,
    createdAt: new Date().toISOString(),
    timestamp: new Date().toISOString(),
  }
  if (!store.auditLogs) store.auditLogs = []
  store.auditLogs.unshift(log)
  // Retain last 2,000 logs in memory store
  if (store.auditLogs.length > 2000) {
    store.auditLogs = store.auditLogs.slice(0, 2000)
  }
  if (!params.inStore) {
    saveStore(store, params.customPath)
  }
  return log
}

export interface GetAuditLogsOptions {
  page?: number
  pageSize?: number
  territoryId?: string
  isSuperAdmin?: boolean
  action?: string
  actorId?: string
  entityType?: string
  outcome?: 'SUCCESS' | 'FAILURE' | 'ALL'
  startDate?: string
  endDate?: string
  search?: string
}

export interface PaginatedAuditLogs {
  logs: AuditLog[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function getAuditLogs(options: GetAuditLogsOptions = {}): PaginatedAuditLogs {
  const store = loadStore()
  let list = store.auditLogs || []

  // 1. Territory filtering:
  // If not super admin, strictly filter to user's assigned territoryId
  if (!options.isSuperAdmin && options.territoryId) {
    list = list.filter((l) => (l.territoryId || FLAGSHIP_TERRITORY_ID) === options.territoryId)
  } else if (options.territoryId && options.territoryId !== 'ALL') {
    list = list.filter((l) => (l.territoryId || FLAGSHIP_TERRITORY_ID) === options.territoryId)
  }

  // 2. Action filter
  if (options.action && options.action !== 'ALL') {
    list = list.filter((l) => l.action.toLowerCase() === options.action!.toLowerCase())
  }

  // 3. EntityType filter
  if (options.entityType && options.entityType !== 'ALL') {
    list = list.filter((l) => (l.entityType || '').toLowerCase() === options.entityType!.toLowerCase())
  }

  // 4. Outcome filter (Backwards-compatible: default legacy records to SUCCESS)
  if (options.outcome && options.outcome !== 'ALL') {
    list = list.filter((l) => {
      const outcome = l.outcome || 'SUCCESS'
      return outcome === options.outcome
    })
  }

  // 5. Actor filter
  if (options.actorId && options.actorId !== 'ALL') {
    list = list.filter((l) => l.actorId === options.actorId || l.actorName === options.actorId)
  }

  // 6. Date Range filter
  if (options.startDate) {
    const startMs = new Date(options.startDate).getTime()
    if (!isNaN(startMs)) {
      list = list.filter((l) => new Date(l.createdAt || l.timestamp || 0).getTime() >= startMs)
    }
  }
  if (options.endDate) {
    const endMs = new Date(options.endDate).getTime()
    if (!isNaN(endMs)) {
      list = list.filter((l) => new Date(l.createdAt || l.timestamp || 0).getTime() <= endMs)
    }
  }

  // 7. Search keyword
  if (options.search) {
    const q = options.search.toLowerCase().trim()
    list = list.filter(
      (l) =>
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.details && l.details.toLowerCase().includes(q)) ||
        (l.actorName && l.actorName.toLowerCase().includes(q)) ||
        (l.entityId && l.entityId.toLowerCase().includes(q)) ||
        (l.id && l.id.toLowerCase().includes(q))
    )
  }

  const total = list.length
  const page = Math.max(1, options.page || 1)
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 25))
  const totalPages = Math.ceil(total / pageSize) || 1
  const startIdx = (page - 1) * pageSize
  const paginatedLogs = list.slice(startIdx, startIdx + pageSize)

  return {
    logs: paginatedLogs,
    total,
    page,
    pageSize,
    totalPages,
  }
}

// --------------------------------------------------------------------------
// Seed Initial Data Builders
// --------------------------------------------------------------------------

function getInitialSampleTerritories(): Territory[] {
  return [
    {
      id: 'territory_suryapet',
      name: 'Suryapet Town & Municipality',
      slug: 'suryapet',
      type: 'franchise_operated',
      status: 'active',
      district: 'Suryapet',
      state: 'Telangana',
      pincodes: ['508213'],
      localities: ['Kudakuda', 'Old Bus Stand', 'Kammavarigudem', 'Barlapenta', 'Vidyanagar'],
      primaryDomain: 'suryapet.choutuppal.in',
      isFlagship: false,
      branding: {
        primaryColor: '#0ea5e9',
        tagline: 'Suryapet Local Business Hub',
        heroTitle: 'సూర్యాపేట లోకల్ బిజినెస్ & సర్వీసెస్',
      },
      contactPhone: '9848077665',
      whatsappNumber: '9848077665',
      createdAt: '2026-10-20T00:00:00.000Z',
      updatedAt: '2026-10-25T00:00:00.000Z',
    },
    {
      id: 'territory_bhongir',
      name: 'Bhongir (Bhuvanagiri) Town & Fort',
      slug: 'bhongir',
      type: 'franchise_operated',
      status: 'active',
      district: 'Yadadri Bhuvanagiri',
      state: 'Telangana',
      pincodes: ['508116'],
      localities: ['Fort Road', 'Gunj Area', 'Subhash Nagar', 'Rayagiri', 'Hanumanwada'],
      primaryDomain: 'bhongir.choutuppal.in',
      isFlagship: false,
      branding: {
        primaryColor: '#10b981',
        tagline: 'Bhongir Town SuperApp',
        heroTitle: 'భువనగిరి బిజినెస్ డైరెక్టరీ & సేవలు',
      },
      contactPhone: '9908899488',
      whatsappNumber: '9908899488',
      createdAt: '2026-10-15T00:00:00.000Z',
      updatedAt: '2026-10-25T00:00:00.000Z',
    },
  ]
}

function getInitialSampleFranchises(): Franchise[] {
  return [
    {
      id: 'fr_suryapet_01',
      territoryId: 'territory_suryapet',
      territoryName: 'Suryapet Town',
      territorySlug: 'suryapet',
      name: 'Suryapet SuperApp Franchise',
      applicantName: 'Maheshwar Reddy',
      applicantPhone: '9848077665',
      email: 'suryapet.superapp@gmail.com',
      experience: '5 Years Retail & Tech',
      status: 'approved_pending_setup',
      planTier: 'PRO',
      featureLimits: {
        maxListings: 1000,
        maxStaff: 8,
        maxMonthlyBroadcasts: 2500,
        customDomainAllowed: true,
        aiChatEnabled: true,
      },
      commercialModel: {
        type: 'setup_recurring',
        setupFee: 35000,
        monthlyFee: 7500,
        revSharePct: 25,
        currency: 'INR',
      },
      assignedDomain: 'suryapet.choutuppal.in',
      createdAt: '2026-10-24T10:00:00.000Z',
      updatedAt: '2026-10-25T12:00:00.000Z',
    },
    {
      id: 'fr_bhongir_01',
      territoryId: 'territory_bhongir',
      territoryName: 'Bhongir Mandal',
      territorySlug: 'bhongir',
      name: 'Bhongir Fort & Town SuperApp',
      applicantName: 'Srinivas Goud',
      applicantPhone: '9908899488',
      email: 'bhongir.app@gmail.com',
      experience: 'Local media distributor',
      status: 'active',
      planTier: 'STARTER',
      featureLimits: {
        maxListings: 500,
        maxStaff: 4,
        maxMonthlyBroadcasts: 1000,
        customDomainAllowed: false,
        aiChatEnabled: true,
      },
      commercialModel: {
        type: 'fixed',
        setupFee: 25000,
        monthlyFee: 5000,
        revSharePct: 20,
        currency: 'INR',
      },
      assignedDomain: 'bhongir.choutuppal.in',
      activatedAt: '2026-10-21T09:00:00.000Z',
      createdAt: '2026-10-20T11:00:00.000Z',
      updatedAt: '2026-10-21T09:00:00.000Z',
    },
  ]
}

export function getInitialSampleDeals(): CRMDeal[] {
  return [
    {
      id: 'deal_1',
      title: 'Sri Sai Ram Automobiles',
      description: 'Annual local search banner & WhatsApp lead generation pack',
      value: 1500,
      currency: 'INR',
      stage: 'WON',
      status: 'WON',
      phone: '9848012345',
      territoryId: FLAGSHIP_TERRITORY_ID,
      tag: 'Automobile',
      notes: 'Active paying advertiser since Jan 2026',
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-10-25T12:00:00.000Z',
    },
    {
      id: 'deal_2',
      title: 'Yadadri Mega Township Open Plots',
      description: 'Real estate featured sponsored listings and direct WhatsApp inquiries',
      value: 5000,
      currency: 'INR',
      stage: 'WON',
      status: 'WON',
      phone: '9848099887',
      territoryId: FLAGSHIP_TERRITORY_ID,
      tag: 'RealEstate',
      notes: 'Monthly recurring real estate partner',
      createdAt: '2026-02-10T11:00:00.000Z',
      updatedAt: '2026-10-25T12:00:00.000Z',
    },
    {
      id: 'deal_3',
      title: 'Balaji Health Clinic',
      description: 'Emergency healthcare directory listing verification & doctor schedule banner',
      value: 1000,
      currency: 'INR',
      stage: 'QUALIFIED',
      status: 'OPEN',
      phone: '9440155443',
      territoryId: FLAGSHIP_TERRITORY_ID,
      tag: 'Health',
      notes: 'Follow up after Sunday clinic hours',
      createdAt: '2026-03-01T09:00:00.000Z',
      updatedAt: '2026-10-25T12:00:00.000Z',
    },
    {
      id: 'deal_4',
      title: 'Choutuppal MeeSeva & Xerox',
      description: 'Citizen services portal listing upgrade and student stationery discount campaign',
      value: 500,
      currency: 'INR',
      stage: 'NEW_LEAD',
      status: 'OPEN',
      phone: '9988776655',
      territoryId: FLAGSHIP_TERRITORY_ID,
      tag: 'Internet',
      notes: 'Sent introductory brochure via WhatsApp',
      createdAt: '2026-04-05T14:00:00.000Z',
      updatedAt: '2026-10-25T12:00:00.000Z',
    },
  ]
}

function getFallbackStore(): AdminDataStore {
  return {
    territories: [FLAGSHIP_CHOUTUPPAL_TERRITORY, ...getInitialSampleTerritories()],
    franchises: getInitialSampleFranchises(),
    franchiseStaff: [],
    territoryDomains: [
      {
        id: 'dom_choutuppal_main',
        territoryId: FLAGSHIP_TERRITORY_ID,
        domain: 'choutuppal.in',
        type: 'PRIMARY',
        isVerified: true,
        sslStatus: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    auditLogs: [],
    listings: [],
    contacts: [],
    deals: getInitialSampleDeals(),
    flows: [],
    automations: [],
    approvals: [],
    stories: [],
    offers: [],
    news: [],
    shorts: [],
    banners: [],
    tickers: [],
    users: [],
    messages: [],
    magicTokens: [],
    plans: getDefaultListingPlans(),
    subscriptions: [],
    featuredPromotions: [],
    orders: [],
    payments: [],
    webhookEvents: [],
    governmentContacts: getDefaultGovernmentContacts(),
    settings: {
      whatsappToken: '',
      whatsappPhoneNumberId: '',
      whatsappVerifyToken: 'choutuppal_verify_token',
      syncListingsToCrmFlow: true,
      autoSendListingPhotoInChat: true,
    },
  }
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

export function generateMagicToken(
  phoneOrParams: string | { phone: string; territoryId?: string; role?: string }
): string {
  const store = loadStore()
  const phone = typeof phoneOrParams === 'string' ? phoneOrParams : phoneOrParams.phone
  const territoryId = typeof phoneOrParams === 'object' ? phoneOrParams.territoryId : undefined
  const role = typeof phoneOrParams === 'object' ? phoneOrParams.role : undefined

  // Cryptographically secure random token (256-bit entropy via crypto.randomBytes)
  const rawToken = `mlk_${crypto.randomBytes(32).toString('hex')}`
  const tokenHash = hashToken(rawToken)
  const expiresAt = Date.now() + 15 * 60 * 1000 // 15 mins

  if (!store.magicTokens) store.magicTokens = []

  // Clean expired or consumed tokens (retention cleanup)
  store.magicTokens = store.magicTokens.filter((t) => t.expiresAt > Date.now() && !t.used)

  store.magicTokens.push({
    tokenHash,
    phone,
    territoryId: territoryId || (phone === '9441348175' ? FLAGSHIP_TERRITORY_ID : undefined),
    role: role || (phone === '9441348175' ? 'SUPER_ADMIN' : 'FRANCHISE_ADMIN'),
    expiresAt,
    used: false,
    createdAt: new Date().toISOString(),
  } as any)

  saveStore(store)
  return rawToken
}

export function verifyMagicToken(rawToken: string): {
  valid: boolean
  phone?: string
  territoryId?: string
  role?: string
  error?: string
} {
  const store = loadStore()
  if (!rawToken || typeof rawToken !== 'string') {
    return { valid: false, error: 'Token is required' }
  }

  const incomingHash = hashToken(rawToken)

  // Find strictly by cryptographically hashed token
  const item = (store.magicTokens || []).find(
    (t: any) => t.tokenHash === incomingHash
  )

  if (!item) {
    return { valid: false, error: 'Invalid or unrecognized token' }
  }

  if (item.used) {
    return { valid: false, error: 'This single-use magic login link has already been consumed' }
  }

  if (item.expiresAt < Date.now()) {
    return { valid: false, error: 'Magic login link has expired (15-minute validity)' }
  }

  // Atomically mark as used
  item.used = true
  saveStore(store)

  return {
    valid: true,
    phone: item.phone,
    territoryId: (item as any).territoryId,
    role: (item as any).role,
  }
}

