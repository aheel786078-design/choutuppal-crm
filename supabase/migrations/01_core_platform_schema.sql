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
