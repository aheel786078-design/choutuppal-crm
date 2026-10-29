-- ======================================================================
-- CHOUTUPPAL SUPERAPP & MULTI-TOWN FRANCHISE PLATFORM
-- MIGRATION 01: CORE MULTI-TENANT PLATFORM SCHEMA
-- ======================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Territories Table (Multi-Town Root Partition Anchor)
CREATE TABLE IF NOT EXISTS public.territories (
  id TEXT PRIMARY KEY, -- e.g. 'territory_choutuppal', 'territory_suryapet'
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'franchise_operated' CHECK (type IN ('company_owned', 'franchise_operated')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'maintenance')),
  district TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Telangana',
  pincodes TEXT[] DEFAULT '{}',
  localities TEXT[] DEFAULT '{}',
  primary_domain TEXT UNIQUE NOT NULL,
  subdomain TEXT UNIQUE,
  is_flagship BOOLEAN DEFAULT FALSE,
  immutable BOOLEAN DEFAULT FALSE,
  branding JSONB DEFAULT '{
    "primaryColor": "#1d4ed8",
    "tagline": "Local Business & Services Hub",
    "heroTitle": "Local Search & Directory"
  }'::jsonb,
  contact_phone TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Franchises Table
CREATE TABLE IF NOT EXISTS public.franchises (
  id TEXT PRIMARY KEY, -- e.g. 'fr_suryapet_01'
  territory_id TEXT NOT NULL REFERENCES public.territories(id) ON DELETE RESTRICT,
  territory_name TEXT,
  territory_slug TEXT,
  name TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  applicant_phone TEXT NOT NULL,
  email TEXT NOT NULL,
  experience TEXT,
  status TEXT NOT NULL DEFAULT 'application_submitted' CHECK (
    status IN (
      'application_submitted',
      'under_review',
      'approved_pending_setup',
      'active',
      'suspended',
      'expired',
      'closed',
      'rejected',
      'pending_review',
      'approved'
    )
  ),
  owner_user_id UUID,
  plan_tier TEXT DEFAULT 'STARTER' CHECK (plan_tier IN ('STARTER', 'PRO', 'ENTERPRISE', 'FLAGSHIP')),
  feature_limits JSONB DEFAULT '{
    "maxListings": 500,
    "maxStaff": 5,
    "maxMonthlyBroadcasts": 1000,
    "customDomainAllowed": true,
    "aiChatEnabled": true
  }'::jsonb,
  commercial_model JSONB DEFAULT '{
    "type": "fixed",
    "setupFee": 25000,
    "monthlyFee": 5000,
    "revSharePct": 20,
    "currency": "INR"
  }'::jsonb,
  assigned_domain TEXT,
  notes TEXT,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Territory Custom & Sub-Domains
CREATE TABLE IF NOT EXISTS public.territory_domains (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  domain TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'PRIMARY' CHECK (type IN ('PRIMARY', 'SUBDOMAIN', 'ALIAS')),
  is_verified BOOLEAN DEFAULT FALSE,
  ssl_status TEXT DEFAULT 'pending' CHECK (ssl_status IN ('active', 'pending', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. User Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  phone TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'USER' CHECK (
    role IN (
      'SUPER_ADMIN',
      'PLATFORM_OPERATOR',
      'FRANCHISE_ADMIN',
      'FRANCHISE_REVIEWER',
      'FRANCHISE_STAFF',
      'MERCHANT',
      'USER'
    )
  ),
  territory_id TEXT REFERENCES public.territories(id) ON DELETE SET NULL,
  franchise_id TEXT REFERENCES public.franchises(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Franchise Staff Table
CREATE TABLE IF NOT EXISTS public.franchise_staff (
  id TEXT PRIMARY KEY,
  franchise_id TEXT NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
  territory_id TEXT NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('FRANCHISE_ADMIN', 'FRANCHISE_REVIEWER', 'FRANCHISE_STAFF')),
  permissions TEXT[] DEFAULT '{"listings:read", "listings:write", "inbox:reply"}'::text[],
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVITED', 'SUSPENDED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Business Listings Table
CREATE TABLE IF NOT EXISTS public.listings (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE RESTRICT,
  franchise_id TEXT REFERENCES public.franchises(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  village_id TEXT DEFAULT 'v-choutuppal',
  village_name TEXT DEFAULT 'చౌటుప్పల్ (Choutuppal)',
  type TEXT DEFAULT 'BUSINESS' CHECK (type IN ('BUSINESS', 'SERVICE', 'REAL_ESTATE')),
  phone TEXT NOT NULL,
  secondary_phone TEXT,
  whatsapp TEXT,
  email TEXT,
  website TEXT,
  address TEXT NOT NULL,
  location TEXT,
  price TEXT,
  description TEXT,
  cover_image TEXT NOT NULL,
  gallery TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'published' CHECK (
    status IN (
      'published', 'approved', 'pending_approval', 'changes_requested',
      'rejected', 'paused', 'draft', 'archived', 'APPROVED', 'PENDING', 'REJECTED', 'DRAFT'
    )
  ),
  is_featured BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  whatsapp_clicks INTEGER DEFAULT 0,
  synced_to_crm BOOLEAN DEFAULT TRUE,
  crm_lead_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Non-unique index for lookup on (territory_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_listings_territory_slug ON public.listings (territory_id, slug);

-- 8. Moderation Approvals Table
CREATE TABLE IF NOT EXISTS public.approvals (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  franchise_id TEXT REFERENCES public.franchises(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('NEW_LISTING', 'LISTING_EDIT', 'STORY', 'OFFER', 'FRANCHISE_APP', 'CITIZEN_REPORT')),
  title TEXT NOT NULL,
  submitter_name TEXT NOT NULL,
  submitter_phone TEXT NOT NULL,
  media_url TEXT,
  data JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  rejection_reason TEXT,
  admin_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- 9. Merchant Stories Table
CREATE TABLE IF NOT EXISTS public.stories (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  franchise_id TEXT REFERENCES public.franchises(id) ON DELETE SET NULL,
  business_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  media_url TEXT NOT NULL,
  caption TEXT NOT NULL,
  status TEXT DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'published', 'expired', 'rejected')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Promotional Offers Table
CREATE TABLE IF NOT EXISTS public.offers (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  franchise_id TEXT REFERENCES public.franchises(id) ON DELETE SET NULL,
  business_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  title TEXT NOT NULL,
  discount TEXT NOT NULL,
  image_url TEXT,
  terms TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'published', 'expired', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. CRM Inbound Leads & Contacts Table
CREATE TABLE IF NOT EXISTS public.contacts (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  franchise_id TEXT REFERENCES public.franchises(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  tags TEXT[] DEFAULT '{}',
  stage TEXT DEFAULT 'NEW_LEAD' CHECK (stage IN ('NEW_LEAD', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST')),
  listing_id TEXT,
  listing_title TEXT,
  notes TEXT,
  message_count INTEGER DEFAULT 1,
  last_message TEXT,
  last_contact_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Audit Logs Table (Platform-Wide & Scoped)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  territory_id TEXT REFERENCES public.territories(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  metadata JSONB,
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- INDEXES FOR CORE PLATFORM
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_listings_territory ON public.listings (territory_id);
CREATE INDEX IF NOT EXISTS idx_contacts_territory ON public.contacts (territory_id);
CREATE INDEX IF NOT EXISTS idx_approvals_territory ON public.approvals (territory_id);
CREATE INDEX IF NOT EXISTS idx_stories_territory ON public.stories (territory_id);
CREATE INDEX IF NOT EXISTS idx_offers_territory ON public.offers (territory_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_territory ON public.audit_logs (territory_id);
CREATE INDEX IF NOT EXISTS idx_territory_domains_domain ON public.territory_domains (domain);

-- ======================================================================
-- CHOUTUPPAL SUPERAPP & MULTI-TOWN FRANCHISE PLATFORM
-- MIGRATION 02: CRM & WHATSAPP AUTOMATION ENGINE SCHEMA
-- ======================================================================

-- 13. WhatsApp Messages History (Territory & Contact-Scoped)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES public.contacts(id) ON DELETE SET NULL,
  contact_name TEXT,
  phone TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  sender TEXT NOT NULL DEFAULT 'customer' CHECK (sender IN ('customer', 'bot', 'agent', 'system')),
  text TEXT NOT NULL,
  message_text TEXT, -- Alias for text
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'document', 'button', 'interactive', 'location')),
  media_url TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'received')),
  provider_message_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Conversations Aggregation View / Table
CREATE TABLE IF NOT EXISTS public.conversations (
  id TEXT PRIMARY KEY, -- e.g. 'conv_{phone}'
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES public.contacts(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  last_message_text TEXT,
  last_message_direction TEXT CHECK (last_message_direction IN ('INBOUND', 'OUTBOUND')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'archived', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_territory_phone UNIQUE (territory_id, phone)
);

-- 15. WhatsApp Interactive Flows (Multi-Step Bot)
CREATE TABLE IF NOT EXISTS public.whatsapp_flows (
  id TEXT PRIMARY KEY, -- e.g. 'flow_welcome_day1'
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'keyword',
  trigger_keyword TEXT,
  trigger_keywords TEXT[] DEFAULT '{}',
  initial_message TEXT DEFAULT '',
  button_options TEXT[] DEFAULT '{}',
  template_slug TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  type TEXT DEFAULT 'INTERACTIVE_FLOW',
  version INTEGER DEFAULT 1,
  entry_node_id TEXT DEFAULT 'start',
  triggers JSONB DEFAULT '[]'::jsonb,
  nodes JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Automation Rules Engine (179 Verified Rules)
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id TEXT PRIMARY KEY, -- e.g. 'auto_001_welcome'
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('first_inbound_message', 'keyword_match', 'time_based', 'stage_change', 'tag_added')),
  trigger_value TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('send_message', 'add_tag', 'remove_tag', 'assign_staff', 'update_stage', 'notify_admin')),
  action_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'draft')),
  is_global BOOLEAN DEFAULT TRUE,
  is_supported BOOLEAN DEFAULT TRUE,
  description TEXT,
  template_slug TEXT,
  delay_minutes INTEGER DEFAULT 0,
  execution_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Automation Execution Logs
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  automation_id TEXT REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  contact_id TEXT REFERENCES public.contacts(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'SKIPPED', 'QUEUED')),
  details TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. CRM Pipelines & Deals
CREATE TABLE IF NOT EXISTS public.crm_deals (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES public.contacts(id) ON DELETE CASCADE,
  listing_id TEXT REFERENCES public.listings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  phone TEXT,
  tag TEXT,
  value NUMERIC(12, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'INR',
  stage TEXT NOT NULL DEFAULT 'NEW_LEAD' CHECK (stage IN ('NEW_LEAD', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'DISCOVERY', 'WON', 'LOST')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'WON', 'LOST', 'ABANDONED')),
  expected_close_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Broadcast Campaigns
CREATE TABLE IF NOT EXISTS public.broadcast_campaigns (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_tags TEXT[] DEFAULT '{}',
  message_text TEXT NOT NULL,
  media_url TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED')),
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Webhook Events (Idempotent De-duplication & Audit)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'whatsapp' CHECK (provider IN ('whatsapp', 'razorpay', 'custom')),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PROCESSED' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED', 'DUPLICATE_IGNORED')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_provider_event_id UNIQUE (provider, event_id)
);

-- --------------------------------------------------------------------------
-- INDEXES FOR CRM PERFORMANCE
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_messages_territory ON public.whatsapp_messages (territory_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact ON public.whatsapp_messages (contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_provider_id ON public.whatsapp_messages (provider_message_id);
CREATE INDEX IF NOT EXISTS idx_conversations_territory ON public.conversations (territory_id);
CREATE INDEX IF NOT EXISTS idx_automations_territory ON public.automation_rules (territory_id);
CREATE INDEX IF NOT EXISTS idx_automations_active ON public.automation_rules (is_active);
CREATE INDEX IF NOT EXISTS idx_deals_territory ON public.crm_deals (territory_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact ON public.crm_deals (contact_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_territory ON public.broadcast_campaigns (territory_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_payload_hash ON public.webhook_events (payload_hash);

-- ======================================================================
-- CHOUTUPPAL SUPERAPP & MULTI-TOWN FRANCHISE PLATFORM
-- MIGRATION 03: CONTENT, DIRECTORY & MONETIZATION SCHEMA
-- ======================================================================

-- 21. Local News Items Table
CREATE TABLE IF NOT EXISTS public.news_items (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  telugu_title TEXT,
  slug TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'local_updates',
  author TEXT NOT NULL DEFAULT 'Mana Choutuppal Desk',
  image_url TEXT,
  cover_image TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  is_featured BOOLEAN DEFAULT FALSE,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_territory_news_slug UNIQUE (territory_id, slug)
);

-- 22. Short Video Reels (Shorts) Table
CREATE TABLE IF NOT EXISTS public.short_items (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  author_name TEXT NOT NULL,
  author_phone TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. Promotional Homepage Banners Table
CREATE TABLE IF NOT EXISTS public.banner_items (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  target_url TEXT,
  link_url TEXT, -- Alias for target_url
  type TEXT DEFAULT 'hero_main',
  placement TEXT DEFAULT 'home_top' CHECK (placement IN ('home_top', 'directory_top', 'shorts_interstitial', 'footer')),
  is_active BOOLEAN DEFAULT TRUE,
  clicks INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. Breaking News & Headline Tickers Table
CREATE TABLE IF NOT EXISTS public.ticker_items (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  link TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. Official Government Contacts Directory Table
CREATE TABLE IF NOT EXISTS public.government_contacts (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  title TEXT NOT NULL,
  officer_name TEXT,
  phone TEXT NOT NULL,
  secondary_phone TEXT,
  email TEXT,
  office_address TEXT,
  pincode TEXT DEFAULT '508252',
  service_category TEXT NOT NULL CHECK (service_category IN ('emergency', 'police', 'revenue', 'electricity', 'municipality', 'panchayat', 'health', 'judiciary', 'other')),
  priority_rank INTEGER DEFAULT 100,
  is_emergency BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. Commercial Listing Plans
CREATE TABLE IF NOT EXISTS public.listing_plans (
  id TEXT PRIMARY KEY, -- e.g. 'plan_premium_monthly', 'plan_featured_monthly'
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('free', 'premium', 'featured', 'bundle')),
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'INR',
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly', 'quarterly', 'annual', 'one_time')),
  duration_days INTEGER NOT NULL DEFAULT 30,
  features TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 27. Merchant Listing Subscriptions
CREATE TABLE IF NOT EXISTS public.listing_subscriptions (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.listing_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'expired')),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 28. Featured Listing Boost Promotions
CREATE TABLE IF NOT EXISTS public.featured_promotions (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 29. Payment Orders & Transactions Tables
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  gateway_order_id TEXT UNIQUE,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'attempted', 'paid', 'failed', 'refunded')),
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  listing_id TEXT REFERENCES public.listings(id) ON DELETE SET NULL,
  plan_id TEXT REFERENCES public.listing_plans(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.payment_orders(id) ON DELETE CASCADE,
  gateway_payment_id TEXT UNIQUE,
  gateway_signature TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING', 'REFUNDED')),
  raw_response JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- INDEXES FOR CONTENT & MONETIZATION
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_news_territory ON public.news_items (territory_id);
CREATE INDEX IF NOT EXISTS idx_shorts_territory ON public.short_items (territory_id);
CREATE INDEX IF NOT EXISTS idx_banners_territory ON public.banner_items (territory_id);
CREATE INDEX IF NOT EXISTS idx_govt_territory ON public.government_contacts (territory_id);
CREATE INDEX IF NOT EXISTS idx_govt_category ON public.government_contacts (service_category);
CREATE INDEX IF NOT EXISTS idx_subs_listing ON public.listing_subscriptions (listing_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON public.listing_subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_orders_territory ON public.payment_orders (territory_id);
CREATE INDEX IF NOT EXISTS idx_orders_gateway ON public.payment_orders (gateway_order_id);

-- ======================================================================
-- CHOUTUPPAL SUPERAPP & MULTI-TOWN FRANCHISE PLATFORM
-- MIGRATION 04: COMPREHENSIVE ROW LEVEL SECURITY (RLS) FOR ALL 29 TABLES
-- ======================================================================

-- 1. Helper Security Functions (SECURITY DEFINER with strict search_path)
-- ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'PLATFORM_OPERATOR')
  );
$$;

CREATE OR REPLACE FUNCTION public.current_territory_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT territory_id FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'PLATFORM_OPERATOR', 'FRANCHISE_ADMIN', 'FRANCHISE_REVIEWER', 'FRANCHISE_STAFF')),
    (SELECT territory_id FROM public.franchise_staff WHERE user_id = auth.uid() AND status = 'ACTIVE' LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_territory_active(target_territory_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.territories t
    LEFT JOIN public.franchises f ON f.territory_id = t.id
    WHERE t.id = target_territory_id
      AND t.status = 'active'
      AND (t.type = 'company_owned' OR f.status = 'active')
  );
$$;

-- 2. Enable Row Level Security (RLS) on All 29 Tables
-- ----------------------------------------------------------------------
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territory_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.franchise_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banner_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticker_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- 3. Platform Core Policies (Tables 1–11)
-- ----------------------------------------------------------------------
DROP POLICY IF EXISTS "territories_public_read" ON public.territories;
CREATE POLICY "territories_public_read" ON public.territories
  FOR SELECT USING (status = 'active' OR public.is_super_admin());

DROP POLICY IF EXISTS "territories_super_admin_manage" ON public.territories;
CREATE POLICY "territories_super_admin_manage" ON public.territories
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "franchises_public_read" ON public.franchises;
CREATE POLICY "franchises_public_read" ON public.franchises
  FOR SELECT USING (status = 'active' OR owner_user_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "franchises_super_admin_manage" ON public.franchises;
CREATE POLICY "franchises_super_admin_manage" ON public.franchises
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "domains_public_read" ON public.territory_domains;
CREATE POLICY "domains_public_read" ON public.territory_domains
  FOR SELECT USING (is_verified = TRUE OR public.is_super_admin());

DROP POLICY IF EXISTS "domains_super_admin_manage" ON public.territory_domains;
CREATE POLICY "domains_super_admin_manage" ON public.territory_domains
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "profiles_read_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_read_own_or_admin" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR public.is_super_admin())
  WITH CHECK (
    public.is_super_admin() OR (
      id = auth.uid()
      AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
      AND territory_id = (SELECT territory_id FROM public.profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "staff_view_own_territory" ON public.franchise_staff;
CREATE POLICY "staff_view_own_territory" ON public.franchise_staff
  FOR SELECT USING (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "staff_manage_admin" ON public.franchise_staff;
CREATE POLICY "staff_manage_admin" ON public.franchise_staff
  FOR ALL USING (
    public.is_super_admin() OR (
      territory_id = public.current_territory_id()
      AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'FRANCHISE_ADMIN'))
    )
  );

DROP POLICY IF EXISTS "listings_public_read" ON public.listings;
CREATE POLICY "listings_public_read" ON public.listings
  FOR SELECT USING (
    status IN ('published', 'approved', 'APPROVED')
    OR territory_id = public.current_territory_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "listings_tenant_insert" ON public.listings;
CREATE POLICY "listings_tenant_insert" ON public.listings
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR (
      territory_id = public.current_territory_id()
      AND public.is_territory_active(territory_id)
    )
  );

DROP POLICY IF EXISTS "listings_tenant_update" ON public.listings;
CREATE POLICY "listings_tenant_update" ON public.listings
  FOR UPDATE USING (
    public.is_super_admin() OR (
      territory_id = public.current_territory_id()
      AND public.is_territory_active(territory_id)
    )
  )
  WITH CHECK (public.is_super_admin() OR territory_id = public.current_territory_id());

DROP POLICY IF EXISTS "listings_tenant_delete" ON public.listings;
CREATE POLICY "listings_tenant_delete" ON public.listings
  FOR DELETE USING (
    public.is_super_admin() OR (
      territory_id = public.current_territory_id()
      AND public.is_territory_active(territory_id)
    )
  );

DROP POLICY IF EXISTS "approvals_scoped_read" ON public.approvals;
CREATE POLICY "approvals_scoped_read" ON public.approvals
  FOR SELECT USING (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "approvals_public_insert" ON public.approvals;
CREATE POLICY "approvals_public_insert" ON public.approvals
  FOR INSERT WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "approvals_scoped_update" ON public.approvals;
CREATE POLICY "approvals_scoped_update" ON public.approvals
  FOR UPDATE USING (
    public.is_super_admin() OR (
      territory_id = public.current_territory_id()
      AND type != 'FRANCHISE_APP'
    )
  );

DROP POLICY IF EXISTS "stories_public_read" ON public.stories;
CREATE POLICY "stories_public_read" ON public.stories
  FOR SELECT USING (
    (status = 'published' AND expires_at > NOW())
    OR territory_id = public.current_territory_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "stories_scoped_manage" ON public.stories;
CREATE POLICY "stories_scoped_manage" ON public.stories
  FOR ALL USING (territory_id = public.current_territory_id() OR public.is_super_admin())
  WITH CHECK (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "offers_public_read" ON public.offers;
CREATE POLICY "offers_public_read" ON public.offers
  FOR SELECT USING (
    (status = 'published' AND end_date >= NOW())
    OR territory_id = public.current_territory_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "offers_scoped_manage" ON public.offers;
CREATE POLICY "offers_scoped_manage" ON public.offers
  FOR ALL USING (territory_id = public.current_territory_id() OR public.is_super_admin())
  WITH CHECK (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "contacts_scoped_read" ON public.contacts;
CREATE POLICY "contacts_scoped_read" ON public.contacts
  FOR SELECT USING (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "contacts_scoped_manage" ON public.contacts;
CREATE POLICY "contacts_scoped_manage" ON public.contacts
  FOR ALL USING (territory_id = public.current_territory_id() OR public.is_super_admin())
  WITH CHECK (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "audit_logs_scoped_read" ON public.audit_logs;
CREATE POLICY "audit_logs_scoped_read" ON public.audit_logs
  FOR SELECT USING (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (TRUE);

-- 4. CRM & WhatsApp Automation Policies (Tables 12–19)
-- ----------------------------------------------------------------------
DROP POLICY IF EXISTS "messages_scoped_read" ON public.whatsapp_messages;
CREATE POLICY "messages_scoped_read" ON public.whatsapp_messages
  FOR SELECT USING (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "messages_scoped_insert" ON public.whatsapp_messages;
CREATE POLICY "messages_scoped_insert" ON public.whatsapp_messages
  FOR INSERT WITH CHECK (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "conversations_scoped_access" ON public.conversations;
CREATE POLICY "conversations_scoped_access" ON public.conversations
  FOR ALL USING (territory_id = public.current_territory_id() OR public.is_super_admin())
  WITH CHECK (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "flows_public_read_active" ON public.whatsapp_flows;
CREATE POLICY "flows_public_read_active" ON public.whatsapp_flows
  FOR SELECT USING (is_active = TRUE OR territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "flows_manage_admin" ON public.whatsapp_flows;
CREATE POLICY "flows_manage_admin" ON public.whatsapp_flows
  FOR ALL USING (territory_id = public.current_territory_id() OR public.is_super_admin())
  WITH CHECK (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "automations_scoped_access" ON public.automation_rules;
CREATE POLICY "automations_scoped_access" ON public.automation_rules
  FOR ALL USING (territory_id = public.current_territory_id() OR public.is_super_admin())
  WITH CHECK (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "auto_logs_scoped_read" ON public.automation_logs;
CREATE POLICY "auto_logs_scoped_read" ON public.automation_logs
  FOR SELECT USING (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "deals_scoped_access" ON public.crm_deals;
CREATE POLICY "deals_scoped_access" ON public.crm_deals
  FOR ALL USING (territory_id = public.current_territory_id() OR public.is_super_admin())
  WITH CHECK (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "broadcasts_scoped_access" ON public.broadcast_campaigns;
CREATE POLICY "broadcasts_scoped_access" ON public.broadcast_campaigns
  FOR ALL USING (territory_id = public.current_territory_id() OR public.is_super_admin())
  WITH CHECK (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "webhooks_super_admin_read" ON public.webhook_events;
CREATE POLICY "webhooks_super_admin_read" ON public.webhook_events
  FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "webhooks_system_insert" ON public.webhook_events;
CREATE POLICY "webhooks_system_insert" ON public.webhook_events
  FOR INSERT WITH CHECK (TRUE);

-- 5. Content, Directory & Commercial Policies (Tables 20–29)
-- ----------------------------------------------------------------------
DROP POLICY IF EXISTS "news_public_read" ON public.news_items;
CREATE POLICY "news_public_read" ON public.news_items FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "news_scoped_manage" ON public.news_items;
CREATE POLICY "news_scoped_manage" ON public.news_items
  FOR ALL USING (territory_id = public.current_territory_id() OR public.is_super_admin())
  WITH CHECK (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "shorts_public_read" ON public.short_items;
CREATE POLICY "shorts_public_read" ON public.short_items FOR SELECT USING (status = 'approved' OR public.is_super_admin());

DROP POLICY IF EXISTS "shorts_public_insert" ON public.short_items;
CREATE POLICY "shorts_public_insert" ON public.short_items FOR INSERT WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "shorts_scoped_manage" ON public.short_items;
CREATE POLICY "shorts_scoped_manage" ON public.short_items
  FOR ALL USING (territory_id = public.current_territory_id() OR public.is_super_admin())
  WITH CHECK (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "banners_public_read" ON public.banner_items;
CREATE POLICY "banners_public_read" ON public.banner_items FOR SELECT USING (is_active = TRUE OR public.is_super_admin());

DROP POLICY IF EXISTS "banners_scoped_manage" ON public.banner_items;
CREATE POLICY "banners_scoped_manage" ON public.banner_items
  FOR ALL USING (territory_id = public.current_territory_id() OR public.is_super_admin())
  WITH CHECK (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "tickers_public_read" ON public.ticker_items;
CREATE POLICY "tickers_public_read" ON public.ticker_items FOR SELECT USING (is_active = TRUE OR public.is_super_admin());

DROP POLICY IF EXISTS "tickers_scoped_manage" ON public.ticker_items;
CREATE POLICY "tickers_scoped_manage" ON public.ticker_items
  FOR ALL USING (territory_id = public.current_territory_id() OR public.is_super_admin())
  WITH CHECK (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "govt_public_read" ON public.government_contacts;
CREATE POLICY "govt_public_read" ON public.government_contacts FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "govt_scoped_manage" ON public.government_contacts;
CREATE POLICY "govt_scoped_manage" ON public.government_contacts
  FOR ALL USING (territory_id = public.current_territory_id() OR public.is_super_admin())
  WITH CHECK (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "plans_public_read" ON public.listing_plans;
CREATE POLICY "plans_public_read" ON public.listing_plans FOR SELECT USING (is_active = TRUE OR public.is_super_admin());

DROP POLICY IF EXISTS "plans_super_admin_manage" ON public.listing_plans;
CREATE POLICY "plans_super_admin_manage" ON public.listing_plans
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "subscriptions_scoped_read" ON public.listing_subscriptions;
CREATE POLICY "subscriptions_scoped_read" ON public.listing_subscriptions
  FOR SELECT USING (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "subscriptions_scoped_manage" ON public.listing_subscriptions;
CREATE POLICY "subscriptions_scoped_manage" ON public.listing_subscriptions
  FOR ALL USING (territory_id = public.current_territory_id() OR public.is_super_admin())
  WITH CHECK (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "promotions_public_read" ON public.featured_promotions;
CREATE POLICY "promotions_public_read" ON public.featured_promotions FOR SELECT USING (status = 'active' OR public.is_super_admin());

DROP POLICY IF EXISTS "promotions_scoped_manage" ON public.featured_promotions;
CREATE POLICY "promotions_scoped_manage" ON public.featured_promotions
  FOR ALL USING (territory_id = public.current_territory_id() OR public.is_super_admin())
  WITH CHECK (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "orders_scoped_access" ON public.payment_orders;
CREATE POLICY "orders_scoped_access" ON public.payment_orders
  FOR ALL USING (territory_id = public.current_territory_id() OR public.is_super_admin())
  WITH CHECK (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "transactions_scoped_read" ON public.payment_transactions;
CREATE POLICY "transactions_scoped_read" ON public.payment_transactions
  FOR SELECT USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.payment_orders po
      WHERE po.id = order_id
        AND po.territory_id = public.current_territory_id()
    )
  );

DROP POLICY IF EXISTS "transactions_scoped_insert" ON public.payment_transactions;
CREATE POLICY "transactions_scoped_insert" ON public.payment_transactions
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.payment_orders po
      WHERE po.id = order_id
        AND po.territory_id = public.current_territory_id()
    )
  );

-- 6. Tamper-Proof Audit & Webhook Protections
-- ----------------------------------------------------------------------
REVOKE UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.webhook_events FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.automation_logs FROM anon, authenticated;
