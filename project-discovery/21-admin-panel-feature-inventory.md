# Choutuppal Franchise CRM — Phase B: Admin Panel Feature Inventory & Audit

**Date**: October 26, 2026  
**Auditor**: Lead Full-Stack Architect & Application Security Engineer  
**Project Root**: `/data/user/0/com.termux/files/home/storage/downloads/Cpl Crm/choutuppal-franchise-crm`  
**Execution Context**: Local JSON store persistence (`data/admin_data.json`); Supabase disconnected  
**Verification Baseline**: 212 Listings, 211 Contacts, 4 Deals, 1 Flow, 179 Draft Automations, 4 Territories  

---

## 1. Executive Summary

This feature inventory provides a comprehensive, inspected-from-code assessment of the Choutuppal Franchise CRM admin panel (`/admin/*`) and WhatsApp CRM module (`/crm/*`). Every module was inspected for architectural completeness, backend API connectivity, tenant scoping, error handling, mobile responsiveness, and UI truthfulness.

### Overall Assessment:
- **Core Business Workflows (Listings, Approvals, Franchises, Deals, Inbox, Content)** are robust, persistent, and backed by fully authenticated and territory-isolated APIs.
- **Specific Confirmed Bugs & Broken Workflows** exist in dashboard routing, sidebar notification badges, status labels, and mock endpoints that need targeted resolution.
- **Mock / Simulated Features (Broadcasts, Settings)** display false positive success messages without backend persistence.
- **Access Control Vulnerability**: `GET /api/admin/dashboard` currently lacks authentication and tenant scoping, exposing business metrics to unauthenticated callers.

---

## 2. Feature Inventory Matrix

| Module / Feature | UI Route | Backend API Route | Implementation Status | Verdict & Findings |
|---|---|---|:---:|---|
| **Admin Dashboard** | `/admin/dashboard` | `/api/admin/dashboard` | **PARTIALLY WORKING** | Displays key metrics, recent listings, and pending approvals. **BUGS**: 7 broken internal links (`href="/approvals"`, `href="/listings"`, `href="/crm-flows"` lead to 404s). **SECURITY RISK**: API lacks `requireAuth(req)` and tenant isolation. |
| **Listings Management** | `/admin/listings` | `/api/admin/listings` | **WORKING** | Full CRUD, dedicated photo columns, zoom lightbox, category/village filters, search, pagination, multi-tenant isolation, franchise quota enforcement, automatic CRM merchant sync. **BUG**: WhatsApp test card toast claims successful dispatch even when sandbox mode returns `providerDelivered: false`. |
| **Approval Queue** | `/admin/approvals` | `/api/admin/approvals` | **WORKING** | Moderation for `NEW_LISTING`, `LISTING_EDIT`, `STORY`, `OFFER`, `FRANCHISE_APP`, `CITIZEN_REPORT`. Supports approve, request changes, and reject with admin notes; automatic WhatsApp confirmation queuing; audit logs. |
| **Franchise Network** | `/admin/franchise` | `/api/admin/franchises` | **WORKING** | 1,104-line full management panel: territory registry, plan tiers, limits, custom domains, magic login links, suspend/activate lifecycle, commercial terms. |
| **Sales Pipelines** | `/admin/pipelines`, `/crm/pipelines` | `/api/crm/deals` | **WORKING** | Persistent 6-stage Kanban board (`NEW_LEAD` to `LOST`), deal creation/edit/delete modals, stage values aggregation, search, territory filter. |
| **Shared WhatsApp Inbox** | `/admin/inbox`, `/crm/inbox` | `/api/admin/inbox` | **WORKING** | Conversation list, chat history bubbles, inbound/outbound indicators, message delivery status (`received`, `sent`, `delivered`, `read`), mark-read API, honest sandbox notice. |
| **CRM Contacts** | `/admin/contacts`, `/crm/contacts` | `/api/crm/contacts` | **PARTIALLY WORKING** | API supports full authenticated CRUD, but UI is strictly a read-only list. Lacks Add Contact modal, Edit/Stage dropdown, and pagination for 211 contacts. |
| **Automations (Rules)** | `/crm/automations` | `/api/crm/automations`, `dry-run` | **WORKING** | 179 draft rules, CSV preview/import, status toggle, pure deterministic evaluator, shadow runner. All 179 rules safely inactive. |
| **Interactive Flows** | `/admin/crm-flows`, `/crm/flows` | `/api/crm/flows` | **PARTIALLY WORKING** | Settings for `flow_category_browser` save correctly to `store.flows`. Flow list has CSV export/import. **BUG**: Accidental Cyrillic typo in component name (`CRMвогоFlowsPage`). |
| **Marketing Content** | `/admin/news`, `banners`, `ticker`, `stories-offers` | `/api/admin/content` | **WORKING** | Full CRUD, active toggles, Telugu title support, auto-expiry calculations. |
| **Video Shorts** | `/admin/shorts` | `/api/admin/content`, `/api/shorts/submit` | **WORKING** | Video feed management, tags, YouTube embeds, citizen submission moderation. |
| **WhatsApp Broadcasts** | `/admin/broadcasts`, `/crm/broadcasts` | *None* | **UI-ONLY / MOCK** | 100% mock `setTimeout(..., 1200)` and fake success toast. No backend route, no persistence, no audience filtering. |
| **System Settings** | `/admin/settings` | *None* | **UI-ONLY / MOCK** | 100% mock `setTimeout(..., 3000)` and hardcoded token (`EAAG...`). No backend route. Displays wrong webhook URL (`/api/webhooks/whatsapp` instead of `/api/whatsapp/webhook`). |
| **CRM Dashboard** | `/crm/dashboard` | *None* | **UI-ONLY / MOCK** | Metrics (`39 flows`, `179 autos`, `211 contacts`) are hardcoded in React `useState()`. No backend fetch. |
| **Admin Sidebar** | `AdminSidebar.tsx` | `/api/admin/approvals` | **PARTIALLY WORKING** | **BUG**: `const isApproval = item.href === '/approvals'`. Because `item.href` is `'/admin/approvals'`, the dynamic `pendingCount` badge never displays! |
| **CRM Sidebar** | `CRMSidebar.tsx` | *None* | **WORKING (WITH STATUS BUG)** | **BUG**: Hardcodes `badge: '179 Active'` (all 179 are `draft`) and `badge: '39 Live'` (only 1 flow exists). |

---

## 3. Confirmed Bugs & Regressions Detailed Analysis

### Bug 1: Broken Navigation Links on Admin Dashboard (`/admin/dashboard`)
- **Location**: [`src/app/admin/dashboard/page.tsx`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/admin/dashboard/page.tsx) lines 100, 132, 139, 163, 227, 288, 325
- **Impact**: Clicking "View Approvals" routes to `/approvals` (HTTP 404). Clicking "Manage Listings" routes to `/listings` (the public end-user directory instead of the admin panel `/admin/listings`). Clicking "Configure Bot Flows" routes to `/crm-flows` (HTTP 404).
- **Fix**: Update all links to `/admin/approvals`, `/admin/listings`, and `/admin/crm-flows`.

### Bug 2: Missing Approval Badge on Admin Sidebar
- **Location**: [`src/components/admin/admin-sidebar.tsx`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/components/admin/admin-sidebar.tsx) line 99
- **Code**: `const isApproval = item.href === '/approvals'`
- **Impact**: In `WEBSITE_NAV`, `item.href` is `'/admin/approvals'`. As a result, `isApproval` is permanently false, and the live pending approval badge (`pendingCount: 3`) never renders beside the Admin Approval Queue link.
- **Fix**: Update condition to `const isApproval = item.href === '/admin/approvals'`.

### Bug 3: Inaccurate Sidebar Status Badges in CRM Navigation
- **Location**: [`src/components/crm/crm-sidebar.tsx`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/components/crm/crm-sidebar.tsx) lines 23–24
- **Code**: `{ href: '/crm/flows', badge: '39 Live' }`, `{ href: '/crm/automations', badge: '179 Active' }`
- **Impact**: Falsely claims all 179 rules are "Active", directly violating the strict safety mandate that keeps all 179 automation rules in `draft` status. Also falsely claims 39 flows exist when only 1 is in `store.flows`.
- **Fix**: Correct badges to `'1 Flow'` and `'179 Draft'` (or dynamically reflect counts).

### Bug 4: Misleading WhatsApp Delivery Toast in Listings Management
- **Location**: [`src/app/admin/listings/page.tsx`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/admin/listings/page.tsx) line 252
- **Code**: `text: 'Listing Photo Card successfully dispatched to WhatsApp (${testSendPhone})!'`
- **Impact**: When Meta Cloud API credentials are unconfigured, the backend returns `{ success: true, providerDelivered: false, status: 'simulated' }`. The UI ignores `providerDelivered` and claims the message was dispatched to the recipient's phone.
- **Fix**: Check `data.providerDelivered`. If false, display: `[Sandbox] WhatsApp photo card simulated successfully (credentials unconfigured).`

### Bug 5: Accidental Cyrillic Typo in Component Name
- **Location**: [`src/app/crm/flows/page.tsx`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/crm/flows/page.tsx) line 32
- **Code**: `export default function CRMвогоFlowsPage() {`
- **Impact**: Code hygiene defect with stray characters.
- **Fix**: Clean symbol name to `CRMFlowsPage`.

### Bug 6: Incorrect Webhook Callback URL in Settings UI
- **Location**: [`src/app/admin/settings/page.tsx`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/admin/settings/page.tsx) line 86
- **Code**: `https://choutuppal.in/api/webhooks/whatsapp`
- **Impact**: The actual registered webhook route is `/api/whatsapp/webhook`. Pasting the displayed URL into Meta Developer Console would fail.
- **Fix**: Correct URL to `https://choutuppal.in/api/whatsapp/webhook`.

---

## 4. Security & Tenant-Isolation Vulnerability: Unauthenticated Dashboard API

- **Endpoint**: [`src/app/api/admin/dashboard/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/admin/dashboard/route.ts)
- **Vulnerability**: The endpoint exports `export async function GET()` without calling `getAuthenticatedUser(req)` or `requireAuth(req)`.
- **Consequences**:
  1. Anyone with network access can query `/api/admin/dashboard` and view total listing counts, active leads, phone numbers of recent contacts, and pending moderation items without logging in.
  2. The endpoint returns global platform metrics without territory filtering, leaking other town metrics to Franchise Admins.
- **Remediation**:
  1. Add `requireAuth(req)` to reject unauthenticated requests with `HTTP 401`.
  2. Implement territory scoping: Franchise Admins only receive metrics for `auth.user.territoryId`, while Super Admins can query all territories or filter by `?territoryId=...`.
  3. Include pipeline deals metrics (`dealsCount`, `dealsValue`) and automation rule counts (`totalAutomations`, `draftAutomations`).

---

## 5. UI-Only / Mock Features Requiring Backend Persistence

1. **System Settings API (`/api/admin/settings`)**:
   - `store.settings` exists in `data/admin_data.json` with `whatsappToken`, `whatsappPhoneNumberId`, `whatsappVerifyToken`, `syncListingsToCrmFlow`, `autoSendListingPhotoInChat`.
   - Implement `GET` and `POST` in `/api/admin/settings` (Super Admin restricted) so that changes in `/admin/settings` persist to `store.settings` and are logged in `store.auditLogs`.
2. **CRM Contacts UI Management**:
   - Add "Add Contact" modal and Stage Dropdown in `/admin/contacts` and `/crm/contacts` wired to `POST /api/crm/contacts` and `PUT /api/crm/contacts`.
   - Add search and pagination to avoid DOM bloat with 211 contacts.
3. **CRM Dashboard Live Telemetry**:
   - Connect `/crm/dashboard` to fetch actual live counts from `/api/admin/dashboard` instead of hardcoded numbers.
4. **WhatsApp Broadcasts**:
   - Add an honest, clearly styled "Campaign Preview & Staging Mode" indicator explaining that broadcasts are staged locally, avoiding fake `setTimeout` claims.

---

## 6. Prioritized Remediation Roadmap

- **Step 1 (High Priority — Security & Broken Navigation)**:
  - Secure `/api/admin/dashboard` with `requireAuth` and territory scoping.
  - Fix broken links in `/admin/dashboard` (`/admin/approvals`, `/admin/listings`, `/admin/crm-flows`).
  - Fix sidebar pending approvals count badge in `AdminSidebar.tsx`.
  - Fix misleading badges in `CRMSidebar.tsx` (`179 Draft`, `1 Flow`).
- **Step 2 (High Priority — Delivery Honesty & Settings Persistence)**:
  - Fix WhatsApp delivery honesty toast in `/admin/listings`.
  - Implement `/api/admin/settings` (GET/POST) and wire `/admin/settings` to persist to `store.settings`.
  - Fix webhook callback URL display in `/admin/settings`.
- **Step 3 (Medium Priority — Contacts Management UI)**:
  - Implement "Add Contact" modal and stage changer in `/admin/contacts` and `/crm/contacts`.
  - Connect `/crm/dashboard` to live metrics API.
- **Step 4 (Verification & Regression)**:
  - Add dedicated integration tests covering all fixes (`test_phase4b_admin_fixes.py`).
  - Execute full regression across all 11 existing test suites.
  - Verify 100% data preservation in `data/admin_data.json`.
