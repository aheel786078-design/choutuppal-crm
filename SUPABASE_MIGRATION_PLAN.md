# Supabase Migration Plan & Rollout Strategy

**Project**: Choutuppal WhatsApp CRM & Multi-Town Platform  
**Target Domain**: [choutuppal.in](https://choutuppal.in)  
**Supabase Project Ref**: `llcfxewxqrmdzlvnzzxm`  
**Host URL**: `https://llcfxewxqrmdzlvnzzxm.supabase.co`  
**Status**: **PROPOSAL & STAGED (AWAITING USER APPROVAL — ZERO WRITES EXECUTED)**  
**Date**: October 29, 2026  

---

## 1. Migration Overview & Safeguards

This migration plan outlines the exact, verified procedure to transition the Choutuppal CRM data from the local JSON store (`data/admin_data.json`) to the hosted PostgreSQL instance on Supabase (`llcfxewxqrmdzlvnzzxm`).

> [!IMPORTANT]
> **ZERO PRODUCTION WRITES EXECUTED**: All database writes, DDL mutations, and inserts remain strictly blocked. The MCP server is locked in `read_only=true`. All scripts and schema files are staged locally and awaiting explicit user authorization.

---

## 2. Verified Migration Files Inventory

The migration suite is strictly organized in execution order under `supabase/migrations/`:

| Migration Order & File | Tables Created | Key Improvements & Lossless Fixes |
| :--- | :--- | :--- |
| **`01_core_platform_schema.sql`** | `territories`, `franchises`, `territory_domains`, `profiles`, `franchise_staff`, `listings`, `approvals`, `stories`, `offers`, `contacts`, `audit_logs` | Added `website` to `listings`, `immutable` to `territories`, `territory_name` / `territory_slug` to `franchises`. |
| **`02_crm_whatsapp_schema.sql`** | `whatsapp_messages`, `conversations`, `whatsapp_flows`, `automation_rules`, `automation_logs`, `crm_deals`, `broadcast_campaigns`, `webhook_events` | Added `is_global`, `status`, `is_supported` to `automation_rules`; added `description`, `phone`, `tag` to `crm_deals`; added `contact_name`, `message_text` to `whatsapp_messages`. |
| **`03_content_monetization_schema.sql`** | `news_items`, `short_items`, `banner_items`, `ticker_items`, `government_contacts`, `listing_plans`, `listing_subscriptions`, `featured_promotions`, `payment_orders`, `payment_transactions` | Added `telugu_title`, `summary`, `cover_image`, `is_published` to `news_items`; added `tags`, `is_active` to `short_items`; added `link_url`, `clicks`, `impressions` to `banner_items`. |
| **`04_rls_security_policies.sql`** | All 29 tables | Enabled RLS on all 29 tables; defined security functions (`is_super_admin`, `current_territory_id`, `is_territory_active`) with strict `search_path = public`; revoked UPDATE/DELETE on audit & webhook logs. |

A master consolidated script combining all 4 parts in order is located at [`supabase/schema.sql`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/supabase/schema.sql).

---

## 3. Local JSON-to-Table Mapping & Row-Count Reconciliation

Empirically verified via `scripts/supabase_dry_run_reconciliation.mjs` and field mapping auditor:

| Collection in `admin_data.json` | Target Supabase Table | Record Count | Unmapped Fields |
| :--- | :--- | :--- | :--- |
| `listings` | `public.listings` | **212** | **0 (100% Lossless)** |
| `contacts` | `public.contacts` | **211** | **0 (100% Lossless)** |
| `automations` | `public.automation_rules` | **179** | **0 (100% Lossless)** |
| `territories` | `public.territories` | **4** | **0 (100% Lossless)** |
| `franchises` | `public.franchises` | **3** | **0 (100% Lossless)** |
| `territoryDomains` | `public.territory_domains` | **5** | **0 (100% Lossless)** |
| `deals` | `public.crm_deals` | **4** | **0 (100% Lossless)** |
| `approvals` | `public.approvals` | **3** | **0 (100% Lossless)** |
| `auditLogs` | `public.audit_logs` | **110** | **0 (100% Lossless)** |
| `messages` | `public.whatsapp_messages` | **9** | **0 (100% Lossless)** |
| `plans` | `public.listing_plans` | **3** | **0 (100% Lossless)** |
| `news` | `public.news_items` | **1** | **0 (100% Lossless)** |
| `shorts` | `public.short_items` | **1** | **0 (100% Lossless)** |
| `banners` | `public.banner_items` | **1** | **0 (100% Lossless)** |
| `tickers` | `public.ticker_items` | **1** | **0 (100% Lossless)** |

---

## 4. Safe Staging & Execution Procedure (Upon User Authorization)

When authorized, the rollout will execute in 4 gated steps:

### Gate 1: Schema DDL Execution
- **Action**: Run `supabase/schema.sql` in the Supabase Dashboard SQL Editor or via Supabase CLI.
- **Verification Query**:
  ```sql
  SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
  -- Expected result: 29 tables
  ```

### Gate 2: One-Time Idempotent Seeding
- **Action**: Run `node scripts/seed_supabase_from_store.mjs --live`.
- **Safeguard**: All inserts use `ON CONFLICT (id) DO UPDATE` to prevent duplicates.
- **Verification**: Run `scripts/supabase_dry_run_reconciliation.mjs` against remote database to confirm exact record counts.

### Gate 3: Dual-Mode DAO Cutover
- Set environment variables in deployment environment (e.g. Vercel):
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://llcfxewxqrmdzlvnzzxm.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_kzFGoGsWyc9bUGLm3QStfg_0oZrys6b
  SUPABASE_SERVICE_ROLE_KEY=[USER_SERVICE_ROLE_KEY]
  ```
- The DAO layer (`src/lib/supabase-dao.ts`) automatically switches to remote queries while preserving instant local fallback if disconnected.

### Gate 4: Production Regression Verification
- Re-run `test_phase8_webhook_fixes.py` and `test_phase7_backup_recovery.py` to confirm zero regressions in webhook processing, contact upserts, and WhatsApp automation.

---

## 5. Rollback & Disaster Recovery Strategy

1. **Instant Fallback**: If remote database connectivity is interrupted, simply unset `SUPABASE_SERVICE_ROLE_KEY`. The platform immediately falls back to `data/admin_data.json` with zero downtime.
2. **Local Data Restoration**:
   ```bash
   node scripts/backup-manager.mjs restore data/backups/admin_data_20261029_142214_d6a6e8ba.json --force
   ```
3. **Database Reset (Zero Risk to Local Data)**:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```
