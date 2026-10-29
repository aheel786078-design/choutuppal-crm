# Data Storage & Persistence Architecture Analysis

**Project**: Mana Choutuppal.in Multi-Town Franchise CRM & SuperApp Platform  
**Directory**: `/data/user/0/com.termux/files/home/storage/downloads/Cpl Crm/choutuppal-franchise-crm`  
**Inspection Date**: October 2026  
**Auditor**: Senior Software Architect & Database Specialist  

---

## Technical Answers to the 10 Storage Questions

### Question 1: What is the application currently using for data storage?
**Answer**:  
The application is currently operating on a **hybrid local filesystem model**:
1. **Primary Runtime Store**: A single local JSON document located at `data/admin_data.json` (~571 KB).
2. **Auxiliary File Storage**: Static CSV files located in `csv/` (`sample_flows.csv`, `sample_automations.csv`) parsed on demand.
3. **Transient Component State**: Certain secondary admin modules (Banners, Tickers, News, Pipelines, Inbox) currently store their data in React client component `useState` (in-memory only).
4. **Supabase Integration Status**: `@supabase/supabase-js` is installed, and `src/lib/supabase.ts` initializes client instances conditionally, but **zero application API routes or server handlers currently query Supabase**. Supabase is entirely disconnected from runtime data operations.

---

### Question 2: Is `data/admin_data.json` used by runtime code, tests only, or not at all?
**Answer**:  
`data/admin_data.json` is **actively used by both runtime application code AND automated tests**.
- In runtime code: `src/lib/store.ts` defines `const DATA_FILE = path.join(process.cwd(), 'data', 'admin_data.json')`.
- Traced function calls: Every call to `loadStore()` reads `data/admin_data.json` synchronously via `fs.readFileSync()`. Every call to `saveStore()` writes to it synchronously via `fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2))`.
- All major Next.js API routes (`/api/admin/franchises`, `/api/admin/listings`, `/api/admin/approvals`, `/api/crm/contacts`, `/api/crm/flows`, `/api/auth/magic-link`, `/api/whatsapp/webhook`) directly call `loadStore()` and `saveStore()`.
- Public server components (`src/lib/home-data.ts`, `src/app/town/[slug]/page.tsx`, `src/app/business/[slug]/page.tsx`, `src/app/listings/page.tsx`) call `loadStore()` on every server render.

---

### Question 3: Are API handlers connected to a persistent database?
**Answer**:  
**No.** API handlers are connected to the local filesystem file (`data/admin_data.json`), not to a relational database like PostgreSQL or Supabase. There are zero active SQL query executions, RPC calls, or Supabase client query methods (`.from('listings').select()`) in any API handler.

---

### Question 4: Does data survive application restarts?
**Answer**:  
**Yes, in single-instance environments (like local Node.js / Termux / dedicated VPS).**
Because `saveStore()` writes updates to `data/admin_data.json` on disk, data persists across server restarts, script executions, and system reboots.
**However**, on serverless hosting platforms like **Vercel**, the local filesystem is ephemeral and read-only outside of `/tmp`. Any runtime mutations made via `saveStore()` on Vercel would either fail with a filesystem write error or be wiped when the serverless function container is recycled! This is why migrating to Supabase is mandatory before production Vercel deployment.

---

### Question 5: Can multiple users or server instances safely share the current store?
**Answer**:  
**No.** The current file store has critical concurrency and scalability constraints:
1. **Lack of File Locking**: Concurrent writes from simultaneous users can result in race conditions where one write overwrites another.
2. **Memory Inefficiency**: Reading and rewriting a 571 KB JSON file on every write operation degrades performance under concurrent load.
3. **Multi-Instance Incoherence**: On multi-container or serverless deployments, each container has its own copy of the file; mutations in Container A will never be seen by Container B.

---

### Question 6: Are there duplicate or conflicting sources of truth?
**Answer**:  
**Yes, there is currently a divergence between API routes and certain Admin UI pages**:
- **Source of Truth 1 (Active Persistent Store)**: `data/admin_data.json` holds the authoritative data for Listings (211 records), Franchises, Territories, Territory Domains, Approvals, CRM Contacts (211 records), CRM Flows, Messages, Magic Tokens, and Audit Logs.
- **Source of Truth 2 (Transient Mock State)**: `src/app/admin/banners/page.tsx`, `src/app/admin/ticker/page.tsx`, `src/app/admin/news/page.tsx`, `src/app/admin/shorts/page.tsx`, and `src/app/admin/inbox/page.tsx` maintain hardcoded mock arrays inside React `useState`. Changes made in these UI screens do not persist to `data/admin_data.json` or `/api/admin/content`.
- **Source of Truth 3 (CSV Files)**: `csv/sample_flows.csv` and `csv/sample_automations.csv` exist as static template files that can be imported into the store via modal.

---

### Question 7: Does the application work without Supabase credentials?
**Answer**:  
**Yes, 100% of core local features work today without Supabase credentials.**
The local Next.js server, public search website, town pages, admin dashboards, franchise lifecycle actions, listing CRUD, magic link authentication, and all 53 automated test checks execute completely without a Supabase project connection.

---

### Question 8: Which exact features require Supabase before they can function in production?
**Answer**:
1. **Production Multi-User Concurrency**: Safe concurrent transactions across multiple franchise operators.
2. **Vercel Serverless Persistence**: Preventing data loss on ephemeral serverless containers.
3. **Database Row Level Security (RLS)**: Enforcing tenant isolation at the database protocol level.
4. **Supabase Realtime WebSockets**: Live incoming WhatsApp chat notifications and real-time dashboard updates (`use-realtime-notifications.tsx`).
5. **Supabase Auth (Optional but Recommended)**: Merchant self-registration and password recovery.
6. **Large Scale Full-Text Search**: Fast Telugu and English search across tens of thousands of listings.

---

### Question 9: Which features can be fully tested locally before connecting Supabase?
**Answer**:
1. Flagship Choutuppal protection and 211 listing preservation.
2. Super Admin franchise creation, collision prevention, and domain assignment.
3. Franchise lifecycle transitions (`active` -> `suspended` -> `active`).
4. Plan quotas and feature limits (`maxListings`).
5. Cross-tenant IDOR/BOLA attack prevention.
6. WhatsApp 256-bit CSPRNG magic link minting and single-use redemption.
7. HMAC-SHA256 session token generation, signature tamper rejection, and cookie issuance.
8. Tri-mode domain, subdomain, and town-slug routing.
9. WhatsApp webhook incoming event processing and Telugu bot response formatting.
10. CSV flow import and node graph construction.
11. R2 image upload endpoint validation and fallback handling.
12. Audit log recording and tamper-evident schema validation.

---

### Question 10: What existing data must be migrated or preserved?
**Answer**:  
The following datasets currently residing in `data/admin_data.json` must be migrated to Supabase without any data loss:
1. **211 Business Listings**: Legacy Choutuppal businesses, service providers, shops, and real estate plots with photos, addresses, phone numbers, and categories.
2. **Flagship Choutuppal Territory**: `territory_choutuppal` record with branding, contact numbers, localities, and domain mappings (`choutuppal.in`).
3. **Franchise Networks**: Active franchises (e.g. `territory_suryapet`, `territory_bhongir`, `territory_nalgonda`).
4. **Territory Domains**: Claimed domain records (`choutuppal.in`, `suryapet.in`, `bhongir.choutuppal.in`, `nalgonda.in`).
5. **CRM Contacts**: 211 merchant contacts and leads.
6. **Audit Logs**: 40+ recorded privileged operational actions.
