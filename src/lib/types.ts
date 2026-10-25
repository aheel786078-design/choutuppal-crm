export interface Category {
  id: string
  name: string
  telugu: string
  slug: string
  icon: string
  description: string
}

export interface Village {
  id: string
  name: string
  slug: string
  district: string
  state: string
  pincode: string
}

// --------------------------------------------------------------------------
// Multi-Tenant Territory & Franchise Architecture
// --------------------------------------------------------------------------

export type TerritoryType = 'company_owned' | 'franchise_operated'
export type TerritoryStatus = 'active' | 'suspended' | 'maintenance'

export interface Territory {
  id: string // e.g., 'territory_choutuppal'
  name: string // 'Choutuppal Town & Mandal'
  slug: string // 'choutuppal'
  type: TerritoryType
  status: TerritoryStatus
  district: string // 'Yadadri Bhuvanagiri'
  state: string // 'Telangana'
  pincodes: string[]
  localities: string[]
  primaryDomain: string // 'choutuppal.in'
  subdomain?: string // 'choutuppal.choutuppal.in'
  isFlagship: boolean // true for Choutuppal
  immutable?: boolean // protected flagship cannot be deleted
  branding: {
    logoUrl?: string
    primaryColor: string
    tagline: string
    heroTitle: string
    teluguTitle?: string
  }
  contactPhone: string
  whatsappNumber: string
  createdAt: string
  updatedAt: string
}

export type FranchiseStatus =
  | 'application_submitted'
  | 'under_review'
  | 'approved_pending_setup'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'closed'
  | 'rejected'

export interface FranchiseCommercialModel {
  type: 'fixed' | 'setup_recurring' | 'rev_share' | 'hybrid'
  setupFee: number
  monthlyFee: number
  revSharePct: number
  currency: string
}

export interface FranchiseFeatureLimits {
  maxListings: number
  maxStaff: number
  maxMonthlyBroadcasts: number
  customDomainAllowed: boolean
  aiChatEnabled: boolean
}

export interface Franchise {
  id: string
  territoryId: string
  territoryName: string
  territorySlug: string
  name: string
  applicantName: string
  applicantPhone: string
  email: string
  experience: string
  status: FranchiseStatus
  ownerUserId?: string
  planTier: 'STARTER' | 'PRO' | 'ENTERPRISE' | 'FLAGSHIP'
  featureLimits: FranchiseFeatureLimits
  commercialModel: FranchiseCommercialModel
  assignedDomain?: string
  notes?: string
  activatedAt?: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface TerritoryDomain {
  id: string
  territoryId: string
  domain: string
  type: 'PRIMARY' | 'SUBDOMAIN' | 'ALIAS'
  isVerified: boolean
  sslStatus: 'active' | 'pending' | 'failed'
  createdAt: string
}

export interface FranchiseStaff {
  id: string
  franchiseId: string
  territoryId: string
  userId: string
  name: string
  phone: string
  email: string
  role: 'FRANCHISE_ADMIN' | 'FRANCHISE_REVIEWER' | 'FRANCHISE_STAFF'
  permissions: string[]
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED'
  createdAt: string
}

export interface AuditLog {
  id: string
  actorId: string
  actorName: string
  actorRole: 'SUPER_ADMIN' | 'PLATFORM_OPERATOR' | 'FRANCHISE_ADMIN' | 'SYSTEM'
  territoryId?: string
  action: string
  details: string
  metadata?: Record<string, any>
  ipAddress?: string
  createdAt: string
}

// --------------------------------------------------------------------------
// Core Directory & Business Entities
// --------------------------------------------------------------------------

export type ListingStatus =
  | 'published'
  | 'approved'
  | 'pending_approval'
  | 'changes_requested'
  | 'rejected'
  | 'paused'
  | 'draft'
  | 'archived'
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED'

export interface Listing {
  id: string
  slug: string
  title: string
  description: string
  status: ListingStatus
  type: 'BUSINESS' | 'SERVICE' | 'REAL_ESTATE'
  isFeatured: boolean
  isPremium: boolean
  coverImage: string
  logo?: string
  gallery: string[]
  phone: string
  secondaryPhone?: string
  whatsapp: string
  email?: string
  website?: string
  address: string
  location?: string
  price?: string
  categoryId: string
  categoryName?: string
  villageId: string
  villageName?: string
  territoryId: string // e.g. 'territory_choutuppal'
  franchiseId?: string
  views: number
  clicks: number
  whatsappClicks: number
  syncedToCrm: boolean
  crmLeadId?: string
  createdAt: string
  updatedAt: string
}

export interface CRMContact {
  id: string
  name: string
  phone: string
  email?: string
  tags: string[]
  stage: 'NEW_LEAD' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST'
  territoryId: string
  franchiseId?: string
  listingId?: string
  listingTitle?: string
  notes?: string
  messageCount: number
  lastMessage?: string
  lastContactAt: string
  createdAt: string
}

export interface CRMFlowConfig {
  id: string
  name: string
  triggerKeyword: string
  isActive: boolean
  description: string
  territoryId?: string // Optional: undefined means global template, or scoped to territory
  type: 'CATEGORY_BUTTONS' | 'LISTINGS_WITH_PHOTOS' | 'WELCOME_MENU' | 'AUTO_REPLY'
  sendPhotos: boolean
  actionButtons: Array<{ id: string; title: string; action: string }>
  categoriesOrder: string[]
  createdAt: string
}

export interface ApprovalItem {
  id: string
  type: 'NEW_LISTING' | 'LISTING_EDIT' | 'STORY' | 'OFFER' | 'FRANCHISE_APP' | 'CITIZEN_REPORT'
  title: string
  submitterName: string
  submitterPhone: string
  territoryId: string
  franchiseId?: string
  status: 'pending' | 'approved' | 'changes_requested' | 'rejected'
  data: any
  mediaUrl?: string
  adminNotes?: string
  submittedAt: string
  reviewedAt?: string
}

export interface UserStory {
  id: string
  businessId: string
  businessName: string
  ownerPhone: string
  mediaUrl: string
  caption: string
  territoryId: string
  franchiseId?: string
  status: 'pending_approval' | 'published' | 'expired' | 'rejected'
  expiresAt: string
  createdAt: string
}

export interface UserOffer {
  id: string
  businessId: string
  businessName: string
  ownerPhone: string
  title: string
  discount: string
  imageUrl?: string
  terms: string
  territoryId: string
  franchiseId?: string
  startDate: string
  endDate: string
  status: 'pending_approval' | 'published' | 'expired' | 'rejected'
  createdAt: string
}

export interface NewsItem {
  id: string
  slug: string
  title: string
  teluguTitle?: string
  summary: string
  content: string
  coverImage: string
  category: string
  territoryId: string
  isPublished: boolean
  views: number
  createdAt: string
}

export interface ShortItem {
  id: string
  title: string
  videoUrl: string
  thumbnailUrl: string
  tags: string[]
  territoryId: string
  views: number
  isActive: boolean
  createdAt: string
}

export interface BannerItem {
  id: string
  title: string
  imageUrl: string
  linkUrl: string
  type: 'TOP_BANNER' | 'POPUP' | 'STORY' | 'IN_FEED'
  territoryId: string
  isActive: boolean
  clicks: number
  impressions: number
  startDate: string
  endDate?: string
}

export interface TickerItem {
  id: string
  text: string
  linkUrl?: string
  priority: number
  territoryId: string
  isActive: boolean
  createdAt: string
}

export type UserRole =
  | 'SUPER_ADMIN'
  | 'PLATFORM_OPERATOR'
  | 'FRANCHISE_ADMIN'
  | 'FRANCHISE_REVIEWER'
  | 'FRANCHISE_STAFF'
  | 'MERCHANT'
  | 'USER'

export interface AppUser {
  id: string
  name: string
  phone: string
  email: string
  role: UserRole
  territoryId?: string // Scoped territory
  franchiseId?: string
  isBanned: boolean
  listingsCount: number
  createdAt: string
}

export interface WhatsAppMessage {
  id: string
  phone: string
  contactName?: string
  direction: 'inbound' | 'outbound'
  messageText: string
  imageUrl?: string
  territoryId: string
  status: 'sent' | 'delivered' | 'read' | 'received' | 'failed'
  createdAt: string
}
