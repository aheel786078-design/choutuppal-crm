# Architectural Gaps, Risks & Prioritized Roadmap

**Project**: Mana Choutuppal.in Multi-Town Franchise CRM & SuperApp Platform  
**Directory**: `/data/user/0/com.termux/files/home/storage/downloads/Cpl Crm/choutuppal-franchise-crm`  
**Inspection Date**: October 2026  
**Auditor**: Senior Software Architect & Lead Full-Stack Engineer  

---

## 1. Identified Architecture & Functional Gaps

### GAP 1: Disconnected Admin Content UI Pages (UI Only / Mock Data)
- **Description**: While `/api/admin/content/route.ts` exists and implements CRUD logic for banners, tickers, news, stories, and offers, the corresponding admin UI pages currently maintain their own local React `useState` arrays and do NOT invoke the API.
- **Affected Files**:
  - `src/app/admin/banners/page.tsx`
  - `src/app/admin/ticker/page.tsx`
  - `src/app/admin/news/page.tsx`
  - `src/app/admin/stories-offers/page.tsx`
  - `src/app/admin/shorts/page.tsx`
  - `src/app/admin/inbox/page.tsx`
  - `src/app/admin/broadcasts/page.tsx`
  - `src/app/admin/pipelines/page.tsx`
  - `src/app/admin/settings/page.tsx`
- **Impact**: When an admin creates or edits a banner, news article, or ticker marquee in these pages, the change is lost as soon as the browser tab is refreshed.
- **Remediation**: Wire `useEffect` data fetching and form `fetch('/api/admin/content', { method: 'POST', body: ... })` handlers to the existing backend API.

---

### GAP 2: Missing `syncListingToCrm` Helper in `src/lib/store.ts`
- **Description**: `src/app/api/admin/listings/route.ts` and `src/app/api/admin/approvals/route.ts` both import `syncListingToCrm` from `@/lib/store`. However, `syncListingToCrm` is not currently defined or exported in `src/lib/store.ts`.
- **Impact**: Approving a new listing or adding a listing through the admin API triggers a runtime `TypeError: (0, _store.syncListingToCrm) is not a function`.
- **Remediation**: Implement `export function syncListingToCrm(listing: Listing): void` in `src/lib/store.ts` to automatically append new listings into active CRM keyword flows or handle synchronization gracefully.

---

### GAP 3: Supabase Runtime Disconnection
- **Description**: `supabase/schema.sql` is a complete, production-grade schema with 11 tables and full RLS policies. However, the runtime application code (`src/lib/store.ts` and all 13 API routes) currently reads from and writes to `data/admin_data.json`.
- **Impact**: The application is not yet executing SQL queries against Supabase.
- **Remediation**: Build a unified Data Access Object (DAO) layer that bridges API routes to Supabase when environment variables are set, falling back to `admin_data.json` for local/offline dev.

---

### GAP 4: Vercel Serverless Filesystem Ephemerality
- **Description**: In a local Termux/Node.js environment, `fs.writeFileSync(DATA_FILE, ...)` persists successfully to disk. On Vercel, the serverless execution environment has a read-only filesystem (except `/tmp`).
- **Impact**: If deployed to Vercel before connecting Supabase, all write operations (`POST /api/admin/franchises`, `POST /api/admin/listings`, `POST /api/auth/magic-link`) will fail with filesystem permission errors.
- **Remediation**: Connecting Supabase is a prerequisite for production Vercel deployment.

---

### GAP 5: Missing External Provider Credentials
- **Description**: Meta Cloud API credentials (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`) and Cloudflare R2 credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) are not yet configured.
- **Impact**: Real WhatsApp message dispatch and real Cloudflare object storage cannot execute without live provider credentials (local fallbacks are currently active).
- **Remediation**: User must acquire and set these environment variables in Vercel.

---

## 2. Risk Assessment Matrix

| Risk Factor | Likelihood | Impact | Severity | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Deploying to Vercel before Supabase** | High | Critical | **CRITICAL** | Complete Supabase migration before production Vercel deployment. |
| **Runtime Crash on `syncListingToCrm`** | High | High | **HIGH** | Implement `syncListingToCrm` in `src/lib/store.ts` immediately. |
| **Admin Content UI Desynchronization** | High | Medium | **MEDIUM** | Wire admin content pages to `/api/admin/content`. |
| **Missing Meta Cloud API Credentials** | Medium | Medium | **MEDIUM** | Maintain resilient fallback logging; input credentials when available. |
| **Dual Store Divergence during Migration** | Medium | High | **HIGH** | Perform one-time atomic migration of `admin_data.json` to Supabase. |

---

## 3. Prioritized Implementation Roadmap

### Phase 1: Local Code Integrity & Gap Fixes (Immediate)
1. **Fix `syncListingToCrm`**: Add the missing export to `src/lib/store.ts` to prevent runtime type errors on listing creation and approval.
2. **Wire Disconnected Admin Content Pages**: Connect `banners/page.tsx`, `ticker/page.tsx`, `news/page.tsx`, `stories-offers/page.tsx`, and `shorts/page.tsx` to `/api/admin/content`.
3. **Verify Local End-to-End Flow**: Ensure all admin content changes persist across page reloads in `data/admin_data.json`.

### Phase 2: Supabase Schema Execution & Data Migration
1. **Execute SQL Schema**: Run `supabase/schema.sql` in the Supabase SQL Editor.
2. **One-Time Data Migration Script**: Create and run a script to upload the 211 listings, flagship territory, franchise records, and contacts from `data/admin_data.json` into Supabase tables.
3. **Configure Environment Variables**: Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`.

### Phase 3: API Layer Supabase Adaptation
1. **Refactor API Routes**: Adapt `/api/admin/*` and `/api/crm/*` to query Supabase tables when `isSupabaseConfigured` is true.
2. **Preserve Fallback Mechanism**: Keep `admin_data.json` fallback active for offline development.
3. **Retest RLS Policies**: Execute live database queries using test tokens for Franchise A and Franchise B to confirm RLS enforcement.

### Phase 4: Production Vercel Deployment & Provider Activation
1. **Configure Production Variables**: Set `SESSION_SECRET`, `WHATSAPP_APP_SECRET`, and Supabase credentials in Vercel Project Settings.
2. **Deploy to Vercel**: Push to production branch and verify public domain (`choutuppal.in`).
3. **Configure Partner Domains**: Add DNS CNAME records for town franchises (`suryapet.in`, `bhongir.choutuppal.in`).
