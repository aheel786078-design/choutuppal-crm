# Phase I: Vulnerability Findings, Remediation Plan & Patch Specification

**Date**: 2026-10-25  
**Auditor**: Principal Application Security Engineer  
**Status**: REMEDIATION ACTION PLAN  

---

## 1. Vulnerability Findings Register

### Finding SEC-01: Complete Absence of Authentication on Admin API Routes
- **Severity**: **CRITICAL** (CVSS 9.8 / CWE-306)
- **Affected Files**:
  - `src/app/api/admin/franchises/route.ts`
  - `src/app/api/admin/approvals/route.ts`
  - `src/app/api/admin/listings/route.ts`
  - `src/app/api/admin/content/route.ts`
  - `src/app/api/crm/contacts/route.ts`
- **Observed Behavior**: Anyone can invoke GET, POST, PUT, DELETE without providing a token, cookie, or API key.
- **Expected Secure Behavior**: All administrative endpoints must require a valid authenticated session. Non-super-admin users must be restricted to their assigned territory.
- **Remediation**:
  1. Build `src/lib/auth-server.ts` with signed session tokens (`session_token` cookie or Bearer token).
  2. Implement `authenticateRequest(req)` checking role and territory.
  3. Enforce 401 Unauthorized for unauthenticated requests and 403 Forbidden for insufficient permissions.

---

### Finding SEC-02: Missing Route Protection Middleware for `/admin` & `/crm`
- **Severity**: **CRITICAL** (CVSS 8.8 / CWE-285)
- **Affected Files**: No middleware exists (`src/middleware.ts` missing).
- **Observed Behavior**: Navigating to `https://choutuppal.in/admin` or `https://choutuppal.in/crm` in a browser renders the administrative panels without checking for an active session.
- **Expected Secure Behavior**: Unauthenticated visits to `/admin/*` or `/crm/*` must be intercepted server-side and redirected to `/login?redirect=...`.
- **Remediation**:
  1. Implement `src/middleware.ts` using Next.js Edge Middleware.
  2. Validate session cookie against HMAC signature.
  3. Redirect unauthenticated traffic to `/login`.

---

### Finding SEC-03: Insecure PRNG, Plaintext Storage & Unanchored Magic Link Sessions
- **Severity**: **CRITICAL** (CVSS 9.1 / CWE-330, CWE-256)
- **Affected Files**:
  - `src/lib/store.ts` (`generateMagicToken`, `verifyMagicToken`)
  - `src/app/api/auth/magic-link/route.ts`
  - `src/app/admin/franchise/page.tsx` (`handleGenerateMagicLink`)
- **Observed Behavior**:
  - Tokens use `Math.random().toString(36).substring(2, 8)` with only 6 characters.
  - Raw tokens are stored unhashed.
  - Verification returns `{ authenticated: true }` without issuing a signed HTTP-only session cookie.
  - UI generates tokens client-side without persisting them.
- **Expected Secure Behavior**:
  - Use `crypto.randomBytes(32).toString('hex')`.
  - Store only `sha256(token)`.
  - Atomically consume tokens.
  - Issue a cryptographically signed HTTP-only `session_token` cookie on verification.
- **Remediation**:
  1. Rewrite `generateMagicToken` and `verifyMagicToken` in `src/lib/store.ts` using Node.js `crypto`.
  2. Update `/api/auth/magic-link` to hash tokens, enforce single-use, and set an HTTP-only secure cookie.
  3. Fix `src/app/admin/franchise/page.tsx` to request the token from `/api/auth/magic-link`.

---

### Finding SEC-04: Cross-Tenant Insecure Direct Object References (IDOR / BOLA)
- **Severity**: **HIGH** (CVSS 8.5 / CWE-639)
- **Affected Files**:
  - `src/app/api/admin/listings/route.ts` (PUT, DELETE)
  - `src/app/api/admin/approvals/route.ts` (POST)
  - `src/app/api/crm/contacts/route.ts` (PUT, DELETE)
- **Observed Behavior**: Endpoints accept record IDs and modify/delete them without verifying whether the record belongs to the caller's authorized territory.
- **Expected Secure Behavior**: Mutation operations must verify `record.territoryId === caller.territoryId` (or caller is `SUPER_ADMIN`).
- **Remediation**:
  1. Add record-level territory ownership check in PUT and DELETE handlers.
  2. Reject cross-tenant updates/deletions with HTTP 403 Forbidden.

---

### Finding SEC-05: Missing Webhook HMAC-SHA256 Signature Verification
- **Severity**: **HIGH** (CVSS 7.5 / CWE-353)
- **Affected Files**: `src/app/api/whatsapp/webhook/route.ts`
- **Observed Behavior**: POST requests do not validate `X-Hub-Signature-256`. Anyone can forge inbound messages, vendor claims, or listing approval triggers.
- **Expected Secure Behavior**: Validate `X-Hub-Signature-256` against `crypto.createHmac('sha256', appSecret)`.
- **Remediation**:
  1. Add signature verification in `POST /api/whatsapp/webhook`.
  2. Reject invalid or missing signatures with HTTP 401 Unauthorized.

---

### Finding SEC-06: Missing Database Row Level Security (RLS) in `supabase/schema.sql`
- **Severity**: **CRITICAL** (CVSS 9.4 / CWE-284)
- **Affected Files**: `supabase/schema.sql`
- **Observed Behavior**: Zero `ENABLE ROW LEVEL SECURITY` statements; zero security policies.
- **Expected Secure Behavior**: Every table must enforce RLS with granular SELECT, INSERT, UPDATE, DELETE policies isolating tenants by `territory_id`.
- **Remediation**:
  1. Rewrite `supabase/schema.sql` to enable RLS on all 11 tables.
  2. Add helper functions `auth.is_super_admin()`, `auth.current_territory_id()`, `auth.is_territory_active()`.
  3. Define explicit policies for public read, tenant isolation, and audit log append-only immutability.

---

### Finding SEC-07: Missing `.gitignore` Causing Secret Exposure Risk
- **Severity**: **MEDIUM** (CVSS 5.3 / CWE-538)
- **Affected Files**: Repository root
- **Observed Behavior**: `.gitignore` was absent. `.env.local` was tracked in Git.
- **Expected Secure Behavior**: `.env`, `.env.local`, and sensitive build artifacts must be strictly ignored.
- **Remediation**:
  1. Create `.gitignore` with comprehensive exclusions for environment files, node_modules, and build outputs.

---

### Finding SEC-08: Unrestricted Outbound WhatsApp Messaging via `/api/whatsapp/send`
- **Severity**: **HIGH** (CVSS 7.3 / CWE-284, CWE-799)
- **Affected Files**: `src/app/api/whatsapp/send/route.ts`
- **Observed Behavior**: Unauthenticated POST triggers real outbound WhatsApp messages to arbitrary phone numbers.
- **Expected Secure Behavior**: Restrict to authenticated admin callers with rate limits.
- **Remediation**:
  1. Require authenticated session for `/api/whatsapp/send`.
  2. Validate destination phone format and rate limit dispatch.

---

### Finding SEC-09: Unrestricted File Upload & Presigned URL Generation
- **Severity**: **MEDIUM** (CVSS 6.5 / CWE-434)
- **Affected Files**: `src/app/api/upload/r2/route.ts`
- **Observed Behavior**: Unauthenticated POST requests can upload files or obtain Cloudflare R2 presigned upload URLs without file type or size validation.
- **Expected Secure Behavior**: Require authentication, enforce file type allowlists (images/videos only), and enforce size limits (max 10MB).
- **Remediation**:
  1. Require authenticated session.
  2. Validate MIME type (`image/jpeg`, `image/png`, `image/webp`, `video/mp4`).

---

### Finding SEC-10: Immediate Auto-Publication of Shorts Without Moderation
- **Severity**: **LOW** (CVSS 4.3 / CWE-862)
- **Affected Files**: `src/app/api/shorts/submit/route.ts`
- **Observed Behavior**: Submitting a short/reel directly sets `isActive: true` instead of sending to the moderation approval queue.
- **Expected Secure Behavior**: Public submissions should create a record in `store.approvals` with status `pending` or set `isActive: false` until approved.
- **Remediation**:
  1. Set `isActive: false` by default and route submission through `store.approvals`.
