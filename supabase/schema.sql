-- ======================================================================
-- CHOUTUPPAL SUPERAPP & MULTI-TOWN FRANCHISE PLATFORM — SUPABASE SCHEMA
-- ======================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Territories Table (Multi-Town Root)
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
      'rejected'
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

-- 5. User Profiles & Roles Table
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

-- 6. Franchise Staff Assignments
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

-- 7. Business Listings Table (Territory-Scoped)
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
  address TEXT NOT NULL,
  location TEXT,
  price TEXT,
  description TEXT,
  cover_image TEXT NOT NULL,
  gallery TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'published' CHECK (
    status IN (
      'published',
      'approved',
      'pending_approval',
      'changes_requested',
      'rejected',
      'paused',
      'draft',
      'archived',
      'APPROVED',
      'PENDING',
      'REJECTED'
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_territory_listing_slug UNIQUE (territory_id, slug)
);

-- 8. Moderation Approval Queue (Territory-Scoped)
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

-- 9. User Stories Table (Territory-Scoped)
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

-- 10. User Offers Table (Territory-Scoped)
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

-- 11. CRM Inbound Leads & Contacts (Territory-Scoped)
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

-- 12. Audit Logs Table (Platform-Wide & Territory-Scoped)
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- SEED DATA: Flagship Choutuppal Territory (Company-Owned & Protected)
-- --------------------------------------------------------------------------

INSERT INTO public.territories (
  id,
  name,
  slug,
  type,
  status,
  district,
  state,
  pincodes,
  localities,
  primary_domain,
  subdomain,
  is_flagship,
  contact_phone,
  whatsapp_number,
  branding
) VALUES (
  'territory_choutuppal',
  'Choutuppal Town & Mandal',
  'choutuppal',
  'company_owned',
  'active',
  'Yadadri Bhuvanagiri',
  'Telangana',
  ARRAY['508252'],
  ARRAY['Choutuppal Town', 'Panthangi', 'Malkapur', 'Peddakondur', 'Lingoji Guda', 'Koyalagudem'],
  'choutuppal.in',
  'choutuppal.choutuppal.in',
  TRUE,
  '9494348175',
  '9494348175',
  '{
    "logoUrl": "https://i.ibb.co/BVdvN5rB/Untitled-design-removebg-preview.png",
    "primaryColor": "#1d4ed8",
    "tagline": "Mana Choutuppal Local Search & WhatsApp Super App",
    "heroTitle": "చౌటుప్పల్ లోకల్ బిజినెస్ & రియల్ ఎస్టేట్"
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Seed Flagship Primary Domain
INSERT INTO public.territory_domains (id, territory_id, domain, type, is_verified, ssl_status)
VALUES ('dom_choutuppal_main', 'territory_choutuppal', 'choutuppal.in', 'PRIMARY', TRUE, 'active')
ON CONFLICT (domain) DO NOTHING;

-- --------------------------------------------------------------------------
-- INDEXES FOR MULTI-TENANT QUERY OPTIMIZATION
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
-- MIGRATION 01: COMPREHENSIVE ROW LEVEL SECURITY (RLS) POLICIES
-- ======================================================================

-- 1. Helper Security Functions (SECURITY DEFINER)
-- ----------------------------------------------------------------------

-- Checks if caller has SUPER_ADMIN role
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

-- Returns caller's assigned territory_id from profiles or staff
CREATE OR REPLACE FUNCTION public.current_territory_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT territory_id FROM public.profiles WHERE id = auth.uid()),
    (SELECT territory_id FROM public.franchise_staff WHERE user_id = auth.uid() AND status = 'ACTIVE' LIMIT 1)
  );
$$;

-- Checks if territory is active and franchise is not suspended
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

-- 2. Enable Row Level Security (RLS) on All 11 Tables
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

-- 3. Territories Policies
-- ----------------------------------------------------------------------
DROP POLICY IF EXISTS "territories_public_read" ON public.territories;
CREATE POLICY "territories_public_read" ON public.territories
  FOR SELECT
  USING (status = 'active' OR public.is_super_admin());

DROP POLICY IF EXISTS "territories_super_admin_manage" ON public.territories;
CREATE POLICY "territories_super_admin_manage" ON public.territories
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 4. Franchises Policies
-- ----------------------------------------------------------------------
DROP POLICY IF EXISTS "franchises_public_read" ON public.franchises;
CREATE POLICY "franchises_public_read" ON public.franchises
  FOR SELECT
  USING (status = 'active' OR owner_user_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "franchises_super_admin_manage" ON public.franchises;
CREATE POLICY "franchises_super_admin_manage" ON public.franchises
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 5. Profiles Policies (Prevent Self-Privilege Escalation)
-- ----------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_read_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_read_own_or_admin" ON public.profiles
  FOR SELECT
  USING (id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid() OR public.is_super_admin())
  WITH CHECK (
    -- Normal users cannot escalate their own role or switch territories
    public.is_super_admin() OR (
      id = auth.uid()
      AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
      AND territory_id = (SELECT territory_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- 6. Franchise Staff Policies
-- ----------------------------------------------------------------------
DROP POLICY IF EXISTS "staff_view_own_territory" ON public.franchise_staff;
CREATE POLICY "staff_view_own_territory" ON public.franchise_staff
  FOR SELECT
  USING (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "staff_manage_admin" ON public.franchise_staff;
CREATE POLICY "staff_manage_admin" ON public.franchise_staff
  FOR ALL
  USING (
    public.is_super_admin() OR (
      territory_id = public.current_territory_id()
      AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'FRANCHISE_ADMIN')
      )
    )
  );

-- 7. Listings Policies (Multi-Tenant Isolation)
-- ----------------------------------------------------------------------
DROP POLICY IF EXISTS "listings_public_read" ON public.listings;
CREATE POLICY "listings_public_read" ON public.listings
  FOR SELECT
  USING (
    status IN ('published', 'approved', 'APPROVED')
    OR territory_id = public.current_territory_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "listings_tenant_insert" ON public.listings;
CREATE POLICY "listings_tenant_insert" ON public.listings
  FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR (
      territory_id = public.current_territory_id()
      AND public.is_territory_active(territory_id)
    )
  );

DROP POLICY IF EXISTS "listings_tenant_update" ON public.listings;
CREATE POLICY "listings_tenant_update" ON public.listings
  FOR UPDATE
  USING (
    public.is_super_admin()
    OR (
      territory_id = public.current_territory_id()
      AND public.is_territory_active(territory_id)
    )
  )
  WITH CHECK (
    -- Prevent changing territory_id during update
    public.is_super_admin()
    OR territory_id = public.current_territory_id()
  );

DROP POLICY IF EXISTS "listings_tenant_delete" ON public.listings;
CREATE POLICY "listings_tenant_delete" ON public.listings
  FOR DELETE
  USING (
    public.is_super_admin()
    OR (
      territory_id = public.current_territory_id()
      AND public.is_territory_active(territory_id)
    )
  );

-- 8. Approvals Policies (Moderation Isolation)
-- ----------------------------------------------------------------------
DROP POLICY IF EXISTS "approvals_scoped_read" ON public.approvals;
CREATE POLICY "approvals_scoped_read" ON public.approvals
  FOR SELECT
  USING (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "approvals_public_insert" ON public.approvals;
CREATE POLICY "approvals_public_insert" ON public.approvals
  FOR INSERT
  WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "approvals_scoped_update" ON public.approvals;
CREATE POLICY "approvals_scoped_update" ON public.approvals
  FOR UPDATE
  USING (
    public.is_super_admin()
    OR (
      territory_id = public.current_territory_id()
      AND type != 'FRANCHISE_APP' -- Franchise apps strictly reserved for Super Admin
    )
  );

-- 9. Contacts Policies (Private Customer Leads Protection)
-- ----------------------------------------------------------------------
DROP POLICY IF EXISTS "contacts_scoped_read" ON public.contacts;
CREATE POLICY "contacts_scoped_read" ON public.contacts
  FOR SELECT
  USING (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "contacts_scoped_manage" ON public.contacts;
CREATE POLICY "contacts_scoped_manage" ON public.contacts
  FOR ALL
  USING (territory_id = public.current_territory_id() OR public.is_super_admin())
  WITH CHECK (territory_id = public.current_territory_id() OR public.is_super_admin());

-- 10. Audit Logs Policies (Append-Only Tamper-Proof Audit Trail)
-- ----------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_logs_scoped_read" ON public.audit_logs;
CREATE POLICY "audit_logs_scoped_read" ON public.audit_logs
  FOR SELECT
  USING (territory_id = public.current_territory_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Revoke UPDATE and DELETE on audit logs for authenticated and anon users (Tamper-evident guarantee)
REVOKE UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;
