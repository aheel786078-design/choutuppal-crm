# Phase 5 Security Audit Plan & Vulnerability Assessment
**Choutuppal Franchise CRM | Super Admin & Governance Security**
**Date:** October 28, 2026  
**Status:** DRAFTED & VERIFIED (Stage 1 Complete)  
**Author:** Senior Application Security & Next.js 15 Architect  

---

## 1. Executive Summary & Objective

Phase 5 focuses on hardening security, audit logging coverage, server-side authorization (RBAC), multi-tenant territory scoping, input validation, and administrative governance across the Choutuppal Franchise CRM platform.

The system currently operates on local JSON storage (`data/admin_data.json`) with an exact cryptographic baseline hash of `d6a6e8bafe75cff95fdf2b15f671963b163bc5193c9aeea96cb41c66ced4d04f`. The application features Next.js 15 App Router architecture, Termux local environment execution, and an established role hierarchy (`SUPER_ADMIN`, `PLATFORM_OPERATOR`, `FRANCHISE_ADMIN`, `FRANCHISE_REVIEWER`, `FRANCHISE_STAFF`, `USER`).

The primary goal of this phase is to eliminate all identified Critical and High security vulnerabilities, achieve 100% audit logging coverage for mutating workflows, protect against mass-assignment and formula injection, ensure zero leakage of secrets, and deliver an accessible, server-paginated Audit Log viewer without modifying or resetting existing business records.

---

## 2. Environment & Baseline Assessment

### 2.1 File System & Data Store Invariants
- **Source Working Copy:** `/data/user/0/com.termux/files/home/storage/downloads/Cpl Crm/choutuppal-franchise-crm`
- **Ext4 Verification Workspace:** `/data/user/0/com.termux/files/home/projects/build-verify-crm`
- **Authoritative Data Store Path:** `data/admin_data.json`
- **Baseline SHA-256:** `d6a6e8bafe75cff95fdf2b15f671963b163bc5193c9aeea96cb41c66ced4d04f`
- **Record Counts:**
  - `listings`: 212
  - `contacts`: 211
  - `deals`: 4
  - `automations`: 179
  - `franchises`: 3
  - `territories`: 4
  - `magicTokens`: 38
  - `auditLogs`: 110 (legacy schema)
  - `franchiseStaff`: 0
  - `governmentContacts`: 0

### 2.2 Security Boundary Commitments
1. **Zero Database Destructive Actions:** Absolutely no reset, deletion, truncation, or synthetic rewriting of `data/admin_data.json`.
2. **Zero External Side-Effects:** No live WhatsApp API dispatches, no payment gateway live transactions, no external database connections (Supabase/Firebase disabled).
3. **Zero Secrets in Logs/Artifacts:** No plaintext tokens, passwords, sessions, or unmasked PII in logs, reports, or console outputs.

---

## 3. Threat Modeling & Vulnerability Findings

A comprehensive static analysis and architecture audit was performed across all 37 API route handlers and library utilities. The findings are categorized by severity below:

| ID | Severity | Category | Affected File(s) | Description | Proposed Remediation |
|---|---|---|---|---|---|
| **SEC-01** | **CRITICAL** | Broken Authentication / Access Control | `src/app/api/admin/monetization/route.ts` | GET and POST handlers lack authentication (`requireAuth` or `requireSuperAdmin`). Unauthenticated callers can view orders/subscriptions and create billing plans. POST trusts client-supplied `actorId`/`actorName`. | Enforce `requireSuperAdmin` on plan creation and monetization admin endpoints; derive actor identity solely from verified server session. |
| **SEC-02** | **CRITICAL** | Broken Authentication & IDOR | `src/app/api/crm/flows/route.ts` | GET, POST, PUT, DELETE handlers completely lack authentication and territory scoping. Anyone can read, modify, or delete bot flows across all franchise territories. | Enforce `requireAuth` on all handlers; enforce `requireTerritoryAccess` on POST, PUT, DELETE; filter non-Super Admin GET by `user.territoryId`. |
| **SEC-03** | **HIGH** | Missing Audit Coverage | `src/app/api/admin/listings/route.ts`, `src/app/api/crm/contacts/route.ts` | Business listing creation, updates, and deletion do not generate audit logs. Normal contact creation, updates, and deletions omit audit logs. | Integrate `logAuditEvent` with structured metadata, entity IDs, and before/after change summaries for all mutations. |
| **SEC-04** | **HIGH** | Incomplete Audit Schema & Lack of Outcome Tracking | `src/lib/types.ts`, `src/lib/store.ts` | AuditLog interface lacks `outcome` (`SUCCESS` / `FAILURE`), `entityType`, and `entityId`. Failed operations and cross-tenant unauthorized attempts are not recorded. | Expand `AuditLog` interface and `logAuditEvent` to support `outcome`, `entityType`, `entityId`, and `requestId`, while maintaining 100% backwards compatibility with existing 110 legacy records. |
| **SEC-05** | **MEDIUM** | Mass-Assignment Vulnerability | `src/app/api/admin/listings/route.ts`, `src/app/api/crm/contacts/route.ts` | PUT handlers perform object spread (`...existing, ...updates`) without strict field allowlists, permitting unauthorized modification of internal fields (e.g. `views`, `clicks`, `createdAt`). | Implement strict field allowlists on PUT endpoints, discarding unexpected or protected internal attributes. |
| **SEC-06** | **MEDIUM** | CSV Formula Injection (CWE-1236) | `src/app/api/admin/government-contacts/export/route.ts` | CSV export function `escapeCsvField` escapes quotes and commas but fails to neutralize leading formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`), posing code execution risk in Excel/Sheets. | Sanitize or prefix leading formula characters with a single quote (`'`) to neutralize dynamic spreadsheet execution. |
| **SEC-07** | **LOW** | PII Exposure in Audit Free-Text | `src/app/api/admin/staff/route.ts` | Staff creation logs the unmasked 10-digit Indian phone number directly into free-text audit `details`. | Enforce `maskPhoneNumber` before writing phone numbers into audit details or metadata. |
| **SEC-08** | **LOW** | Missing Centralized Audit Viewer | `src/app/admin/audit-logs/` | No user interface or dedicated API endpoint exists for authorized administrators to inspect, filter, or export security audit logs. | Implement `/api/admin/audit-logs` (with RBAC, pagination, and filtering) and `/admin/audit-logs` UI with search, filtering, and detail inspection. |

---

## 4. Role-Based Access Control (RBAC) Matrix

The system recognizes five distinct actor roles. Phase 5 strictly defines and enforces the following permission boundary:

| Feature / Resource | SUPER_ADMIN | PLATFORM_OPERATOR | FRANCHISE_ADMIN | FRANCHISE_REVIEWER | FRANCHISE_STAFF |
|---|:---:|:---:|:---:|:---:|:---:|
| **Dashboard & System Health** | All Territories | All Territories | Assigned Territory | Assigned Territory | Read-Only Summary |
| **Audit Logs Inspection** | All Records | All Records | Assigned Territory Only | Denied (403) | Denied (403) |
| **Audit Logs CSV Export** | Yes (Sanitized) | Yes (Sanitized) | Assigned Territory Only | Denied (403) | Denied (403) |
| **Business Listings Read** | All Territories | All Territories | Assigned Territory | Assigned Territory | Assigned Territory |
| **Business Listings Create/Edit** | All Territories | All Territories | Assigned Territory | Review Only | Assigned Territory |
| **Business Listings Delete** | All Territories | Denied | Assigned Territory | Denied | Denied |
| **Bulk Listing Operations** | All Territories | All Territories | Assigned Territory (No Delete) | Denied | Denied |
| **CRM Contacts CRUD** | All Territories | All Territories | Assigned Territory | Assigned Territory (Read) | Assigned Territory |
| **CRM Bot Flows Create/Edit** | All Territories | All Territories | Assigned Territory | Denied | Denied |
| **Franchise Staff Management** | All Franchises | Denied | Assigned Franchise Only | Denied | Denied |
| **System Settings & Secrets** | Read/Write (Masked) | Denied | Denied | Denied | Denied |
| **Monetization & Plans** | Read/Write | Read-Only | Read-Only (Assigned) | Denied | Denied |

---

## 5. Implementation Roadmap & Execution Stages

### Stage 2: Audit Logging Schema & Core Store Hardening
1. Update `src/lib/types.ts`: Extend `AuditLog` interface with optional `entityType`, `entityId`, `outcome: 'SUCCESS' | 'FAILURE'`, `requestId`, and safe metadata.
2. Update `src/lib/store.ts`:
   - Enhance `logAuditEvent` to accept and record the new structured fields.
   - Automatically mask phone numbers and strip sensitive keys (`password`, `token`, `secret`, `cookie`, `key`) from metadata.
   - Provide `getAuditLogs({ page, pageSize, territoryId, action, outcome, actorId, entityType, startDate, endDate, search })` query helper with server-side pagination and backwards compatibility for existing 110 logs.

### Stage 3: API Route Hardening & Audit Instrumentation
1. **Fix SEC-01 (`src/app/api/admin/monetization/route.ts`):** Enforce `requireAuth` on GET (scoped by territory for non-Super Admin) and `requireSuperAdmin` on POST. Derive actor identity from session.
2. **Fix SEC-02 (`src/app/api/crm/flows/route.ts`):** Enforce `requireAuth` and `requireTerritoryAccess`. Add audit logging for flow creation, update, and deletion.
3. **Fix SEC-03 & SEC-05 (`src/app/api/admin/listings/route.ts` & `src/app/api/crm/contacts/route.ts`):**
   - Implement strict field allowlists on PUT to prevent mass-assignment.
   - Instrument POST, PUT, DELETE with `logAuditEvent`.
4. **Fix SEC-06 (`src/app/api/admin/government-contacts/export/route.ts`):** Neutralize formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) with single-quote escaping.
5. **Fix SEC-07 (`src/app/api/admin/staff/route.ts`):** Mask phone numbers in audit details.
6. **Instrument Authorization Failures:** Log security audit events on failed cross-tenant mutation attempts or privilege escalation attempts.

### Stage 4: Audit Logs API & UI Viewer
1. Create `src/app/api/admin/audit-logs/route.ts`:
   - Enforce `requireAuth`.
   - Apply role-based territory scoping (Super Admin views all; Franchise Admin views territory; others receive 403).
   - Support pagination, filtering, and safe CSV export with formula injection prevention.
2. Create `src/app/admin/audit-logs/page.tsx`:
   - Modern, responsive SaaS table built with Phase 4 components (`AdminPageContainer`, `AdminPageHeader`, `AdminBreadcrumbs`, `AdminBadge`, `AdminTableSkeleton`, `AdminEmptyState`).
   - Filter by Action, Actor, Territory, Outcome (`SUCCESS` / `FAILURE`), Date range, and keyword search.
   - Detail modal showing full audit record and sanitized metadata.
3. Update `src/components/admin/admin-sidebar.tsx` and `src/components/admin/admin-command-palette.tsx` with audit log links.

### Stage 5: Verification & Automated Test Suite
1. Create `test_phase5_security_governance.py`:
   - Authentication & session invalidation.
   - RBAC & cross-tenant IDOR rejection.
   - Audit log generation, correctness, and PII masking.
   - CSV formula injection escaping.
   - Data store byte-for-byte invariance against baseline hash.
2. Run existing regression test suites (`test_phase4_ui_ux_modernization.py`, `test_phase3_super_admin_controls.py`, etc.).
3. Synchronize to `/data/user/0/com.termux/files/home/projects/build-verify-crm`.
4. Execute `pnpm exec tsc --noEmit` and `pnpm run build` in the ext4 workspace.
5. Generate `project-discovery/phase-5-security-implementation-report.md`.

---

## 6. Verification Plan & Test Matrix

| Test Suite | Purpose | Target Outcome |
|---|---|---|
| **Suite 1: Data Invariance** | Compare `data/admin_data.json` against `d6a6e8bafe...` | Exact match (0 mutations) |
| **Suite 2: Authentication Enforcement** | Request unauthenticated access to monetization, flows, staff, listings | HTTP 401 Unauthorized |
| **Suite 3: RBAC & Privilege Enforcement** | Franchise Admin attempts Super Admin actions or role escalation | HTTP 403 Forbidden |
| **Suite 4: Territory IDOR Guards** | Franchise Admin attempts cross-tenant contact/listing/flow edit | HTTP 403 Forbidden |
| **Suite 5: Mass-Assignment Defense** | PUT payload with injected internal fields (`views`, `createdAt`) | Fields ignored / unmutated |
| **Suite 6: Formula Injection Protection** | CSV export of records with `=SUM()`, `@exec`, `+cmd` | Escaped with leading `'` |
| **Suite 7: Audit Logging Coverage** | Create/Update/Delete listing, contact, flow | AuditLog generated with correct actor/outcome |
| **Suite 8: Audit Log API & Scoping** | Franchise Admin queries audit logs | Scoped to caller's territory |
| **Suite 9: TypeScript Verification** | `pnpm exec tsc --noEmit` | Exit code 0, 0 errors |
| **Suite 10: Production Next.js Build** | `pnpm run build` | Exit code 0, all routes compiled |
