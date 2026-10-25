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
