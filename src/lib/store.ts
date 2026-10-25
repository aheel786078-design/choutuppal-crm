import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import {
  Territory,
  Franchise,
  FranchiseStaff,
  TerritoryDomain,
  AuditLog,
  Listing,
  CRMContact,
  CRMFlowConfig,
  ApprovalItem,
  UserStory,
  UserOffer,
  NewsItem,
  ShortItem,
  BannerItem,
  TickerItem,
  AppUser,
  WhatsAppMessage,
} from './types'
import { STANDARD_CATEGORIES, STANDARD_VILLAGES, PRESET_PHOTO_COVERS } from './constants'

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

interface AdminDataStore {
  territories: Territory[]
  franchises: Franchise[]
  franchiseStaff: FranchiseStaff[]
  territoryDomains: TerritoryDomain[]
  auditLogs: AuditLog[]
  listings: Listing[]
  contacts: CRMContact[]
  flows: CRMFlowConfig[]
  approvals: ApprovalItem[]
  stories: UserStory[]
  offers: UserOffer[]
  news: NewsItem[]
  shorts: ShortItem[]
  banners: BannerItem[]
  tickers: TickerItem[]
  users: AppUser[]
  messages: WhatsAppMessage[]
  magicTokens: Array<{ token: string; phone: string; expiresAt: number; used: boolean }>
  settings: {
    whatsappToken: string
    whatsappPhoneNumberId: string
    whatsappVerifyToken: string
    syncListingsToCrmFlow: boolean
    autoSendListingPhotoInChat: boolean
  }
}

const DATA_FILE = path.join(process.cwd(), 'data', 'admin_data.json')

export function loadStore(): AdminDataStore {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return getFallbackStore()
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
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
    if (!parsed.magicTokens) parsed.magicTokens = []

    return parsed as AdminDataStore
  } catch (err) {
    console.error('[Admin Store] Read error:', err)
    return getFallbackStore()
  }
}

export function saveStore(store: AdminDataStore): void {
  try {
    const dir = path.dirname(DATA_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8')
  } catch (err) {
    console.error('[Admin Store] Save error:', err)
  }
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

export function logAuditEvent(params: {
  actorId: string
  actorName: string
  actorRole: 'SUPER_ADMIN' | 'PLATFORM_OPERATOR' | 'FRANCHISE_ADMIN' | 'SYSTEM'
  action: string
  details: string
  territoryId?: string
  metadata?: Record<string, any>
  ipAddress?: string
}): AuditLog {
  const store = loadStore()
  const log: AuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    territoryId: params.territoryId,
    action: params.action,
    details: params.details,
    metadata: params.metadata,
    ipAddress: params.ipAddress,
    createdAt: new Date().toISOString(),
  }
  if (!store.auditLogs) store.auditLogs = []
  store.auditLogs.unshift(log)
  // Retain last 1,000 logs in memory store
  if (store.auditLogs.length > 1000) {
    store.auditLogs = store.auditLogs.slice(0, 1000)
  }
  saveStore(store)
  return log
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
    flows: [],
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

