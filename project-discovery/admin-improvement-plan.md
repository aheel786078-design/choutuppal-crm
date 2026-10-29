# Choutuppal Franchise CRM — Advanced Admin Panel & Super Admin Improvement Plan

**Document ID:** `project-discovery/admin-improvement-plan.md`  
**Date:** October 27, 2026  
**Auditor / Architect:** Senior SaaS Product Architect & Security Engineer  
**Target Repository:** `choutuppal-franchise-crm`  
**Data Store Invariant:** `data/admin_data.json` (SHA-256: `d6a6e8bafe75cff95fdf2b15f671963b163bc5193c9aeea96cb41c66ced4d04f` — Verified Intact)

---

## Executive Summary

The **Choutuppal Franchise CRM** application features an extensive administrative ecosystem spanning multi-tenant franchise territory governance, business listing moderation, CRM pipeline management, WhatsApp Cloud API flows, premium subscriptions, and an official government contacts directory. 

While core backend primitives (HMAC-SHA256 session tokens, server-side RBAC, territory scoping, and protected flagship invariants) are robust and backed by automated regression suites passing at 100%, several operational bottlenecks and architectural gaps exist:
1. **Admin Dashboard (Phase 2):** Restricted to 4 top-level metrics; lacks live subscription analytics, pending payment summaries, WhatsApp campaign status, and real system health indicators.
2. **User & Staff Management (Phase 3.2):** `FranchiseStaff` data structures exist in `src/lib/types.ts`, but lack an active administrative interface to invite, inspect, or manage franchise staff.
3. **WhatsApp & Automation Visibility (Phase 3.5):** 179 draft automations exist in store, but the admin interface lacks a centralized execution history, dry-run health monitor, and dead-letter retry console.
4. **System Health & Observability (Phase 6):** No unified diagnostic console displaying authentic connection statuses (`CONNECTED`, `MOCK`, `DISCONNECTED`, `NOT VERIFIED`) for Cloud API, R2, payment gateways, and local storage.
5. **UI/UX Consistency (Phase 4):** Navigation sidebar is non-collapsible; global search is missing; breadcrumbs are not standardized; and notifications rely on ad-hoc local states rather than a global accessible toast queue.

This plan details the audited feature inventory, gap analysis, and an incremental, zero-data-loss improvement roadmap across 7 modular phases.

---

## 1. Existing Admin Feature Inventory

### 1.1 Administrative Pages & Views

| Route | Component File | Current Status | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| `/admin` | `src/app/admin/page.tsx` | Functional | Root redirect to `/admin/dashboard`. |
| `/admin/dashboard` | `src/app/admin/dashboard/page.tsx` | Functional (Partial Metrics) | Command Center: 4 stat cards (`totalListings`, `totalContacts`, `stories+offers`, `totalFranchises`), pending moderation banner, dual-channel sync banner, recent listings table, and recent approvals queue. |
| `/admin/approvals` | `src/app/admin/approvals/page.tsx` | Functional | Queue for listings, stories, offers, and franchise inquiries. Supports `approve`, `reject`, and `request_changes` with administrative notes. |
| `/admin/listings` | `src/app/admin/listings/page.tsx` | Functional | 1,065-line console: Table and Grid view modes, category/status filters, pagination, photo zoom lightbox, dual preview card, test WhatsApp dispatch simulator. |
| `/admin/franchise` | `src/app/admin/franchise/page.tsx` | Functional | 1,104-line console: Network statistics, flagship territory badge (`immutable: true`), franchise creation modal with auto-slug, plan tier assignment, suspend/activate modal with reason logging, magic link generator, and audit log table. |
| `/admin/monetization` | `src/app/admin/monetization/page.tsx` | Functional | 873-line console: Tabbed interface for Plans, Subscriptions, Featured Promotions, and Orders. Supports grant subscription modal, grant promotion modal, and manual payment verification modal. |
| `/admin/government-contacts` | `src/app/admin/government-contacts/page.tsx` | Functional | 1,254-line console: Official directory with verification lifecycle (`draft` → `verified` → `published`), duplicate phone detection, CSV import/export with dry-run mode, and emergency badges. |
| `/admin/inbox` | `src/app/admin/inbox/page.tsx` | Functional | Shared WhatsApp team inbox: Contact thread viewer, territory scoping, staff assignment, live message history, and outgoing message simulator. |
| `/admin/contacts` | `src/app/admin/contacts/page.tsx` | Functional | CRM contacts & leads console: Stage filtering (`NEW_LEAD` to `WON`/`LOST`), search by name/phone, stage update dropdowns, and contact creation. |
| `/admin/pipelines` | `src/app/admin/pipelines/page.tsx` | Functional | Visual sales pipeline Kanban (re-exports `/crm/pipelines`): Drag/drop stage progression, deal values, and win/loss tracking. |
| `/admin/crm-flows` | `src/app/admin/crm-flows/page.tsx` | Functional | WhatsApp Bot Flow configuration: Toggle photo cards, call/WhatsApp/website buttons, and interactive phone simulator. |
| `/crm/flows` | `src/app/crm/flows/page.tsx` | Functional | Visual node-based flow canvas: Multi-step conversational tree builder, CSV import/export, and dry-run emulator. |
| `/admin/broadcasts` | `src/app/admin/broadcasts/page.tsx` | Functional | WhatsApp broadcast campaign manager: Audience breakdown (all, real estate, merchants), message composer with cover image presets, and sandbox dispatch. |
| `/admin/banners` | `src/app/admin/banners/page.tsx` | Functional | Top and inline banner console: Media upload/preset selector, URL binding, and active toggle. |
| `/admin/stories-offers` | `src/app/admin/stories-offers/page.tsx` | Functional | Expiring stories and time-limited deals console: Expiry countdowns, merchant attribution, and publish controls. |
| `/admin/news` | `src/app/admin/news/page.tsx` | Functional | Local news and editorial updates: Bilingual Telugu/English title support, summary, rich content, and publish status. |
| `/admin/shorts` | `src/app/admin/shorts/page.tsx` | Functional | Vertical video shorts (Reels): Video URL linking, thumbnail preview, and category tagging. |
| `/admin/ticker` | `src/app/admin/ticker/page.tsx` | Functional | Live breaking ticker bar: Real-time announcement text and active/inactive toggles. |
| `/admin/settings` | `src/app/admin/settings/page.tsx` | Functional | Cloud API credentials: Masked token display, phone number ID, verify token, CRM sync toggles, and webhook callback URL display. |

### 1.2 Administrative API Endpoints

| API Route | Supported Methods | Authorization & Scoping | Description |
| :--- | :--- | :--- | :--- |
| `/api/admin/dashboard` | `GET` | `requireAuth` + Territory Scoping | Aggregates listing, contact, deal, approval, and content metrics. |
| `/api/admin/approvals` | `GET`, `POST` | `requireAuth` + Territory Scoping | Lists and processes pending submissions. |
| `/api/admin/listings` | `GET`, `POST`, `PUT`, `DELETE` | `requireAuth` + Territory Scoping | CRUD operations for business listings with CRM sync. |
| `/api/admin/franchises` | `GET`, `POST` | `requireSuperAdmin` (Mutations) | Franchise lifecycle, territory provisioning, plan tier updates, and audit logging. |
| `/api/admin/monetization` | `GET`, `POST` | `requireAuth` + Super Admin for Grants | Manages plans, subscriptions, promotions, and manual order verification. |
| `/api/admin/government-contacts` | `GET`, `POST` | `requireAuth` + Territory Scoping | CRUD, verification status changes, and duplicate phone checks. |
| `/api/admin/government-contacts/[id]` | `GET`, `PUT`, `DELETE` | `requireAuth` + Territory Scoping | Detail, update, and soft delete of official records. |
| `/api/admin/government-contacts/[id]/verify` | `POST` | `requireAuth` + Territory Scoping | Marks records as verified with audit source citations. |
| `/api/admin/government-contacts/[id]/publish` | `POST` | `requireAuth` + Territory Scoping | Publishes verified records to public directory and API. |
| `/api/admin/government-contacts/[id]/archive` | `POST` | `requireAuth` + Territory Scoping | Deprecates stale contacts without deleting history. |
| `/api/admin/government-contacts/import` | `POST` | `requireAuth` + Super Admin | Validated CSV ingestion with dry-run support. |
| `/api/admin/government-contacts/export` | `GET` | `requireAuth` | CSV stream of directory records. |
| `/api/admin/inbox` | `GET`, `POST` | `requireAuth` + Territory Scoping | Fetches conversation threads and records outgoing WhatsApp messages. |
| `/api/admin/broadcasts` | `GET`, `POST` | `requireAuth` + Territory Scoping | Manages broadcast campaigns in sandbox mode. |
| `/api/admin/content` | `GET`, `POST`, `DELETE` | `requireAuth` + Territory Scoping | Multi-entity management for banners, stories, offers, tickers, news, and shorts. |
| `/api/admin/settings` | `GET`, `POST` | `requireSuperAdmin` | Reads and updates WhatsApp Cloud API credentials and sync rules. |
| `/api/crm/contacts` | `GET`, `POST`, `PUT` | `requireAuth` + Territory Scoping | Manages merchant contacts and lead stages. |
| `/api/crm/deals` | `GET`, `POST`, `PUT` | `requireAuth` + Territory Scoping | Manages sales pipeline deals and monetary values. |
| `/api/crm/flows` | `GET`, `POST` | Public GET / Auth POST | Manages WhatsApp interactive flow structures. |
| `/api/crm/automations` | `GET`, `POST` | `requireAuth` + Territory Scoping | Ingests and manages automated messaging rules. |
| `/api/crm/automations/dry-run` | `POST` | `requireAuth` | Simulates trigger evaluation without side effects. |

---

## 2. Current Problems, Usability Bottlenecks, and Missing Features

### 2.1 Dashboard & Metrics Bottlenecks (Phase 2 Gaps)
- **Superficial Stat Cards:** The dashboard displays only 4 high-level metric cards (`totalListings`, `totalContacts`, `stories+offers`, `totalFranchises`). Critical business dimensions are missing:
  - Active vs. expired subscriptions.
  - Pending payment orders requiring manual verification.
  - Automation execution counts (active vs. paused rules).
  - WhatsApp broadcast delivery statistics.
- **Absence of Time-Dimension Filtering:** Metrics are calculated cumulatively across the entire history of the store; there is no ability to filter by date range (e.g., Today, Last 7 Days, Last 30 Days, Custom Range).
- **Ambiguity Between Real and Demo Metrics:** Page views (`totalViews: 24,890`) and WhatsApp clicks (`3,410`) are hardcoded or aggregated from listing seed records without clear provenance indicators.

### 2.2 Super Admin Controls & Staff Management (Phase 3 Gaps)
- **Missing Staff Governance UI:** While `FranchiseStaff` is defined in `src/lib/types.ts` (`id`, `franchiseId`, `userId`, `name`, `phone`, `role`, `permissions`, `status`), there is no admin page (e.g., `/admin/staff`) allowing Super Admins or Franchise Admins to invite staff, assign granular permissions, or revoke access.
- **Lack of Bulk Actions for Listings:** Directory listings can only be approved, rejected, or edited one-by-one. In a database of 212+ listings, bulk category re-assignment, bulk publishing, and bulk featured status assignment are not supported.
- **CRM Duplicate Warnings:** The CRM contacts view does not flag duplicate phone numbers or matching business titles when new leads are registered or updated.
- **Automation Execution Observability:** 179 draft automations exist in store, but there is no central admin console displaying rule execution history, error logs, or dead-letter retry queues.

### 2.3 UI/UX Deficiencies (Phase 4 Gaps)
- **Rigid Navigation Sidebar:** The sidebar is fixed at `w-64` (256px) and cannot be collapsed into an icon-only rail to maximize screen space on tablets or small desktop viewports.
- **Missing Mobile Drawer:** On mobile devices (`< 768px`), the sidebar occupies the entire view or forces awkward horizontal overflow; there is no hamburger toggle drawer with backdrop overlay.
- **Absence of Global Search:** Administrators must navigate between separate pages to search listings, contacts, franchises, and government contacts; there is no unified `Cmd+K` / `Ctrl+K` command palette.
- **Inconsistent Notification System:** Action feedback currently relies on local component states (`actionSuccessMsg`, `errorMsg`) that disappear on re-render rather than a standardized, accessible toast container.
- **Missing Standardized Breadcrumbs:** Deep administration routes (e.g., `/admin/government-contacts`, `/admin/monetization`) lack hierarchical breadcrumb navigation.

### 2.4 Security & Audit Logging (Phase 5 Gaps)
- **Fragmented Audit Trail:** Audit logs are displayed exclusively inside `/admin/franchise`. High-impact actions executed in `/admin/monetization` (granting free subscriptions, overriding payments) and `/admin/settings` (modifying WhatsApp credentials) write audit events to `store.auditLogs`, but lack a dedicated, searchable audit console.

### 2.5 System Health & Monitoring (Phase 6 Gaps)
- **Zero Real-Time Diagnostic Dashboard:** There is no single screen reporting:
  - Node.js runtime and memory metrics.
  - Local JSON store status (file size, permissions, backup freshness, SHA-256 integrity).
  - WhatsApp Cloud API connection status (valid token, phone ID configured, webhook reachability).
  - Cloudflare R2 bucket connection health.
  - Payment gateway status (Cashfree/Razorpay webhook configuration).
  - Clear, evidence-backed status chips: `CONNECTED`, `MOCK`, `DISCONNECTED`, `NOT VERIFIED`.

---

## 3. Proposed Improvements Across Functional Areas

### 3.1 Improved Admin Dashboard (Phase 2)
1. **Dynamic Multi-Card Executive Grid:**
   - **Tenants:** Total Franchises, Active vs. Suspended, Flagship Choutuppal Status.
   - **Listings & Moderation:** Total Listings, Live/Published, Pending Moderation Queue count.
   - **CRM & Pipeline:** Total Contacts, Active Opportunities, Won Deals, Total Pipeline Value (`₹`).
   - **Monetization & Orders:** Active Subscriptions, Expiring in 7 Days, Pending Manual Payment Orders.
   - **Automations & Broadcasts:** Active Bot Flows, Draft Automations, Recent Broadcasts.
   - **System Health Overview:** Summary badge indicating API & Storage availability.
2. **Date Range Filter Component:**
   - Dropdown options: `All Time`, `Today`, `Last 7 Days`, `Last 30 Days`, `This Month`.
   - Filters recent listings, new contacts, and transaction volume dynamically.
3. **Actionable Pending Task Hub:**
   - Direct drill-down links to pending approvals, unverified government contacts, and pending payment verifications.

### 3.2 Advanced Super Admin Controls (Phase 3)
1. **Dedicated User & Staff Management (`/admin/staff`):**
   - View staff members across territories.
   - Invite new franchise staff with assigned roles: `FRANCHISE_ADMIN`, `FRANCHISE_REVIEWER`, `FRANCHISE_STAFF`.
   - Toggle account status (`ACTIVE` / `SUSPENDED`) with audit logging.
2. **Listing Bulk Management Engine:**
   - Multi-select checkboxes in `/admin/listings`.
   - Bulk action bar: "Approve Selected", "Unpublish Selected", "Set Category", "Toggle Featured".
   - Accessible modal confirmation step showing list of affected entity titles before execution.
3. **CRM Duplicate Intelligence:**
   - Real-time warning badge on contact rows sharing identical 10-digit phone numbers.
   - One-click contact merge view or lead consolidation indicator.
4. **WhatsApp & Automation Command Center:**
   - Unified overview of all 179 automation rules.
   - Filters for status: `active`, `draft`, `paused`, `disabled`.
   - Dry-run trigger testing tool inline in admin console.

### 3.3 Monetization & Financial Controls
1. **Payment Audit Verification:**
   - Stricter idempotency enforcement on manual payment approval.
   - Direct link from verified orders to activated entitlements.
   - Visual distinction between simulated sandbox payments and verified live orders.

### 3.4 Government Contacts Directory
1. **Official Verification Pipeline:**
   - Verification expiration warnings (contacts overdue for 180-day review).
   - Clear distinction between public display metadata and internal administrative verification notes.

---

## 4. UI/UX Improvement Plan (Phase 4)

### 4.1 Responsive Layout & Collapsible Sidebar
- **Collapsible Desktop Rail:** Add a toggle button (`ChevronLeft` / `ChevronRight` / `PanelLeftClose`) to collapse the sidebar from `256px` to `68px` (icon-only mode with floating tooltips).
- **Mobile Responsive Drawer:** Implement an accessible mobile slide-over sheet triggered by a top-left hamburger menu with backdrop blur and touch dismiss.
- **Active Route Highlighting:** Maintain clear contrast ratios (WCAG AAA) for active tabs and territory badges.

### 4.2 Global Quick Action & Search (Command Palette)
- **Keyboard Shortcut (`Cmd+K` / `Ctrl+K`):** Global modal overlay searching across:
  - Listings by title, phone, or category.
  - CRM Contacts by name, phone, or stage.
  - Franchise towns by name or slug.
  - Admin navigation routes for instant keyboard-only navigation.

### 4.3 Breadcrumb Hierarchy
- Standardized `<AdminBreadcrumbs />` component across all subpages:
  `Admin > Directory > Listings > Edit #211` or `Admin > Government Contacts > Verify`.

### 4.4 Global Toast Notification Queue
- Replace inline dismissible alert banners with a lightweight, accessible toast provider:
  - `toast.success("Listing published successfully")`
  - `toast.error("Failed to update status: Network timeout")`
  - `toast.warning("Verification overdue by 14 days")`

### 4.5 Standardized Accessible Dialogs
- Replace native `window.confirm()` calls with a reusable `<ConfirmationModal />`:
  - Clearly displays destructive consequence warnings.
  - Requires explicit confirmation button click.
  - Traps keyboard focus (`Esc` to cancel, `Enter` to confirm).

---

## 5. Security & Tenant-Isolation Findings (Phase 5)

### 5.1 Current Security Strengths
1. **Cryptographic Token Integrity:** Session tokens use HMAC-SHA256 signatures generated with `SESSION_SECRET` and constant-time buffer comparison (`crypto.timingSafeEqual`) to prevent timing attacks.
2. **Server-Side Role Enforcement:** `requireSuperAdmin` and `requireTerritoryAccess` strictly evaluate the decoded session payload on every mutation route; UI visibility is never trusted as authorization.
3. **Flagship Immutability:** Flagship Choutuppal (`territory_choutuppal`) is protected by `immutable: true` checks in `src/app/api/admin/franchises/route.ts` and cannot be deleted or suspended.
4. **Credential Masking:** WhatsApp Cloud API tokens are masked in API responses (`src/app/api/admin/settings/route.ts`), preventing token leakage in browser inspection.

### 5.2 Security Gaps & Hardening Requirements
1. **Centralized Audit Logging:** Create a dedicated `/admin/audit-logs` view and `/api/admin/audit-logs` endpoint so Super Admins can filter all administrative actions by actor, action type, territory, and date.
2. **IDOR Prevention on Bulk Mutations:** Ensure bulk listing operations validate that every targeted listing ID belongs to the caller's authorized territory before applying updates.
3. **Rate Limiting on Administrative Mutations:** Implement token-bucket rate limiting on sensitive administrative actions (e.g., bulk status changes, magic link generation) to prevent rapid-fire brute-force invocation.

---

## 6. API and Data Model Changes Required (Phase 6)

### 6.1 Data Model Extensions (Preserving Non-Destructive Invariants)
All changes are strictly additive and backward-compatible with `data/admin_data.json`:

```typescript
// Additive interface in src/lib/types.ts
export interface SystemHealthStatus {
  timestamp: string
  app: {
    status: 'HEALTHY' | 'DEGRADED' | 'DOWN'
    uptimeSeconds: number
    nodeVersion: string
    memoryUsageMB: number
  }
  storage: {
    type: 'LOCAL_JSON'
    status: 'CONNECTED' | 'ERROR'
    storePath: string
    fileSizeBytes: number
    sha256Hash: string
    isWritable: boolean
  }
  integrations: {
    whatsappCloudApi: {
      status: 'CONNECTED' | 'MOCK' | 'DISCONNECTED'
      phoneNumberIdConfigured: boolean
      tokenConfigured: boolean
      webhookConfigured: boolean
    }
    r2Storage: {
      status: 'CONNECTED' | 'MOCK' | 'NOT_CONFIGURED'
    }
    paymentGateway: {
      status: 'MOCK' | 'CONNECTED' | 'NOT_CONFIGURED'
      activeProvider: 'MOCK_SANDBOX' | 'CASHFREE' | 'RAZORPAY'
    }
  }
  metrics: {
    totalListings: number
    totalContacts: number
    totalFranchises: number
    pendingApprovals: number
    pendingVerifications: number
  }
}
```

### 6.2 New API Endpoints
1. `GET /api/admin/health` — Returns validated `SystemHealthStatus` with authentic status chips (`CONNECTED`, `MOCK`, `DISCONNECTED`, `NOT VERIFIED`).
2. `GET /api/admin/staff` & `POST /api/admin/staff` — Manages franchise staff members.
3. `POST /api/admin/listings/bulk` — Executes bulk status or category updates with territory validation.
4. `GET /api/admin/audit-logs` — Centralized, paginated query endpoint for administrative audit events.

---

## 7. Implementation Phases and Priorities

```
[Phase 1: Audit & Discovery]  ==> COMPLETE (This Document)
          │
[Phase 2: Admin Dashboard Overhaul] (P0)
  ├── Real Metrics (Listings, CRM, Subscriptions, Health)
  ├── Date Range Filtering
  └── Actionable Task Hub
          │
[Phase 3: Advanced Super Admin Controls] (P1)
  ├── Staff & Role Management (/admin/staff)
  ├── Listing Bulk Operations Bar
  ├── CRM Duplicate Warnings
  └── Automation Health Console
          │
[Phase 4: Professional UI/UX Refinement] (P1)
  ├── Collapsible Sidebar & Mobile Drawer
  ├── Global Command Palette (Cmd+K)
  ├── Breadcrumb Hierarchy
  └── Standardized Modals & Toasts
          │
[Phase 5: Security & Central Audit Logging] (P2)
  ├── Central /admin/audit-logs View
  └── Bulk Operation Tenant Validation
          │
[Phase 6: System Health & Integration Monitoring] (P0)
  ├── /api/admin/health Diagnostic Endpoint
  └── /admin/health Visual Observability Console
          │
[Phase 7: Comprehensive Regression Verification] (P0)
  ├── Non-Destructive Data Store Verification (SHA-256 match)
  ├── Full Regression Test Execution (Phase 6–11 + Security)
  └── TypeScript & Next.js Production Build Validation
```

### Phase Schedule:
- **Phase 2 (Dashboard Metrics & Task Hub):** High Priority. Delivers immediate visibility into business operations without altering underlying structures.
- **Phase 6 (System Health & Diagnostic API):** High Priority. Provides truthful, evidence-backed observability on integrations before launching further features.
- **Phase 4 (UI/UX Refinement):** Medium Priority. Enhances daily usability, mobile ergonomics, and keyboard workflow efficiency.
- **Phase 3 (Staff Governance & Bulk Controls):** Medium Priority. Unlocks multi-tenant staff administration and high-volume catalog curation.
- **Phase 5 (Central Audit Console):** Medium Priority. Consolidates compliance logs and security monitoring.
- **Phase 7 (Verification & Sign-off):** Mandatory. Zero build errors, zero test failures, zero data store mutations.

---

## 8. Tests and Verification Evidence

### 8.1 Current Automated Test Baseline

All existing suites pass with 100% success rate:

```bash
# 1. Security & RBAC Suite
python3 tests/test_security_audit.py
# Result: 37 Passed, 0 Failed, Exit Code: 0

# 2. Government Directory Logic & Edge Cases
python3 tests/test_phase11_government_directory.py
# Result: 67 Passed, 0 Failed, Exit Code: 0

# 3. Government Directory Smoke & Integration
python3 tests/test_phase11_runtime_smoke.py
# Result: 42 Passed, 0 Failed, Exit Code: 0

# 4. Monetization & Payment Entitlements
python3 tests/test_phase10_monetization.py
# Result: 51 Passed, 0 Failed, Exit Code: 0

# 5. Business Listing Ordering & Featured Priority
python3 tests/test_phase9_listing_order.py
# Result: 41 Passed, 0 Failed, Exit Code: 0

# 6. Flow Builder CSV Parsing & Integrity
python3 tests/test_phase8_flow_builder_csv.py
# Result: 13 Passed, 0 Failed, Exit Code: 0

# 7. WhatsApp Flow Automation Engine
python3 tests/test_phase7_flow_automation.py
# Result: 9 Passed, 0 Failed, Exit Code: 0

# 8. Feature Completion & Edge Cases
python3 tests/test_phase6_feature_completion.py
# Result: 14 Passed, 0 Failed, Exit Code: 0

# 9. TypeScript Compilation (Verified in Ext4 Workspace)
pnpm exec tsc --noEmit
# Result: 0 Errors, Exit Code: 0

# 10. Next.js Production Build (Verified in Ext4 Workspace)
pnpm run build
# Result: Compiled successfully in 34.0s, All static/dynamic routes prerendered, Exit Code: 0
```

### 8.2 New Automated Tests Planned
For each implementation phase, a dedicated regression test script will be added under `tests/`:
1. `tests/test_admin_dashboard_metrics.py` — Tests date filtering, multi-card aggregates, and accurate computation across scoped territories.
2. `tests/test_admin_system_health.py` — Tests `/api/admin/health` output, verifying authentic `CONNECTED`/`MOCK`/`DISCONNECTED` statuses without secret disclosure.
3. `tests/test_admin_staff_management.py` — Tests staff invite, role permissions, and cross-tenant isolation.
4. `tests/test_admin_bulk_actions.py` — Tests listing bulk updates and IDOR prevention across territories.

---

## 9. Remaining Production Blockers and Rollout Strategy

### 9.1 Technical Constraints & Safeguards
1. **Android Shared Storage Symlink Limitation:**
   - The primary working tree is on `/storage/emulated/0/Download/Cpl Crm/choutuppal-franchise-crm` (FAT32/fuse-backed), which restricts npm/pnpm symlink creation.
   - All TypeScript checking (`pnpm exec tsc --noEmit`) and production builds (`pnpm run build`) must be executed or verified in the Ext4 workspace at `/data/user/0/com.termux/files/home/projects/build-verify-crm`.
2. **Local JSON Store Concurrency:**
   - The production data store `data/admin_data.json` is a local JSON file. While highly responsive for single-instance Node.js processes, high-volume concurrent write operations require atomic write buffers (`fs.writeFileSync` to temporary swap files) to eliminate corruption risks.
3. **No External DB / Live Messaging Permitted:**
   - Supabase connection is currently disabled.
   - WhatsApp Cloud API runs in simulated sandbox / dry-run mode. Live outbound messaging must remain disabled until production cutover.
4. **Data Store Preservation Mandate:**
   - Every verification step must check `sha256sum data/admin_data.json` to guarantee zero alteration of real user listings, deals, and settings.

### 9.2 Rollout Strategy
- **Step 1:** Submit this improvement plan for User Approval.
- **Step 2:** Implement **Phase 2: Dashboard Metrics & Task Hub** + **Phase 6: System Health Diagnostic API**.
- **Step 3:** Implement **Phase 4: Responsive UI/UX (Collapsible Sidebar & Mobile Drawer)**.
- **Step 4:** Implement **Phase 3: Super Admin Controls (Staff & Bulk Actions)**.
- **Step 5:** Execute all regression test suites, verify TypeScript, and confirm store SHA-256 integrity.

---
*End of Document — Awaiting User Approval to Proceed with Phase 2 Implementation.*
