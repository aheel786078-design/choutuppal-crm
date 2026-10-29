# Supabase Implementation & Architecture Plan

**Project**: Choutuppal WhatsApp CRM & Multi-Town Platform  
**Target Domain**: [choutuppal.in](https://choutuppal.in)  
**Supabase Project Reference**: `llcfxewxqrmdzlvnzzxm`  
**Date**: October 29, 2026  

---

## 1. Architectural Philosophy: The Dual-Mode DAO

To eliminate downtime, prevent data loss, and avoid breaking existing public website routes, the Supabase integration follows a **Dual-Mode Data Access Object (DAO)** pattern:

```text
┌────────────────────────────────────────────────────────┐
│                   Next.js API & UI                     │
│    (/api/crm/*, /api/admin/*, /listings, /business)    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               Unified DAO (supabase-dao.ts)             │
│  - Multi-tenant territory filter enforcement           │
│  - Typed pagination, sorting, and boundary validation  │
└─────────────┬────────────────────────────┬─────────────┘
              │ (Remote Configured)        │ (Local Fallback)
              ▼                            ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   Remote Supabase DB     │  │   data/admin_data.json   │
│   (PostgreSQL 17.11)     │  │   (Optimistic Mutex)     │
└──────────────────────────┘  └──────────────────────────┘
```

---

## 2. Implementation Phases & Milestones

### Phase 1: DAO Abstraction & Safe Fallback (Completed & Verified)
- Implemented `src/lib/supabase-dao.ts` exposing typed query interfaces:
  - `getListingsDAO(params)` with pagination, territory scoping, and category filtering.
  - `getContactsDAO(params)` with stage filtering and phone/name search.
  - `getAutomationsDAO(params)` with active status filtering.
- Implemented automatic fallback to `store.ts` when Supabase is not configured or offline.
- Verified TypeScript compilation: **0 errors**.

### Phase 2: Schema Modularization (Completed)
Created versioned, idempotent PostgreSQL migrations under `supabase/migrations/`:
1. `01_core_platform_schema.sql` (Territories, Franchises, Domains, Profiles, Staff, Listings, Approvals, Stories, Offers, Contacts, Audit Logs).
2. `02_crm_whatsapp_schema.sql` (Messages, Conversations, Interactive Flows, Automations, Automation Logs, Deals, Broadcasts, Webhooks).
3. `03_content_monetization_schema.sql` (News, Shorts, Banners, Tickers, Government Directory, Plans, Subscriptions, Payments).
4. `04_rls_security_policies.sql` (Multi-tenant RLS policies, security definer functions, tamper-evident revocation).

### Phase 3: Data Migration & Reconciliation (Dry-Run Verified)
- Implemented `scripts/supabase_dry_run_reconciliation.mjs` verifying:
  - 212 listings, 211 contacts, 179 automations.
  - Zero PK duplicates.
  - 100% referential integrity across all foreign keys.
  - UTF-8 Telugu character fidelity.
- Created verified SHA-256 backup: `data/backups/admin_data_20261029_142214_d6a6e8ba.json`.

### Phase 4: Production Authorization & Rollout (Pending User Approval)
- Step 4.1: User reviews and approves migration SQL scripts.
- Step 4.2: Execute migrations against Supabase SQL Editor.
- Step 4.3: Execute one-time idempotent data seeding script.
- Step 4.4: Verify row counts in Supabase match `admin_data.json`.
- Step 4.5: Update environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

---

## 3. Boundary & Security Rules
- **No Direct Table Exposure**: Client-side code queries through API routes or scoped DAO functions.
- **Service Role Isolation**: `SUPABASE_SERVICE_ROLE_KEY` is strictly used in server environments (`getSupabaseAdminClient()`).
- **Territory Lockdown**: Every query automatically appends `.eq('territory_id', territoryId)` to enforce multi-tenant isolation.
