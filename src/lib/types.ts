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

export type PlanTier = 'STARTER' | 'PRO' | 'ENTERPRISE' | 'FLAGSHIP'

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
  planTier: PlanTier
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
  actorRole: 'SUPER_ADMIN' | 'PLATFORM_OPERATOR' | 'FRANCHISE_ADMIN' | 'FRANCHISE_STAFF' | 'MERCHANT' | 'USER' | 'SYSTEM'
  territoryId?: string
  action: string
  details: string
  entityType?: 'listing' | 'contact' | 'staff' | 'flow' | 'deal' | 'broadcast' | 'setting' | 'monetization' | 'approval' | 'government_contact' | 'security' | string
  entityId?: string
  outcome?: 'SUCCESS' | 'FAILURE'
  requestId?: string
  metadata?: Record<string, any>
  ipAddress?: string
  createdAt: string
  timestamp?: string
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
  businessName?: string
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

export type DealStage = 'NEW_LEAD' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST'

export interface CRMDeal {
  id: string
  title: string
  description?: string
  value: number
  currency: string
  stage: DealStage
  status: 'OPEN' | 'WON' | 'LOST'
  phone?: string
  contactId?: string
  contactName?: string
  territoryId: string
  franchiseId?: string
  assignedStaffId?: string
  assignedStaffName?: string
  expectedCloseDate?: string
  nextFollowUpDate?: string
  tag?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type AutomationTriggerType =
  | 'keyword_match'
  | 'first_inbound_message'
  | 'time_based'
  | string

export type AutomationActionType =
  | 'send_message'
  | 'add_tag'
  | string

export type AutomationRuleStatus = 'draft' | 'active' | 'paused' | 'disabled'

export interface AutomationRule {
  id: string
  name: string
  triggerType: AutomationTriggerType
  triggerValue: string
  actionType: AutomationActionType
  actionValue: string
  description?: string
  templateSlug?: string
  territoryId: string
  isGlobal?: boolean
  status: AutomationRuleStatus
  isActive?: boolean
  isSupported?: boolean
  unsupportedReason?: string
  executionCount?: number
  lastExecutedAt?: string
  createdAt: string
  updatedAt: string
}

export type FlowStatus = 'draft' | 'published' | 'paused' | 'archived'

export type FlowNodeType =
  | 'start'
  | 'send_message'
  | 'send_buttons'
  | 'send_list'
  | 'send_media'
  | 'send_listing'
  | 'condition'
  | 'add_tag'
  | 'update_stage'
  | 'end'

export interface FlowButton {
  id: string
  title: string
  nextNodeId?: string
  action?: string
  payload?: string
}

export interface FlowListRow {
  id: string
  title: string
  description?: string
  nextNodeId?: string
}

export interface FlowListSection {
  title: string
  rows: FlowListRow[]
}

export type ListingSortMode = 'manual' | 'category_priority' | 'newest' | 'alphabetical' | 'featured'

export interface FlowNodeConfig {
  text?: string
  headerText?: string
  footerText?: string
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'document'
  buttons?: FlowButton[]
  listSections?: FlowListSection[]
  listButtonText?: string
  listingId?: string
  listingCategory?: string
  listingSlug?: string
  listingSortMode?: ListingSortMode
  listingSortOrder?: string[]
  categoryPriority?: string[]
  listingPageSize?: number
  listingPage?: number
  nextNodeId?: string
  tagToAdd?: string
  stageToUpdate?: string
  conditionField?: string
  conditionOperator?: 'equals' | 'contains' | 'starts_with'
  conditionValue?: string
  trueNextNodeId?: string
  falseNextNodeId?: string
  [key: string]: any
}

export interface FlowNode {
  id: string
  type: FlowNodeType
  name?: string
  config: FlowNodeConfig
  positionX?: number
  positionY?: number
}

export interface FlowTrigger {
  type: 'keyword' | 'exact_match' | 'button_payload' | 'first_inbound' | 'default_fallback'
  value: string
  territoryId?: string
}

export interface WhatsAppFlow {
  id: string
  name: string
  description?: string
  status: FlowStatus
  territoryId?: string
  version: number
  triggers: FlowTrigger[]
  nodes: FlowNode[]
  entryNodeId?: string
  initial_message?: string
  imageUrl?: string
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'document' | string
  listingId?: string
  template_slug?: string
  trigger_type?: string
  trigger_keywords?: string[]
  button_options?: string[]
  listingSortMode?: ListingSortMode
  listingSortOrder?: string[]
  categoryPriority?: string[]
  listingPageSize?: number
  // Backward compatibility with legacy CRMFlowConfig
  triggerKeyword?: string
  isActive?: boolean
  type?: 'CATEGORY_BUTTONS' | 'LISTINGS_WITH_PHOTOS' | 'WELCOME_MENU' | 'AUTO_REPLY' | string
  sendPhotos?: boolean
  actionButtons?: Array<{ id: string; title: string; action: string }>
  categoriesOrder?: string[]
  executionCount?: number
  lastExecutedAt?: string
  createdAt: string
  updatedAt?: string
}

export type CRMFlowConfig = WhatsAppFlow

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
  providerMessageId?: string
  assignedStaffId?: string
  assignedStaffName?: string
  createdAt: string
}

export interface ConversationSummary {
  phone: string
  contactName: string
  territoryId: string
  lastMessage: string
  lastMessageAt: string
  lastDirection: 'inbound' | 'outbound'
  unreadCount: number
  totalMessages: number
  assignedStaffId?: string
  assignedStaffName?: string
}

export interface BroadcastCampaign {
  id: string
  title: string
  message: string
  imageUrl?: string
  targetAudience: 'ALL' | 'REAL_ESTATE' | 'MERCHANTS' | string
  territoryId: string
  status: 'staged' | 'sending' | 'completed' | 'cancelled'
  matchedRecipients: number
  createdAt: string
  stagedBy?: string
}

// --------------------------------------------------------------------------
// Phase 10: Monetization, Plans, Subscriptions, Promotions & Payments
// --------------------------------------------------------------------------

export type PlanType = 'premium' | 'featured' | 'bundle'
export type BillingInterval = 'monthly' | 'annual' | 'one_time' | 'fixed_duration'

export interface ListingPlan {
  id: string
  name: string
  type: PlanType
  price: number
  currency: string // 'INR'
  billingInterval: BillingInterval
  durationDays: number
  features: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'cancelled' | 'suspended'

export interface ListingSubscription {
  id: string
  listingId: string
  territoryId: string
  tenantId?: string
  planId: string
  status: SubscriptionStatus
  startsAt: string
  expiresAt: string
  autoRenew: boolean
  orderId?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type PromotionStatus = 'pending' | 'scheduled' | 'active' | 'expired' | 'cancelled' | 'suspended'

export interface FeaturedPromotion {
  id: string
  listingId: string
  territoryId: string
  tenantId?: string
  status: PromotionStatus
  startsAt: string
  expiresAt: string
  placement?: string // 'category' | 'home' | 'all'
  categoryId?: string
  priority: number // higher number = higher priority
  orderId?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type PaymentOrderStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'

export interface PaymentOrder {
  id: string
  listingId: string
  planId: string
  amount: number
  currency: string
  status: PaymentOrderStatus
  gateway: string // 'mock_gateway' | 'razorpay'
  gatewayOrderId?: string
  idempotencyKey: string
  territoryId: string
  ownerPhone?: string
  manualVerificationNotes?: string
  createdAt: string
  updatedAt: string
}

export type PaymentTransactionStatus =
  | 'pending'
  | 'verified'
  | 'failed'
  | 'refunded'
  | 'manually_verified'

export interface PaymentTransaction {
  id: string
  orderId: string
  gatewayPaymentId: string
  amount: number
  currency: string
  status: PaymentTransactionStatus
  verifiedAt?: string
  failureReasonCode?: string
  paymentMethod?: string
  rawSignature?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface WebhookEvent {
  id: string
  eventId: string
  gateway: string
  eventType: string
  status: 'processed' | 'ignored' | 'failed'
  receivedAt: string
  payloadSummary?: Record<string, any>
}

export interface ListingEntitlements {
  listingId: string
  isPremium: boolean
  isFeatured: boolean
  activeSubscription: ListingSubscription | null
  activePromotion: FeaturedPromotion | null
  eligibleForWebsite: boolean
  eligibleForWhatsApp: boolean
  featuredPriority: number
  reasons: string[]
  expiringSoon: boolean
}

// --------------------------------------------------------------------------
// Government Emergency & Local Leaders Directory Architecture
// --------------------------------------------------------------------------

export type GovtContactCategory =
  | 'emergency_helpline'
  | 'police'
  | 'fire_rescue'
  | 'ambulance_health'
  | 'electricity_utilities'
  | 'municipal_panchayat'
  | 'revenue_tahsildar'
  | 'mandal_offices'
  | 'elected_representatives'
  | 'ward_representatives'
  | 'village_public_offices'
  | 'other_public_services'

export type GovtContactStatus =
  | 'draft'
  | 'pending_verification'
  | 'verified'
  | 'published'
  | 'archived'

export type GovtSourceType =
  | 'official_website'
  | 'official_document'
  | 'authorized_confirmation'
  | 'other'

export interface GovernmentContact {
  id: string
  name: string
  designation: string
  category: GovtContactCategory
  subcategory?: string

  phoneNumber?: string
  alternatePhoneNumber?: string
  email?: string
  officeAddress?: string

  district: string
  mandal: string
  village?: string
  ward?: string

  officeHours?: string
  availability?: '24x7' | 'office_hours' | 'unknown'

  sourceType: GovtSourceType
  sourceUrl?: string
  sourceReference?: string
  verifiedAt?: string
  verificationDueAt?: string
  verifiedBy?: string

  status: GovtContactStatus
  isEmergency: boolean
  isPublicContact: boolean
  displayOrder: number

  territoryId: string
  notes?: string

  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

export interface GovtContactCategoryMeta {
  id: GovtContactCategory
  name: string
  telugu: string
  icon: string
  description: string
  displayOrder: number
}

export interface AdminDataStore {
  territories: Territory[]
  franchises: Franchise[]
  franchiseStaff: FranchiseStaff[]
  territoryDomains: TerritoryDomain[]
  auditLogs: AuditLog[]
  listings: Listing[]
  contacts: CRMContact[]
  deals: CRMDeal[]
  flows: WhatsAppFlow[]
  automations: AutomationRule[]
  approvals: ApprovalItem[]
  stories: UserStory[]
  offers: UserOffer[]
  news: NewsItem[]
  shorts: ShortItem[]
  banners: BannerItem[]
  tickers: TickerItem[]
  users: AppUser[]
  messages: WhatsAppMessage[]
  broadcasts?: BroadcastCampaign[]
  magicTokens: Array<{ token: string; phone: string; expiresAt: number; used: boolean }>
  plans?: ListingPlan[]
  subscriptions?: ListingSubscription[]
  featuredPromotions?: FeaturedPromotion[]
  orders?: PaymentOrder[]
  payments?: PaymentTransaction[]
  webhookEvents?: WebhookEvent[]
  governmentContacts?: GovernmentContact[]
  settings: {
    whatsappToken: string
    whatsappPhoneNumberId: string
    whatsappVerifyToken: string
    syncListingsToCrmFlow: boolean
    autoSendListingPhotoInChat: boolean
  }
}

// --------------------------------------------------------------------------
// System Health & Dashboard Types
// --------------------------------------------------------------------------

export type HealthStatusLabel =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'MOCK'
  | 'NOT_CONFIGURED'
  | 'NOT_VERIFIED'
  | 'ERROR'

export interface SystemHealthReport {
  timestamp: string
  app: {
    status: 'HEALTHY' | 'DEGRADED' | 'ERROR'
    uptimeSeconds: number
    nodeVersion: string
    memoryUsageMB: {
      rss: number
      heapTotal: number
      heapUsed: number
    }
    environment: string
  }
  storage: {
    status: 'CONNECTED' | 'ERROR'
    type: 'LOCAL_JSON'
    storePath: string
    readable: boolean
    writable: boolean
    parseable: boolean
    fileSizeBytes: number
    sha256Hash: string
    lastModified: string
    recordCounts: {
      listings: number
      contacts: number
      deals: number
      franchises: number
      territories: number
      automations: number
      orders: number
      subscriptions: number
      governmentContacts: number
    }
    error?: string
  }
  integrations: {
    whatsappCloudApi: {
      status: HealthStatusLabel
      phoneNumberIdConfigured: boolean
      tokenConfigured: boolean
      syncListingsConfigured: boolean
      details: string
    }
    r2Storage: {
      status: HealthStatusLabel
      details: string
    }
    paymentGateway: {
      status: HealthStatusLabel
      activeAdapter: string
      details: string
    }
  }
  automations: {
    totalRules: number
    activeRules: number
    draftRules: number
    pausedRules: number
    status: HealthStatusLabel
    details: string
  }
}

export interface DashboardActionableTask {
  id: string
  title: string
  description: string
  count: number
  severity: 'high' | 'medium' | 'low' | 'info'
  route: string
  category: 'approvals' | 'payments' | 'subscriptions' | 'directory' | 'automations'
}
