# Phase C, D & F: API Authorization, Tenant Isolation (IDOR/BOLA) & Role Escalation Audit

**Date**: 2026-10-25  
**Auditor**: Principal Application Security Engineer & Multi-Tenant SaaS Architect  
**Components**: Next.js App Router API Handlers (`src/app/api/*`), Admin Pages, Webhook Receiver  
**Status**: AUDIT COMPLETE — FINDINGS LOGGED — REMEDIATION SPECIFIED  

---

## 1. API Route Classification & Authorization Matrix

| Endpoint | Method | Intended Access Level | Current Actual Protection | Vulnerability / Gap |
| :--- | :--- | :--- | :--- | :--- |
| `/api/admin/franchises` | `GET` | Super Admin Only | ❌ None (Public) | Network stats, all franchises, private audit logs exposed to anyone. |
| `/api/admin/franchises` | `POST action="create"` | Super Admin Only | ❌ None (Public) | Any unauthenticated user can create arbitrary franchises. |
| `/api/admin/franchises` | `POST action="update_status"` | Super Admin Only | ❌ None (Public) | Any unauthenticated user can suspend or activate arbitrary town franchises. |
| `/api/admin/franchises` | `POST action="update_plan"` | Super Admin Only | ❌ None (Public) | Any caller can modify commercial pricing, quotas, and fee structures. |
| `/api/admin/listings` | `GET` | Scoped Franchise / Admin | ❌ None (Public) | Returns listings across all territories if caller requests them. |
| `/api/admin/listings` | `POST` | Scoped Franchise / Admin | ❌ None (Public) | Caller can submit arbitrary `territoryId` in body (Cross-tenant injection). |
| `/api/admin/listings` | `PUT` | Scoped Owner / Admin | ❌ None (Public) | **IDOR / BOLA**: Caller can modify another franchise's listing simply by passing its `id`. |
| `/api/admin/listings` | `DELETE` | Scoped Admin | ❌ None (Public) | **IDOR / BOLA**: Any caller can delete any listing across the entire platform. |
| `/api/admin/approvals` | `GET` | Scoped Admin | ❌ None (Public) | Private citizen submissions and franchise applications exposed. |
| `/api/admin/approvals` | `POST` | Scoped Admin | ❌ None (Public) | Any unauthenticated user can approve, reject, or request changes on any item. |
| `/api/admin/content` | `GET` | Public / Admin | ❌ None (Public) | Global banners, tickers, news, shorts dump. |
| `/api/admin/content` | `POST` | Super Admin / Scoped | ❌ None (Public) | Any caller can delete or toggle content for any territory. |
| `/api/crm/contacts` | `GET` | Scoped Admin | ❌ None (Public) | **Severe Data Leak**: Customer names, phone numbers, notes exposed to public. |
| `/api/crm/contacts` | `POST` / `PUT` | Scoped Admin | ❌ None (Public) | Any caller can inject or overwrite customer contacts. |
| `/api/whatsapp/webhook` | `GET` | Meta Verification | ⚠️ Hardcoded fallback | Uses `choutuppal_verify_token` if env not set. |
| `/api/whatsapp/webhook` | `POST` | Meta Cloud API | ❌ No Signature Check | **Forged Webhook Injection**: No HMAC-SHA256 signature check. |
| `/api/whatsapp/send` | `POST` | Authenticated Admin | ❌ None (Public) | **SMS / WhatsApp Flooding**: Anyone can trigger outbound messages. |
| `/api/upload/r2` | `POST` | Authenticated Admin | ❌ None (Public) | Arbitrary file upload / presigned URL generation. |
| `/api/shorts/submit` | `POST` | Public with Moderation | ⚠️ Bypasses Moderation | Sets `isActive: true` immediately without going to approval queue. |

---

## 2. Attack Scenario Evaluations (Ten Primary Scenarios)

### Scenario 1: Cross-Tenant Listing Modification (IDOR / BOLA)
- **Precondition**: Attacker has knowledge of or enumerates a listing ID in Franchise B (`lst_suryapet_01`).
- **Observed Behavior**: Calling `PUT /api/admin/listings` with `{ "id": "lst_suryapet_01", "price": "10" }` succeeds and alters the record, because the route does not verify caller identity or match `existing.territoryId` with the caller's authorized territory.
- **Result**: **CONFIRMED VULNERABLE (HIGH)**.

### Scenario 2: Cross-Tenant Listing Deletion (IDOR / BOLA)
- **Precondition**: Attacker calls `DELETE /api/admin/listings?id=lst_...` for a listing in another territory.
- **Observed Behavior**: The listing is deleted from the store without verifying whether the caller owns or manages that territory.
- **Result**: **CONFIRMED VULNERABLE (HIGH)**.

### Scenario 3: Cross-Tenant Listing Injection
- **Precondition**: Franchise Admin for Suryapet submits `{ "title": "Injected Shop", "territoryId": "territory_bhongir" }`.
- **Observed Behavior**: The API blindly trusts `body.territoryId` instead of enforcing the caller's server-authenticated territory.
- **Result**: **CONFIRMED VULNERABLE (HIGH)**.

### Scenario 4: Super Admin Role Escalation via Unprotected Endpoints
- **Precondition**: An ordinary merchant or unauthenticated user sends `POST /api/admin/franchises` with `action: 'create'` or `action: 'update_status'`.
- **Observed Behavior**: The request executes with full administrative privileges.
- **Result**: **CONFIRMED VULNERABLE (CRITICAL)**.

### Scenario 5: Flagship Immutability Bypass via Direct API Call
- **Precondition**: User sends `POST /api/admin/franchises` with `action: 'update_status'`, `franchiseId: 'fr_choutuppal'`, `newStatus: 'suspended'`.
- **Observed Behavior**: The backend API checks `if (franchise.territoryId === FLAGSHIP_TERRITORY_ID) return 403`.
- **Result**: **DEFENDED (PASS)** — Flagship suspension is blocked at the API layer.

### Scenario 6: Unauthenticated Moderation Approval Queue Manipulation
- **Precondition**: Caller sends `POST /api/admin/approvals` with `{ "id": "appr_123", "action": "approve" }`.
- **Observed Behavior**: Item is approved and auto-published to website and WhatsApp bot without verifying caller credentials.
- **Result**: **CONFIRMED VULNERABLE (CRITICAL)**.

### Scenario 7: Webhook Payload Forgery & Fake Approval Trigger
- **Precondition**: Attacker sends a forged HTTP POST to `/api/whatsapp/webhook` simulating an incoming vendor message or franchise application.
- **Observed Behavior**: Webhook processes the payload and inserts an approval item without checking the `X-Hub-Signature-256` header.
- **Result**: **CONFIRMED VULNERABLE (HIGH)**.

### Scenario 8: Outbound WhatsApp Abuse & Quota Depletion
- **Precondition**: Attacker calls `POST /api/whatsapp/send` with an arbitrary phone number.
- **Observed Behavior**: Outbound WhatsApp message is triggered using the company's Cloud API token.
- **Result**: **CONFIRMED VULNERABLE (HIGH)**.

### Scenario 9: Route Protection Bypass in Frontend
- **Precondition**: User navigates directly to `https://choutuppal.in/admin` or `https://choutuppal.in/crm`.
- **Observed Behavior**: The page renders all admin tools; no Next.js middleware halts navigation or redirects to `/login`.
- **Result**: **CONFIRMED VULNERABLE (CRITICAL)**.

### Scenario 10: CRM Contact Lead Extraction
- **Precondition**: User requests `GET /api/crm/contacts`.
- **Observed Behavior**: All 211 contacts and customer phone numbers are returned without authentication.
- **Result**: **CONFIRMED VULNERABLE (CRITICAL)**.

---

## 3. Required Remediation Architecture

1. **Next.js Global Middleware (`src/middleware.ts`)**:
   - Intercepts all requests matching `/admin/:path*` and `/crm/:path*`.
   - Validates session cookie or JWT. If absent or invalid, immediately redirects to `/login?redirect=...`.
2. **Server-Side Session & RBAC Helper (`src/lib/auth-server.ts`)**:
   - `getAuthenticatedSession(req)`: Reads session cookie, verifies cryptographic signature.
   - `requireSuperAdmin(req)`: Asserts `session.role === 'SUPER_ADMIN'`; returns 401/403 otherwise.
   - `requireTerritoryAccess(req, targetTerritoryId)`: Allows if `session.role === 'SUPER_ADMIN'` OR `session.territoryId === targetTerritoryId`. Rejects otherwise with 403 Forbidden.
3. **Webhook Cryptographic Signature Verification**:
   - Compute `HMAC-SHA256(rawBody, appSecret)` and verify constant-time comparison against `X-Hub-Signature-256`.
4. **IDOR Defense on Listings, Approvals, and Contacts**:
   - For every mutation, verify `existingRecord.territoryId === callerTerritoryId`.
   - Never accept caller-supplied `territoryId` in POST bodies to override authorized territory.
