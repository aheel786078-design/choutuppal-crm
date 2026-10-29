# Supabase Readiness & Migration Blueprint (Without Connecting)

**Project**: Mana Choutuppal.in Multi-Town Franchise CRM & SuperApp Platform  
**Directory**: `/data/user/0/com.termux/files/home/storage/downloads/Cpl Crm/choutuppal-franchise-crm`  
**Inspection Date**: October 2026  
**Auditor**: Senior Database Architect & Supabase Specialist  

---

## 1. Existing SQL Schema & Migrations Inventory

The repository contains two SQL files under `supabase/`:
1. `supabase/schema.sql` (551 lines):
   - Standalone, idempotent PostgreSQL 15+ DDL script.
   - Defines all 11 core tables with primary keys, foreign keys, constraints, and JSONB fields.
   - Seeds the protected Flagship Choutuppal territory (`territory_choutuppal`) and primary domain (`choutuppal.in`).
   - Creates performance indexes on all `territory_id` and domain columns.
   - Includes full Row Level Security (RLS) activation and policies for all 11 tables.
2. `supabase/migrations/01_rls_policies.sql` (232 lines):
   - Standalone migration containing the RLS policies, `SECURITY DEFINER` helper functions, and tamper-evident revocation rules.
   - Fully incorporated into `supabase/schema.sql`.

---

## 2. Expected Database Tables & Relationships

| Table Name | Primary Key | Foreign Keys / Territory Anchor | Expected Application Usage |
| :--- | :--- | :--- | :--- |
| `public.territories` | `id` (TEXT) | Root Entity (`is_flagship`, `status`, `type`) | Flagship & franchise town registry. |
| `public.franchises` | `id` (TEXT) | `territory_id` -> `territories(id)` | Partner onboarding, plans, limits, and commercial terms. |
| `public.territory_domains` | `id` (TEXT) | `territory_id` -> `territories(id)` | Custom domains & subdomains. |
| `public.profiles` | `id` (UUID/TEXT) | `territory_id` -> `territories(id)` | User accounts, roles (`SUPER_ADMIN`, `FRANCHISE_ADMIN`). |
| `public.franchise_staff` | `id` (TEXT) | `territory_id` -> `territories(id)` | Sub-staff assignments per town. |
| `public.listings` | `id` (TEXT) | `territory_id` -> `territories(id)` | 211 business & property listings with photos and categories. |
| `public.approvals` | `id` (TEXT) | `territory_id` -> `territories(id)` | Pending moderation items (listings, shorts, franchise apps). |
| `public.stories` | `id` (TEXT) | `territory_id` -> `territories(id)` | 24-hour merchant photo stories. |
| `public.offers` | `id` (TEXT) | `territory_id` -> `territories(id)` | Promotional discount coupons and vouchers. |
| `public.contacts` | `id` (TEXT) | `territory_id` -> `territories(id)` | CRM merchant leads and WhatsApp inquiries. |
| `public.audit_logs` | `id` (TEXT) | `territory_id` -> `territories(id)` | Tamper-evident append-only operational audit trail. |

---

## 3. Row Level Security (RLS) Architecture & Functions

### Helper Security Functions (`SECURITY DEFINER`):
- `public.is_super_admin()`: Verifies if the authenticated caller (`auth.uid()`) possesses `role IN ('SUPER_ADMIN', 'PLATFORM_OPERATOR')` in `public.profiles`.
- `public.current_territory_id()`: Dynamically extracts the caller's assigned territory from `public.profiles` or `public.franchise_staff`.
- `public.is_territory_active(target_territory_id TEXT)`: Verifies that the target territory is active and its franchise is not suspended.

### RLS Policies Highlights:
- `listings_tenant_insert / update / delete`: Restricts operations strictly to `territory_id = public.current_territory_id()` and verifies territory is active.
- `profiles_update_own`: Users can update their name/avatar, but **cannot modify their `role` or `territory_id`** (prevents privilege escalation).
- `contacts_scoped_read / manage`: Public read is strictly blocked; franchise admins can only query their own town leads.
- `audit_logs`: `REVOKE UPDATE, DELETE ON public.audit_logs FROM anon, authenticated` prevents log tampering.

---

## 4. Required Environment Variables (Names Only)

For a successful Supabase connection, the following environment variables are required in `.env.local` / Vercel:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

---

## 5. Client Initialization Analysis

- `src/lib/supabase.ts` already contains the factory functions:
  - `getSupabaseBrowserClient()`: Creates client using `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - `getSupabaseAdminClient()`: Creates server client using `SUPABASE_SERVICE_ROLE_KEY` (service role with `persistSession: false`).
- Safe Guard: `isSupabaseConfigured` returns `false` if the URL is empty or contains placeholder text (`your-project`).

---

## 6. Local Store vs. Supabase Integration Gaps

Currently, there is a **100% gap** between API route logic and Supabase:
- **API Handlers**: All 13 endpoints in `src/app/api/` import `loadStore()` and `saveStore()` from `src/lib/store.ts`. None currently call `getSupabaseAdminClient()`.
- **Database Tables**: Tables do not yet exist in any remote Supabase project because the user has not yet connected credentials or executed SQL.
- **Data Persistence**: If Supabase credentials were added today without adapting the API handlers, the application would still continue writing to `data/admin_data.json` until the handlers are refactored to query Supabase tables.

---

## 7. Risks of Connecting Supabase Prematurely

1. **Risk of Data Loss / Desynchronization**: If Supabase is connected before migrating the 211 listings and 3 franchise networks from `data/admin_data.json`, the remote database would be empty while the local UI assumes data exists.
2. **Dual-Store Divergence**: If some endpoints are switched to Supabase while others remain on `admin_data.json`, data will desynchronize (e.g. an approved listing in Supabase not appearing in local CRM flows).
3. **Vercel Serverless Write Failures**: Deploying to Vercel before switching API handlers to Supabase will cause runtime crashes when handlers attempt to execute `fs.writeFileSync()` on Vercel's read-only filesystem.

---

## 8. Safe Supabase Migration Checklist

Before connecting Supabase, the following steps must be followed:
1. **Step 1 (Schema Execution)**: Create a new project in Supabase Dashboard and run `supabase/schema.sql` in the SQL Editor.
2. **Step 2 (Data Seeding)**: Run a dedicated one-time migration script to populate Supabase tables with the 211 listings, territories, and contacts from `data/admin_data.json`.
3. **Step 3 (Dual-Mode DAO Layer)**: Implement a database adapter in `src/lib/db.ts` that queries Supabase when configured and gracefully falls back to `admin_data.json` during local development.
4. **Step 4 (Test Verification)**: Re-run `test_franchise_platform.py` and `test_security_audit.py` to ensure zero regressions.
