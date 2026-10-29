# Pre-Supabase Gap Closure & Architecture Plan

**Project**: Mana Choutuppal.in Multi-Town Franchise CRM & SuperApp Platform  
**Directory**: `/data/user/0/com.termux/files/home/storage/downloads/Cpl Crm/choutuppal-franchise-crm`  
**Date**: October 2026  
**Auditor**: Senior Software Architect, Product Analyst & QA Specialist  
**Status**: **SOURCE-CODE VERIFIED • ZERO CODE MODIFICATIONS • READY FOR IMPLEMENTATION**

---

## 1. Direct Source-Code Verification of Reported Gaps

Every reported gap has been independently verified against the actual codebase. None were assumed to be correct without proof.

### Summary Verification Status

| Item # | Reported Gap | Source Files Verified | Verified Finding | Priority & Timing |
| :---: | :--- | :--- | :--- | :--- |
| **Gap 1** | `syncListingToCrm` imported but not exported in `store.ts` | `src/app/api/admin/listings/route.ts:2,142,192`<br>`src/app/api/admin/approvals/route.ts:2,114`<br>`src/lib/store.ts` | **CONFIRMED DEFECT**. Imported in 2 routes; absent in `store.ts`. Causes runtime `TypeError` when creating, updating, or approving listings. | **MUST FIX BEFORE SUPABASE** |
| **Gap 2** | Shared Inbox uses mock messages & local `useState` | `src/app/admin/inbox/page.tsx:20`<br>`src/app/crm/inbox/page.tsx:20` | **CONFIRMED DEFECT**. Uses hardcoded array in React `useState`. Does not read or write to `store.messages` or `/api/`. | **CAN FOLLOW AFTER OR ALONGSIDE** |
| **Gap 3** | Broadcast sending simulates success via `setTimeout` | `src/app/admin/broadcasts/page.tsx:21`<br>`src/app/crm/broadcasts/page.tsx:21` | **CONFIRMED DEFECT**. Client-side `setTimeout` (1200ms) simulation with zero backend call, zero campaign persistence, and zero quota deduction. | **CAN FOLLOW AFTER OR ALONGSIDE** |
| **Gap 4** | Pipelines use mock deal data and local `useState` | `src/app/admin/pipelines/page.tsx:15`<br>`src/app/crm/pipelines/page.tsx:15` | **CONFIRMED DEFECT**. Hardcoded `deals` array (`d1`-`d4`). Moving stages only mutates local state in memory. Zero persistence. | **CAN FOLLOW AFTER OR ALONGSIDE** |
| **Gap 5** | Admin content pages disconnected from `/api/admin/content` | `src/app/admin/banners/page.tsx`<br>`src/app/admin/ticker/page.tsx`<br>`src/app/admin/news/page.tsx`<br>`src/app/admin/stories-offers/page.tsx` | **CONFIRMED DEFECT**. The backend API (`/api/admin/content/route.ts`) is fully built, but UI pages maintain separate mock React `useState` arrays. | **FIX BEFORE SUPABASE** |
| **Gap 6** | Shorts submission UI bypasses existing API route | `src/app/shorts/page.tsx:123`<br>`src/app/api/shorts/submit/route.ts` | **CONFIRMED DEFECT**. `handleAddReel()` in `shorts/page.tsx` directly appends unmoderated reels to local state, bypassing `/api/shorts/submit` approval queue. | **FIX BEFORE SUPABASE** |
| **Gap 7** | CRM automations loaded from CSV without execution engine | `src/app/crm/automations/page.tsx:37`<br>`src/app/api/crm/automations/route.ts:9` | **CONFIRMED DEFECT**. The CSV and API are static rule definitions. Zero background workers, triggers, retries, or execution runners exist. | **DESIGN FIRST, ENGINE WITH SUPABASE** |
| **Gap 8** | Supabase is unconnected; runtime runs on `admin_data.json` | `src/lib/supabase.ts:7-9`<br>`src/lib/store.ts:81`<br>All 13 routes in `src/app/api/` | **CONFIRMED ARCHITECTURE**. Local runtime relies entirely on `data/admin_data.json`. Vercel deployment will fail write operations until Supabase is hooked up. | **CORE MIGRATION TASK** |

---

## 2. In-Depth Analysis & Remediation Plan for Each Gap

---

### Gap 1: Special Requirement — `syncListingToCrm`

#### A. Source-Code Inspection & Forensic Reconstruction
1. **`src/app/api/admin/listings/route.ts`**:
   - Line 2: `import { loadStore, saveStore, syncListingToCrm, FLAGSHIP_TERRITORY_ID } from '@/lib/store'`
   - Lines 109-140: Constructs `const newListing: Listing = { id, territoryId, slug, title, ... }`.
   - Line 142: Calls `syncListingToCrm(newListing)`.
   - **Crucial Observation**: Line 142 is the **ONLY** place in `POST /api/admin/listings` where the listing is persisted! The route does **NOT** call `store.listings.push(newListing)` or `saveStore(store)`.
   - Lines 186-190: Constructs `const updated: Listing = { ...existing, ...updates, updatedAt }`.
   - Line 192: Calls `syncListingToCrm(updated)`.
   - **Crucial Observation**: Line 192 is also the **ONLY** place in `PUT /api/admin/listings` where the updated listing is saved!
2. **`src/app/api/admin/approvals/route.ts`**:
   - Line 2: `import { loadStore, saveStore, syncListingToCrm, generateMagicToken, FLAGSHIP_TERRITORY_ID, logAuditEvent } from '@/lib/store'`
   - Lines 86-112: Constructs `const newListing: Listing = { id, territoryId, slug, title, ... }` when an approval item of type `NEW_LISTING` is approved.
   - Line 114: Calls `syncListingToCrm(newListing)`.
   - The route then updates `item.status = 'approved'`, logs outbound messages, and calls `saveStore(store)` at the end (line 272).
3. **`src/lib/store.ts`**:
   - Defines `AdminDataStore` with `listings: Listing[]`, `contacts: CRMContact[]`, `flows: CRMFlowConfig[]`.
   - Line 76 & 419: Defines settings flag `syncListingsToCrmFlow: true`.
   - **`syncListingToCrm` is completely missing from exports**.

#### B. Intended Behavior & Smallest Compatible Implementation
The surrounding code proves that `syncListingToCrm(listing: Listing)` has two core duties:
1. **Listing Persistence (Idempotent Upsert)**:
   - Check if `listing.id` already exists in `store.listings`.
   - If it exists, update it in place (`store.listings[idx] = listing`).
   - If it does not exist, insert it at the beginning (`store.listings.unshift(listing)`).
2. **CRM Lead / Merchant Auto-Sync**:
   - Check if a contact with `phone === listing.phone` exists in `store.contacts`.
   - If missing, create a new `CRMContact`:
     ```typescript
     {
       id: `cnt_${Date.now()}_${listing.id}`,
       territoryId: listing.territoryId,
       name: listing.title,
       phone: listing.phone,
       tags: [listing.categoryName || 'Merchant', 'AutoSynced'],
       stage: 'WON',
       lastContact: new Date().toISOString()
     }
     ```
   - If existing, ensure `territoryId` matches and tag `Merchant` is attached.
3. **Persistence**:
   - Execute `saveStore(store)`.
   - Return cleanly without throwing.

#### C. Exact Signature to Add in `src/lib/store.ts`
```typescript
/**
 * Idempotently upserts a listing into store.listings, synchronizes the merchant
 * into store.contacts, and commits the store to disk.
 */
export function syncListingToCrm(listing: Listing): void {
  const store = loadStore()
  if (!store.listings) store.listings = []
  if (!store.contacts) store.contacts = []

  // 1. Upsert Listing
  const existingIdx = store.listings.findIndex((l) => l.id === listing.id || l.slug === listing.slug)
  if (existingIdx !== -1) {
    store.listings[existingIdx] = { ...store.listings[existingIdx], ...listing }
  } else {
    store.listings.unshift(listing)
  }

  // 2. Synchronize Merchant to CRM Contacts (if phone exists)
  if (listing.phone) {
    const cleanPhone = listing.phone.replace(/\D/g, '')
    const existingContact = store.contacts.find((c) => c.phone.replace(/\D/g, '') === cleanPhone)

    if (!existingContact) {
      store.contacts.unshift({
        id: `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        territoryId: listing.territoryId || FLAGSHIP_TERRITORY_ID,
        name: listing.title,
        phone: listing.phone,
        email: listing.email || '',
        tags: [listing.categoryName || 'Merchant', 'VerifiedBusiness'],
        stage: 'WON',
        lastContact: new Date().toISOString(),
      })
    } else {
      if (!existingContact.tags.includes('VerifiedBusiness')) {
        existingContact.tags.push('VerifiedBusiness')
      }
    }
  }

  saveStore(store)
}
```

#### D. Acceptance Tests for Gap 1:
1. **Create Flow Test**: Send `POST /api/admin/listings` with a new listing. Verify:
   - Does NOT throw `TypeError`.
   - Returns HTTP 201/200.
   - Listing appears in `data/admin_data.json` under `store.listings`.
   - Merchant contact appears in `store.contacts` with matching `territoryId`.
2. **Update Flow Test**: Send `PUT /api/admin/listings` updating the title. Verify:
   - Updated title persists in `store.listings`.
   - Listing count does not increase (no duplicate created).
3. **Approval Flow Test**: Send `POST /api/admin/approvals` with `action: 'approve'` for a `NEW_LISTING`. Verify:
   - Listing is published into `store.listings`.
   - Submitter receives confirmation entry in `store.messages`.

---

### Gap 2: Shared Inbox Persistence

#### A. Source Inspection
- Files: `src/app/admin/inbox/page.tsx` and `src/app/crm/inbox/page.tsx`.
- Current Behavior: Hardcoded array in `useState` (3 static messages from Ramesh, Super Admin, Kishore Reddy). When admin clicks "Send Reply", `setMessages` only appends to client memory.
- Expected Behavior:
  - Fetches conversation threads from `/api/whatsapp/messages?territoryId=...`.
  - Groups messages by `phone` number into conversation threads.
  - Sending a reply calls `POST /api/whatsapp/send`, which logs outbound message into `store.messages` and dispatches via Meta API if credentials exist.
- Data Model:
  ```typescript
  interface WhatsAppMessage {
    id: string
    territoryId: string
    phone: string
    contactName?: string
    direction: 'inbound' | 'outbound'
    messageText: string
    imageUrl?: string
    status: 'received' | 'sent' | 'delivered' | 'read'
    createdAt: string
  }
  ```
- Tenant Scoping: Super Admin sees all conversations; Franchise Admin only sees messages where `territoryId === auth.user.territoryId`.
- Fix Timing: Can be implemented alongside or immediately following Supabase migration.

---

### Gap 3: Broadcast Campaigns Persistence & Dispatch

#### A. Source Inspection
- Files: `src/app/admin/broadcasts/page.tsx` and `src/app/crm/broadcasts/page.tsx`.
- Current Behavior: Form submit triggers `setTimeout(() => setIsSending(false), 1200)`. Zero API calls or records created.
- Expected Behavior:
  1. Distinguish between a **Broadcast Campaign Definition** and **Individual Message Deliveries**.
  2. Submitting the form calls `POST /api/crm/broadcasts`.
  3. Validates quota: Checks `franchise.featureLimits.maxMonthlyBroadcasts` against current month's count.
  4. Saves campaign entity to `store.broadcasts`.
  5. Queues message jobs targeting audience contacts matching `territoryId`.
  6. Dispatches to WhatsApp API if configured, updating delivery status (`PENDING`, `SENT`, `FAILED`).
- Data Model:
  ```typescript
  interface BroadcastCampaign {
    id: string
    territoryId: string
    title: string
    messageText: string
    imageUrl?: string
    targetAudience: 'ALL' | 'MERCHANTS' | 'RESIDENTS' | 'LEADS'
    recipientCount: number
    deliveredCount: number
    status: 'DRAFT' | 'QUEUED' | 'SENDING' | 'COMPLETED' | 'FAILED'
    createdAt: string
  }
  ```
- Tenant Scoping: Franchise Admin can only broadcast to contacts within their own `territoryId`.
- Fix Timing: Needs `POST /api/crm/broadcasts` endpoint and campaign schema.

---

### Gap 4: Sales Pipeline (Kanban) Persistence

#### A. Source Inspection
- Files: `src/app/admin/pipelines/page.tsx` and `src/app/crm/pipelines/page.tsx`.
- Current Behavior: Hardcoded array of 4 deals (`d1` to `d4`). Dragging or moving stages only mutates local component state.
- Expected Behavior:
  - Fetches deals from `GET /api/crm/pipelines?territoryId=...`.
  - Moving stage calls `PUT /api/crm/pipelines` with `{ dealId, newStage }`.
  - Persists changes to `store.deals` or Supabase `crm_deals` table.
- Data Model:
  ```typescript
  interface PipelineDeal {
    id: string
    territoryId: string
    title: string
    stage: 'NEW_LEAD' | 'CONTACTED' | 'QUALIFIED' | 'WON' | 'LOST'
    value: string
    phone: string
    tag: string
    updatedAt: string
  }
  ```
- Tenant Scoping: Scoped to caller's `territoryId`.
- Fix Timing: Can follow after Supabase schema table creation.

---

### Gap 5: Disconnected Admin Content Pages (Banners, Tickers, News, Stories-Offers)

#### A. Source Inspection
- Files:
  - `src/app/admin/banners/page.tsx`
  - `src/app/admin/ticker/page.tsx`
  - `src/app/admin/news/page.tsx`
  - `src/app/admin/stories-offers/page.tsx`
- Backend API Status:
  - `src/app/api/admin/content/route.ts` is **ALREADY IMPLEMENTED**! It handles:
    - `GET`: returns `{ banners, stories, offers, tickers, news, shorts }`.
    - `POST`: handles `create`, `delete`, and `toggle` actions and commits them via `saveStore(store)`.
- Disconnect:
  - The UI pages never call `/api/admin/content`! They initialize state with hardcoded items and only append to local `useState`.
- Expected Behavior:
  - Add `useEffect` on mount calling `fetch('/api/admin/content')`.
  - Wire `handleSave` to `fetch('/api/admin/content', { method: 'POST', body: JSON.stringify({ type: 'banner', action: 'create', item: ... }) })`.
  - Wire `handleDelete` to `fetch('/api/admin/content', { method: 'POST', body: JSON.stringify({ type: 'banner', action: 'delete', id }) })`.
- Fix Timing: **HIGH PRIORITY (PRE-SUPABASE)**. Low complexity, high value. Reconnects UI to existing working backend API.

---

### Gap 6: Community Shorts Submission Gating

#### A. Source Inspection
- Files: `src/app/shorts/page.tsx` and `src/app/api/shorts/submit/route.ts`.
- Current Behavior:
  - `handleAddReel()` in `src/app/shorts/page.tsx` does:
    ```typescript
    setShorts([newReel, ...shorts])
    setIsSubmitOpen(false)
    toast.success('Reel added successfully to feed!')
    ```
  - It does NOT call `/api/shorts/submit`!
  - Meanwhile, `src/app/api/shorts/submit/route.ts` creates a pending item in `store.approvals` for admin moderation.
- Expected Behavior:
  - `handleAddReel()` should call:
    ```typescript
    await fetch('/api/shorts/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: submitTitle,
        videoUrl: submitUrl,
        tags: [submitTag],
        territoryId: currentTerritoryId,
      }),
    })
    ```
  - Shows toast: *"Reel submitted for approval! It will appear on the feed once verified by local admin."*
  - Admin sees the reel under `/admin/approvals` tab, approves it, and it publishes to `store.shorts`.
- Fix Timing: **HIGH PRIORITY (PRE-SUPABASE)**. Enforces moderation guardrails and stops spam submissions.

---

### Gap 7: CRM Automation Execution Engine Specification

#### A. Source Inspection
- Files: `csv/sample_automations.csv`, `src/app/crm/automations/page.tsx`, `src/app/api/crm/automations/route.ts`.
- Current Behavior: Purely a static CSV viewer. The rules in `sample_automations.csv` are never evaluated or triggered against any real incoming message or lead event.
- Expected Architecture Specification:

```
[Incoming Event] ──► [Automation Trigger Evaluator] ──► [Condition Match] ──► [Action Dispatcher]
(WhatsApp Message     (Keyword / First Message /        (Is active?           (Send message /
or New Lead Form)      Listing Published)                Territory matched?)   Add CRM tag)
                                                                                    │
                                                        [Idempotency Check] ◄───────┘
                                                        (Deduplicate via eventId)
                                                                │
                                                                ▼
                                                        [Audit Trail Log]
```

1. **Triggers Supported**:
   - `INBOUND_KEYWORD`: Triggered when an incoming WhatsApp message matches a keyword (e.g. `taxi`, `plumber`, `plots`).
   - `FIRST_INBOUND_MESSAGE`: Triggered when a new phone number contacts the bot for the first time.
   - `LISTING_APPROVED`: Triggered when an admin approves a merchant listing.
   - `LEAD_SUBMITTED`: Triggered when a customer submits an inquiry on the website.
2. **Execution Runner**:
   - Invoked synchronously inside `/api/whatsapp/webhook/route.ts` during incoming message processing.
   - For scheduled/time-delayed follow-ups (e.g. "Send follow-up 24 hours later"), an asynchronous job record is written to `automation_jobs` table and evaluated via periodic cron/Vercel cron.
3. **Idempotency & Retries**:
   - Every incoming event has a unique `eventId` or WhatsApp `messageId`.
   - Prevent duplicate responses by logging processed event IDs.
   - Max 3 retries on network failures with exponential backoff.
4. **Audit Logging**:
   - Record execution in `store.auditLogs` with `action: 'AUTOMATION_EXECUTED'`, `ruleId`, `recipientPhone`, `territoryId`.
- Fix Timing: Design specified now; full worker engine to be integrated with Supabase background jobs.

---

### Gap 8: Supabase Unconnected — Transition Architecture

#### A. Current State
- `data/admin_data.json` is the sole persistent store.
- 13 API routes read/write synchronously to `admin_data.json`.
- `supabase/schema.sql` has 11 tables and RLS policies defined.
- Remote Supabase instance is not yet connected.

#### B. Safe Transition Architecture
To transition without breaking features or losing data:
1. Build a **Data Access Object (DAO)** abstraction layer in `src/lib/db/`:
   ```typescript
   export async function getListings(territoryId?: string): Promise<Listing[]> {
     if (isSupabaseConfigured) {
       const client = getSupabaseAdminClient()
       let query = client.from('listings').select('*')
       if (territoryId && territoryId !== 'all') {
         query = query.eq('territory_id', territoryId)
       }
       const { data, error } = await query
       if (!error && data) return data.map(mapDbListingToModel)
     }
     // Graceful offline fallback
     const store = loadStore()
     return territoryId && territoryId !== 'all'
       ? store.listings.filter(l => l.territoryId === territoryId)
       : store.listings
   }
   ```
2. This ensures:
   - When Supabase credentials exist, it queries PostgreSQL.
   - If Supabase is offline, unreachable, or in local dev without keys, it gracefully falls back to `data/admin_data.json`.
   - Zero downtime during cutover.

---

## 3. Shared Persistent CRM Data Architecture

To prevent incompatible, fragmented storage across pages, all CRM entities will follow this standardized multi-tenant schema:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CENTRAL TERRITORY ANCHOR                              │
│                               territories                                   │
└───────┬─────────────────────────────┬─────────────────────────────┬─────────┘
        │                             │                             │
        ▼                             ▼                             ▼
┌──────────────┐              ┌──────────────┐              ┌──────────────┐
│   listings   │              │   contacts   │              │   messages   │
│ territory_id │              │ territory_id │              │ territory_id │
└───────┬──────┘              └───────┬──────┘              └──────────────┘
        │                             │
        ▼                             ▼
┌──────────────┐              ┌──────────────┐
│  approvals   │              │  broadcasts  │
│ territory_id │              │ territory_id │
└──────────────┘              └──────────────┘
```

### Minimum Required Entities & Scoping Rules:
1. **`messages`**: Scoped by `territory_id`. Tracks real inbound and outbound WhatsApp conversations. Connected to Shared Inbox.
2. **`broadcasts`**: Scoped by `territory_id`. Tracks campaign name, audience filter, scheduled time, and status (`DRAFT`, `QUEUED`, `COMPLETED`).
3. **`contacts`**: Scoped by `territory_id`. Tracks merchant leads and citizen inquiries with stages (`NEW_LEAD`, `CONTACTED`, `QUALIFIED`, `WON`, `LOST`). Shared between Contacts view and Kanban Pipeline.
4. **`approvals`**: Scoped by `territory_id`. Universal moderation queue for listings, reels, and stories.
5. **`content_items`**: Scoped by `territory_id`. Unified table for banners, news articles, tickers, stories, and offers.

---

## 4. Supabase Migration & Data Preservation Blueprint

### Step 1: Pre-Migration Backup & Integrity Check
1. Create a timestamped, immutable backup copy of `data/admin_data.json`:
   `cp data/admin_data.json data/admin_data.backup.$(date +%s).json`
2. Verify total listing count: Exactly **211 listings**.
3. Verify territory count: 1 Flagship (`territory_choutuppal`) + 3 Franchises (`territory_suryapet`, `territory_bhongir`, `territory_nalgonda`).

### Step 2: Schema Deployment
1. Connect to the new Supabase project SQL Editor.
2. Run `supabase/schema.sql` (551 lines).
3. Validate that all 11 tables are created with `RLS: ENABLED`.
4. Validate that the 3 `SECURITY DEFINER` functions exist:
   - `public.is_super_admin()`
   - `public.current_territory_id()`
   - `public.is_territory_active(target_territory_id)`

### Step 3: Seed & Data Ingestion Sequence
Ingest records in strict foreign-key dependency order:
1. **`territories`**: Insert Flagship Choutuppal and franchise territories.
2. **`territory_domains`**: Insert `choutuppal.in`, `suryapet.in`, etc.
3. **`franchises`**: Insert franchise partner models, plan tiers, and feature limits.
4. **`profiles`**: Create Super Admin and Franchise Admin user records.
5. **`listings`**: Batch insert all **211 legacy business listings**, preserving original `id`, `slug`, `phone`, `category_id`, and `territory_id`.
6. **`contacts`**: Batch insert all 211 merchant contacts.
7. **`audit_logs`**: Batch insert historic audit trail.

### Step 4: Dry-Run Reconciliation Verification
Run verification queries:
```sql
SELECT count(*) FROM public.listings; -- Must equal 211
SELECT count(*) FROM public.territories; -- Must equal >= 4
SELECT count(*) FROM public.contacts; -- Must equal >= 211
SELECT count(*) FROM public.listings WHERE territory_id = 'territory_choutuppal'; -- Must equal 211
```

### Step 5: Rollback Plan
If any discrepancy occurs during migration:
1. The local `data/admin_data.json` remains completely untouched and functional.
2. Revert `.env.local` to remove `NEXT_PUBLIC_SUPABASE_URL`.
3. Application immediately resumes running on the validated local JSON store.

---

## 5. Prioritized Pre-Supabase Action Plan

### Tier 1: Critical Code Integrity (Fix Immediately Before Supabase)
- [ ] **Task 1.1**: Export `syncListingToCrm` in `src/lib/store.ts` (prevents runtime crashes on listing create/update/approve).
- [ ] **Task 1.2**: Wire `/admin/banners`, `/admin/ticker`, and `/admin/news` to call `/api/admin/content`.
- [ ] **Task 1.3**: Wire `/shorts` submission modal to call `/api/shorts/submit` (routes submissions through moderation queue).

### Tier 2: Supabase Environment & Migration Execution
- [ ] **Task 2.1**: User sets up Supabase project and provides environment credentials.
- [ ] **Task 2.2**: Execute `supabase/schema.sql` in Supabase SQL editor.
- [ ] **Task 2.3**: Run automated migration script transferring 211 listings and territories from `admin_data.json` to Supabase.
- [ ] **Task 2.4**: Verify row counts match 100%.

### Tier 3: API Layer Cutover & Secondary CRM Modules
- [ ] **Task 3.1**: Implement dual-mode DAO layer bridging API handlers to Supabase with local fallback.
- [ ] **Task 3.2**: Connect Shared Inbox UI to real `messages` table.
- [ ] **Task 3.3**: Connect Kanban Pipeline UI to `contacts` table stages.
- [ ] **Task 3.4**: Connect Broadcast UI to `/api/crm/broadcasts`.

---

## 6. Current Holding Status

Per the project rules:
- **Zero code files have been modified.**
- **No dependencies have been installed.**
- **No external connections or messages have been sent.**
- **Standing by for user confirmation to begin Tier 1 fixes.**
