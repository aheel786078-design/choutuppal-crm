# Choutuppal Franchise CRM — Phase 5: Production Persistence Readiness Audit & Supabase Migration Plan

**Date**: October 26, 2026  
**Auditor**: Principal Database Architect, Security Engineer & Lead Software Architect  
**Project Root**: `/data/user/0/com.termux/files/home/storage/downloads/Cpl Crm/choutuppal-franchise-crm`  
**Current State**: **Phase 4 Complete; Supabase DISCONNECTED; Runtime 100% on `data/admin_data.json`**  
**Action Status**: **AUDIT & COMPREHENSIVE MIGRATION PLAN ONLY (No runtime storage modifications applied; waiting for approval)**  

---

## 1. Executive Summary

This audit assesses the production persistence readiness of the Choutuppal Franchise CRM and establishes a comprehensive, zero-data-loss migration architecture from the current local JSON store (`data/admin_data.json`) to PostgreSQL via Supabase.

### Core Audit Verdict:
1. **Runtime Reality**: The application is **100% dependent on `data/admin_data.json`**. Every active API endpoint (14 routes) and 8 server-rendered pages currently execute synchronous read/write operations against the local JSON file via [`src/lib/store.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/store.ts).
2. **Supabase Connection State**: Supabase is **completely disconnected**. Environment variables in `.env.local` contain placeholder credentials (`https://your-project.supabase.co`, `your-supabase-anon-key`). `isSupabaseConfigured` in [`src/lib/supabase.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/supabase.ts) evaluates strictly to `false`.
3. **Schema Gap in Existing SQL**: The legacy [`supabase/schema.sql`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/supabase/schema.sql) defines 11 tables, but **omits 10 essential domain entities** introduced across Phases 3B–3F: `deals`, `flows`, `automations` (179 rules), `messages`, `news`, `shorts`, `banners`, `tickers`, `magic_tokens`, and `settings`.
4. **Data Integrity Baseline**: The local store contains 212 listings (211 Flagship Choutuppal + 1 Nalgonda), 211 CRM contacts, 4 deals, 1 flow, 179 draft automations, 4 territories, 3 franchises, and 105 audit logs. All 232 test checks across 11 suites pass cleanly with exit code 0.
5. **Migration Strategy**: A dual-mode Repository/DAO abstraction layer must be introduced so that the application seamlessly switches between Supabase and local JSON storage based on configuration, enabling zero-risk staged rollout and 100% test preservation.

---

## 2. Environment Configuration Audit (Names Only)

In strict accordance with security guidelines, all secret values are omitted. Variable names and their verified configuration statuses in `.env.local` are cataloged below:

| Variable Name | Category | Status | Runtime Effect |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Application | **CONFIGURED** | Canonical application base URL (`https://choutuppal.in`) |
| `PORT` | Application | **CONFIGURED** | Local server port (3000) |
| `NEXT_PUBLIC_WHATSAPP_STATUS_NUMBER` | WhatsApp | **CONFIGURED** | Primary business WhatsApp contact number |
| `NEXT_PUBLIC_WHATSAPP_BOT_NUMBER` | WhatsApp | **CONFIGURED** | Official automated assistant WhatsApp number |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | **PLACEHOLDER** | Contains `https://your-project.supabase.co` (`isSupabaseConfigured === false`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | **PLACEHOLDER** | Contains `your-supabase-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | **PLACEHOLDER** | Contains `your-supabase-service-role-key` |
| `R2_ACCOUNT_ID` | Storage | **PLACEHOLDER** | Cloudflare R2 Account ID placeholder |
| `R2_ACCESS_KEY_ID` | Storage | **PLACEHOLDER** | Cloudflare R2 Access Key ID placeholder |
| `R2_SECRET_ACCESS_KEY` | Storage | **PLACEHOLDER** | Cloudflare R2 Secret Access Key placeholder |
| `R2_BUCKET_NAME` | Storage | **CONFIGURED** | Target R2 bucket name (`choutuppal-media`) |
| `R2_PUBLIC_DOMAIN` | Storage | **CONFIGURED** | High-speed CDN public domain (`https://media.choutuppal.in`) |
| `WHATSAPP_TOKEN` | Meta API | **PLACEHOLDER** | System User access token placeholder (sandbox mode active) |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta API | **PLACEHOLDER** | Meta Cloud Phone Number ID placeholder |
| `WHATSAPP_VERIFY_TOKEN` | Meta API | **CONFIGURED** | Webhook handshake verification token |
| `SESSION_SECRET` | Authentication | **FALLBACK** | Uses internal fallback secret in `auth-server.ts` |
| `AUTOMATION_SHADOW_MODE` | Automation | **DEFAULT (false)** | Evaluator runs in non-dispatching shadow mode only when enabled |

---

## 3. Runtime Storage Map: All Code Interacting with `data/admin_data.json`

Currently, **every single data-driven endpoint and server-rendered page** relies on `loadStore()` or `saveStore()` from [`src/lib/store.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/store.ts).

### 3.1 API Endpoints (Read & Write Dependencies)

| API Route File | Methods | Operations on `admin_data.json` | Entities Affected |
|---|:---:|---|---|
| [`src/app/api/admin/listings/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/admin/listings/route.ts) | GET, POST, PUT, DELETE | Reads listings, enforces plan quotas, writes listing mutations, syncs CRM merchant contacts | `listings`, `contacts`, `territories`, `franchises` |
| [`src/app/api/admin/approvals/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/admin/approvals/route.ts) | GET, POST | Ingests approved submissions (`NEW_LISTING`, `LISTING_EDIT`, `STORY`, `OFFER`), updates listing records, logs audit events | `approvals`, `listings`, `contacts`, `auditLogs` |
| [`src/app/api/admin/content/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/admin/content/route.ts) | GET, POST, PUT, DELETE | Manages marketing content across all 4 territories | `banners`, `news`, `tickers` |
| [`src/app/api/admin/franchises/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/admin/franchises/route.ts) | GET, POST, PUT | Manages franchise applications, plan tiers, territory domains, and staff assignments | `franchises`, `franchiseStaff`, `territoryDomains`, `auditLogs` |
| [`src/app/api/admin/inbox/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/admin/inbox/route.ts) | GET, POST, PATCH | Fetches conversations, records outbound WhatsApp messages, updates read status | `messages`, `contacts` |
| [`src/app/api/admin/dashboard/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/admin/dashboard/route.ts) | GET | Aggregates territory metrics (listings, leads, deals, pending approvals) | `listings`, `contacts`, `deals`, `approvals` |
| [`src/app/api/crm/deals/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/crm/deals/route.ts) | GET, POST, PUT, DELETE | Persistent CRM deal pipeline CRUD and stage transitions | `deals`, `contacts` |
| [`src/app/api/crm/contacts/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/crm/contacts/route.ts) | GET, POST, PUT, DELETE | CRM merchant contacts management, tagging, and stage tracking | `contacts` |
| [`src/app/api/crm/flows/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/crm/flows/route.ts) | GET, POST, PUT, DELETE | WhatsApp interactive category flows configuration | `flows` |
| [`src/app/api/crm/automations/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/crm/automations/route.ts) | GET, POST, PUT, DELETE | Safe CSV import, rule status transitions, and persistent rule management | `automations` (179 rules) |
| [`src/app/api/crm/automations/dry-run/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/crm/automations/dry-run/route.ts) | POST | Evaluates inbound message scenarios against stored rules | `automations`, `contacts`, `listings` |
| [`src/app/api/whatsapp/webhook/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/whatsapp/webhook/route.ts) | GET, POST | Inbound WhatsApp webhook, message deduplication, conversation recording, shadow evaluation | `messages`, `contacts`, `approvals` |
| [`src/app/api/whatsapp/send/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/whatsapp/send/route.ts) | POST | Resolves listing cards and dispatches via Cloud API with delivery tracking | `listings`, `messages` |
| [`src/app/api/shorts/submit/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/shorts/submit/route.ts) | POST | Submits citizen video shorts into the moderation approval queue | `approvals`, `shorts` |

### 3.2 Server-Rendered Public Pages & Helpers

- [`src/app/town/[slug]/page.tsx`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/town/[slug]/page.tsx): Reads `store.territories` and `store.listings` for town portals.
- [`src/app/business/[slug]/page.tsx`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/business/[slug]/page.tsx): Reads `store.listings` for verified business profiles.
- [`src/app/listings/page.tsx`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/listings/page.tsx): Reads `store.listings` for public directory search.
- [`src/lib/home-data.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/home-data.ts): Reads `store.listings` for Featured, Real Estate, and Emergency Services rails.
- [`src/app/sitemap.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/sitemap.ts): Generates dynamic XML sitemap from published listings.
- [`src/lib/tenant.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/tenant.ts): Resolves custom domains and town subdomains from `store.territories` and `store.territoryDomains`.

---

## 4. Database Schema Expansion & PostgreSQL Design

The legacy [`supabase/schema.sql`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/supabase/schema.sql) defines 11 tables. To support the full production application, **10 additional tables** must be added to the schema. All tables use `TEXT PRIMARY KEY` to preserve existing stable IDs (`lst_...`, `cnt_...`, `deal_...`, `auto_...`) without lossy conversions.

### 4.1 Schema Comparison & Expansion Matrix

| Table Name | In Existing `schema.sql`? | Proposed Status in Migration DDL | Key Columns & Constraints |
|---|:---:|:---:|---|
| `public.territories` | Yes | Existing (Add `immutable BOOLEAN`) | `id TEXT PK`, `name`, `slug UNIQUE`, `primary_domain UNIQUE`, `is_flagship` |
| `public.franchises` | Yes | Existing | `id TEXT PK`, `territory_id FK`, `plan_tier`, `feature_limits JSONB` |
| `public.territory_domains` | Yes | Existing | `id TEXT PK`, `territory_id FK`, `domain UNIQUE`, `ssl_status` |
| `public.profiles` | Yes | Existing | `id UUID/TEXT PK`, `phone UNIQUE`, `role`, `territory_id FK` |
| `public.franchise_staff` | Yes | Existing | `id TEXT PK`, `territory_id FK`, `user_id`, `role`, `status` |
| `public.listings` | Yes | Existing (Verify 30 columns) | `id TEXT PK`, `territory_id FK`, `slug`, `status`, `cover_image`, `phone` |
| `public.approvals` | Yes | Existing | `id TEXT PK`, `territory_id FK`, `type`, `data JSONB`, `status` |
| `public.stories` | Yes | Existing | `id TEXT PK`, `territory_id FK`, `business_id`, `media_url`, `expires_at` |
| `public.offers` | Yes | Existing | `id TEXT PK`, `territory_id FK`, `business_id`, `discount`, `end_date` |
| `public.contacts` | Yes | Existing (Align fields) | `id TEXT PK`, `territory_id FK`, `phone`, `tags TEXT[]`, `stage`, `message_count` |
| `public.audit_logs` | Yes | Existing | `id TEXT PK`, `actor_id`, `actor_role`, `territory_id FK`, `action`, `created_at` |
| **`public.deals`** | **NO (MISSING)** | **NEW TABLE** | `id TEXT PK`, `territory_id FK`, `title`, `value NUMERIC`, `stage`, `status` |
| **`public.flows`** | **NO (MISSING)** | **NEW TABLE** | `id TEXT PK`, `territory_id FK`, `name`, `trigger_keyword`, `is_active`, `action_buttons JSONB` |
| **`public.automations`** | **NO (MISSING)** | **NEW TABLE** | `id TEXT PK`, `territory_id FK`, `name`, `trigger_type`, `action_type`, `status`, `is_active` |
| **`public.messages`** | **NO (MISSING)** | **NEW TABLE** | `id TEXT PK`, `territory_id FK`, `phone`, `direction`, `message_text`, `status` |
| **`public.news`** | **NO (MISSING)** | **NEW TABLE** | `id TEXT PK`, `territory_id FK`, `slug UNIQUE`, `title`, `telugu_title`, `is_published` |
| **`public.shorts`** | **NO (MISSING)** | **NEW TABLE** | `id TEXT PK`, `territory_id FK`, `title`, `video_url`, `thumbnail_url`, `tags TEXT[]`, `is_active` |
| **`public.banners`** | **NO (MISSING)** | **NEW TABLE** | `id TEXT PK`, `territory_id FK`, `title`, `image_url`, `type`, `is_active`, `start_date` |
| **`public.tickers`** | **NO (MISSING)** | **NEW TABLE** | `id TEXT PK`, `territory_id FK`, `text`, `priority INT`, `is_active` |
| **`public.magic_tokens`** | **NO (MISSING)** | **NEW TABLE** | `id TEXT PK`, `token_hash UNIQUE`, `phone`, `role`, `territory_id FK`, `expires_at`, `used` |
| **`public.settings`** | **NO (MISSING)** | **NEW TABLE** | `key TEXT PRIMARY KEY`, `value JSONB NOT NULL`, `updated_at TIMESTAMPTZ` |

### 4.2 DDL Specifications for the 10 Missing Tables

```sql
-- 1. Deals Table (Phase 3E Persistent Pipelines)
CREATE TABLE IF NOT EXISTS public.deals (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL REFERENCES public.territories(id) ON DELETE RESTRICT,
  franchise_id TEXT REFERENCES public.franchises(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  stage TEXT DEFAULT 'NEW_LEAD' CHECK (stage IN ('NEW_LEAD', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST')),
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'WON', 'LOST')),
  phone TEXT,
  contact_id TEXT REFERENCES public.contacts(id) ON DELETE SET NULL,
  contact_name TEXT,
  assigned_staff_id TEXT,
  assigned_staff_name TEXT,
  tag TEXT,
  notes TEXT,
  expected_close_date TIMESTAMPTZ,
  next_follow_up_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CRM Interactive Flows (Phase 3D WhatsApp Flow Builder)
CREATE TABLE IF NOT EXISTS public.flows (
  id TEXT PRIMARY KEY,
  territory_id TEXT REFERENCES public.territories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_keyword TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  type TEXT DEFAULT 'CATEGORY_BUTTONS' CHECK (type IN ('CATEGORY_BUTTONS', 'LISTINGS_WITH_PHOTOS', 'WELCOME_MENU', 'AUTO_REPLY')),
  send_photos BOOLEAN DEFAULT TRUE,
  action_buttons JSONB DEFAULT '[]'::jsonb,
  categories_order TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Automation Rules Table (Phase 3F Step 2 & 3 Deterministic Engine — 179 Rules)
CREATE TABLE IF NOT EXISTS public.automations (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_value TEXT DEFAULT '',
  action_type TEXT NOT NULL,
  action_value TEXT NOT NULL,
  description TEXT,
  template_slug TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'disabled')),
  is_active BOOLEAN DEFAULT FALSE,
  is_supported BOOLEAN DEFAULT TRUE,
  is_global BOOLEAN DEFAULT FALSE,
  unsupported_reason TEXT,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. WhatsApp Messages & Conversations (Phase 3D CRM Inbox)
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  contact_name TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_text TEXT NOT NULL,
  image_url TEXT,
  status TEXT DEFAULT 'received' CHECK (status IN ('sent', 'delivered', 'read', 'received', 'failed')),
  provider_message_id TEXT,
  assigned_staff_id TEXT,
  assigned_staff_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. News Articles Table (Phase 3B Multilingual News)
CREATE TABLE IF NOT EXISTS public.news (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  telugu_title TEXT,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  category TEXT NOT NULL,
  is_published BOOLEAN DEFAULT TRUE,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_territory_news_slug UNIQUE (territory_id, slug)
);

-- 6. Video Shorts Feed (Phase 3C Vertical Media)
CREATE TABLE IF NOT EXISTS public.shorts (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  views INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Marketing Banners (Phase 3B Advertising Placements)
CREATE TABLE IF NOT EXISTS public.banners (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL,
  type TEXT DEFAULT 'TOP_BANNER' CHECK (type IN ('TOP_BANNER', 'POPUP', 'STORY', 'IN_FEED')),
  is_active BOOLEAN DEFAULT TRUE,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ
);

-- 8. Announcement Tickers (Phase 3B Marquee)
CREATE TABLE IF NOT EXISTS public.tickers (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  link_url TEXT,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Passwordless Magic Tokens Table
CREATE TABLE IF NOT EXISTS public.magic_tokens (
  id TEXT PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  role TEXT DEFAULT 'FRANCHISE_ADMIN',
  territory_id TEXT NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Platform Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Multi-Tenant Isolation & Row Level Security (RLS) Policy Design

### 5.1 Role Hierarchy & Permissions Model

```
                    ┌────────────────────────┐
                    │      SUPER_ADMIN       │ ──► Global Access across all 4 territories
                    │   (Platform Operator)  │     Bypasses territory constraints via is_super_admin()
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │    FRANCHISE_ADMIN     │ ──► Scoped strictly to assigned territory_id
                    │   (Town Licensee)      │     Cannot read/mutate foreign tenant data
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │    FRANCHISE_STAFF     │ ──► Sub-staff restricted by permissions array
                    │   (Reviewer / Sales)   │     Scoped to town territory_id
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │    MERCHANT / CITIZEN  │ ──► Public read for approved content
                    │      (Anonymous)       │     Pending insert into approvals queue
                    └────────────────────────┘
```

### 5.2 RLS Helper Functions

```sql
-- Checks if caller is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'PLATFORM_OPERATOR')
  );
$$;

-- Extracts caller's territory_id dynamically from JWT claims or profiles
CREATE OR REPLACE FUNCTION public.current_territory_id()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'territory_id'),
    (SELECT territory_id FROM public.profiles WHERE id = auth.uid()),
    (SELECT territory_id FROM public.franchise_staff WHERE user_id = auth.uid() AND status = 'ACTIVE' LIMIT 1)
  );
$$;
```

### 5.3 RLS Policies Matrix for New Tables

| Table | Policy Name | Permitted Operations | Access Condition |
|---|---|:---:|---|
| `public.deals` | `deals_tenant_isolation` | ALL | `public.is_super_admin() OR territory_id = public.current_territory_id()` |
| `public.flows` | `flows_read_public_or_admin` | SELECT | `is_active = true OR public.is_super_admin() OR territory_id = public.current_territory_id()` |
| `public.flows` | `flows_tenant_manage` | INSERT, UPDATE, DELETE | `public.is_super_admin() OR territory_id = public.current_territory_id()` |
| `public.automations` | `automations_tenant_isolation` | ALL | `public.is_super_admin() OR territory_id = public.current_territory_id()` |
| `public.messages` | `messages_tenant_isolation` | ALL | `public.is_super_admin() OR territory_id = public.current_territory_id()` |
| `public.news` | `news_public_read` | SELECT | `is_published = true OR public.is_super_admin() OR territory_id = public.current_territory_id()` |
| `public.news` | `news_tenant_manage` | INSERT, UPDATE, DELETE | `public.is_super_admin() OR territory_id = public.current_territory_id()` |
| `public.shorts` | `shorts_public_read` | SELECT | `is_active = true OR public.is_super_admin() OR territory_id = public.current_territory_id()` |
| `public.banners` | `banners_public_read` | SELECT | `is_active = true OR public.is_super_admin() OR territory_id = public.current_territory_id()` |
| `public.tickers` | `tickers_public_read` | SELECT | `is_active = true OR public.is_super_admin() OR territory_id = public.current_territory_id()` |
| `public.magic_tokens`| `magic_tokens_super_admin` | ALL | `public.is_super_admin()` (Public callers can only execute RPC verification) |
| `public.settings` | `settings_read_admin` | SELECT | `public.is_super_admin() OR public.current_territory_id() IS NOT NULL` |
| `public.settings` | `settings_manage_super_admin` | ALL | `public.is_super_admin()` |

---

## 6. Repeatable, Idempotent Data Migration Plan

### 6.1 Baseline Record Count Reconciliation Target

The migration script must verify that 100% of existing records are migrated without loss or duplicate creation:

| Entity Name | Source (`data/admin_data.json`) | Target Supabase Table | Inactive/Draft Preservation Mandate |
|---|:---:|:---:|---|
| **Territories** | **4** | `public.territories` | Preserves Flagship (`territory_choutuppal`), Nalgonda, Suryapet, Bhongir |
| **Territory Domains**| **5** | `public.territory_domains` | Preserves primary domains and SSL statuses |
| **Franchises** | **3** | `public.franchises` | Preserves commercial models, plans, and feature limits |
| **Listings** | **212** | `public.listings` | Exactly 211 Flagship Choutuppal + 1 Nalgonda (`ON CONFLICT (id) DO UPDATE`) |
| **CRM Contacts** | **211** | `public.contacts` | All 211 merchant contacts with tags and `WON` stage |
| **CRM Deals** | **4** | `public.deals` | All 4 Phase 3E pipeline deals |
| **CRM Flows** | **1** | `public.flows` | Interactive WhatsApp flow with action buttons |
| **Automation Rules** | **179** | **`public.automations`** | **STRICT: All 179 rules MUST migrate as `status='draft'`, `is_active=false`** |
| **WhatsApp Messages**| **1** | `public.messages` | Preserves inbound message record |
| **Approvals Queue** | **3** | `public.approvals` | Preserves pending moderation items |
| **News Articles** | **1** | `public.news` | Preserves multilingual news article |
| **Video Shorts** | **1** | `public.shorts` | Preserves short video card |
| **Banners** | **1** | `public.banners` | Preserves top banner placement |
| **Tickers** | **1** | `public.tickers` | Preserves active ticker marquee |
| **Audit Logs** | **110** | `public.audit_logs` | Preserves full historical audit trail |
| **Settings** | **1** | `public.settings` | Preserves platform WhatsApp and sync flags |

### 6.2 Pre-Migration Safety & Rollback Blueprint

1. **Pre-Flight Snapshot**:
   - Before executing migration, create an immutable timestamped backup:
     `cp data/admin_data.json data/admin_data.json.bak_pre_supabase_$(date +%s)`
2. **Read-Only Migration Execution**:
   - The migration script reads from `data/admin_data.json` and performs batch upserts (`upsert(..., { onConflict: 'id' })`) into Supabase via `SUPABASE_SERVICE_ROLE_KEY`.
   - The script **NEVER calls `fs.unlink()` or `fs.writeFileSync()` on `data/admin_data.json`**.
3. **Automated Reconciliation Checks**:
   - After upserting each batch, the script executes `SELECT count(*) FROM table WHERE ...` and validates `count === baseline`. If count mismatch occurs, migration halts and logs the failed batch.
4. **Idempotence & Rollback Script**:
   - Because all statements use `ON CONFLICT (id) DO UPDATE`, the script can be safely re-run multiple times without creating duplicates.
   - A rollback SQL script (`supabase/rollback_phase5.sql`) will be prepared to truncate tables back to clean state if reconciliation fails.

---

## 7. Dual-Mode Architecture: Repository DAO Adapter Layer

To avoid a risky "big bang" rewrite of 14 API routes, we propose introducing a **Unified Persistence DAO Adapter** ([`src/lib/db/index.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/db/index.ts)) implementing clean repository interfaces:

```
[API Routes & Server Pages]
           │
           ▼
[Unified Repository DAO Layer: src/lib/db/]
           │
           ├─► If isSupabaseConfigured === true  ──► [Supabase PostgreSQL Client (Admin / RLS)]
           │
           └─► If isSupabaseConfigured === false ──► [Local JSON Store (store.ts fallback)]
```

### Benefits of the Dual-Mode Pattern:
1. **Zero Disruption to Existing Tests**: All 11 automated test suites (`test_phase4_listing_lifecycle.py`, `test_phase3e_deals.py`, etc.) continue to run and pass in local Termux environments without requiring live internet connections or Supabase tokens.
2. **Staged Route Cutover**: Endpoints can be switched to the repository pattern one by one, verifying each endpoint in isolation before proceeding to the next.
3. **Vercel Production Readiness**: When deployed to Vercel with real environment variables, the application automatically runs on Supabase PostgreSQL, bypassing Vercel's read-only serverless filesystem constraints.

---

## 8. Staged Implementation Roadmap (5 Execution Phases)

| Phase | Title | Scope & Actions | Pre-requisites & Gates |
|:---:|---|---|---|
| **Phase 5A** | **Schema Completion** | Write `supabase/migrations/02_complete_platform_schema.sql` adding the 10 missing tables, constraints, indexes, and RLS policies. | User approval of this audit plan. |
| **Phase 5B** | **Migration Script** | Create `scripts/migrate-to-supabase.ts` with batch upsert, count reconciliation, and dry-run flag. | Phase 5A SQL executed in Supabase project. |
| **Phase 5C** | **Repository Adapter** | Build `src/lib/db/` DAO layer wrapping listings, contacts, deals, automations, and approvals with dual-mode fallback. | Phase 5B migration tested in dry-run mode. |
| **Phase 5D** | **API Route Cutover** | Progressively adapt the 14 API routes to use the DAO layer instead of raw `loadStore()` / `saveStore()`. | Regression tests pass for each cutover route. |
| **Phase 5E** | **Production Verification** | Execute live Supabase end-to-end smoke tests, verify RLS security boundaries, and validate zero draft automation activation. | All 232 platform checks pass on both backends. |

---

## 9. Verified Findings vs. Stated Assumptions

| Topic | Verified Finding (Inspected & Proven) | Assumption (To be Verified upon Live Connection) |
|---|---|---|
| **Local Store** | `data/admin_data.json` contains exactly 212 listings, 211 contacts, 4 deals, 1 flow, 179 draft automations. | Assumed that future Supabase PostgreSQL instance has sufficient connection pool limits (PgBouncer enabled). |
| **Supabase Config**| `.env.local` contains placeholder values for `NEXT_PUBLIC_SUPABASE_URL` and keys. `isSupabaseConfigured` is `false`. | Assumed user will provide real Supabase project credentials when ready to migrate. |
| **Schema Coverage**| Existing `supabase/schema.sql` only covers 11 of 21 required domain entities; 10 tables are completely missing. | Assumed that standard PostgreSQL 15+ hosted on Supabase supports all required extensions (`uuid-ossp`, `pgcrypto`). |
| **Test Health** | All 11 platform test suites pass with Exit Code 0 (232/232 checks passed). | Assumed that dual-mode DAO layer will allow tests to run offline against JSON fallback indefinitely. |
| **Draft Protection** | All 179 automation rules are verified `draft` (`isActive: false`). Evaluator runs in non-dispatching shadow mode. | Assumed that production rules will remain inactive until individual user authorization. |

---

## 10. Conclusion & Next Action

The audit confirms that the Choutuppal Franchise CRM is functionally complete and stable in local persistence, but requires the expanded PostgreSQL schema (10 missing tables) and the dual-mode DAO abstraction layer before production migration can safely take place.

**Current State**: In accordance with non-negotiable safety constraints:
- Zero files in `data/` were modified or overwritten.
- All 179 automation rules remain in `draft` status.
- No WhatsApp messages or external network calls were dispatched.
- Git status remains preserved.

**Awaiting user review and authorization to proceed with Phase 5A (Complete PostgreSQL Schema DDL).**
