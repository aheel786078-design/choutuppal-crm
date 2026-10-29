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
