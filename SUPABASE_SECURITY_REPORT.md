# Supabase Security & Row Level Security (RLS) Report

**Project**: Choutuppal WhatsApp CRM & Multi-Town Platform  
**Target Domain**: [choutuppal.in](https://choutuppal.in)  
**Supabase Project Ref**: `llcfxewxqrmdzlvnzzxm`  
**Security Standard**: Least Privilege, Multi-Tenant Tenant Isolation, Tamper-Evident Audit Trails  
**Date**: October 29, 2026  

---

## 1. Security Architecture Summary

The security architecture of the Choutuppal platform enforces zero-trust, multi-tenant isolation anchored by Row Level Security (RLS) policies and PostgreSQL `SECURITY DEFINER` functions.

```text
┌────────────────────────────────────────────────────────┐
│                   Incoming Request                     │
└───────────────────────────┬────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               │  Caller Role & Auth ID  │
               └────────────┬────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
  SUPER_ADMIN        FRANCHISE_ADMIN       PUBLIC / ANON
  (Full Global       (Strict Territory    (Public Published
   Bypass)            Scoped Access)       Listings Only)
```

---

## 2. Security Definer Helper Functions

Defined in `supabase/migrations/01_rls_policies.sql` and `04_rls_security_policies.sql`:

1. **`public.is_super_admin()`**:
   - Queries `public.profiles` for `role IN ('SUPER_ADMIN', 'PLATFORM_OPERATOR')`.
   - Runs with `SET search_path = public` to prevent search-path injection.
2. **`public.current_territory_id()`**:
   - Dynamically resolves caller's assigned territory from `profiles` or active `franchise_staff`.
   - Rejects unassigned or suspended staff callers.
3. **`public.is_territory_active(target_territory_id)`**:
   - Verifies whether a territory is active and its franchise partner is in good standing before allowing data writes.

---

## 3. Policy Matrix & Access Control Guarantees

| Table | Anon / Public Access | Franchise Staff / Admin Access | Super Admin Access |
| :--- | :--- | :--- | :--- |
| `territories` | Read active only | Read assigned territory | Full Manage |
| `franchises` | Read active only | Read own franchise | Full Manage |
| `profiles` | None | Read/Update own profile (No role escalation) | Full Manage |
| `listings` | Read published only | Manage own territory listings | Full Manage |
| `approvals` | Insert pending only | Read/Review own town queue | Full Manage |
| `contacts` | **STRICTLY BLOCKED** | Read/Update own territory leads | Full Manage |
| `whatsapp_messages` | **STRICTLY BLOCKED** | Read/Send own territory messages | Full Manage |
| `conversations` | **STRICTLY BLOCKED** | Read/Manage own territory threads | Full Manage |
| `automation_rules`| **STRICTLY BLOCKED** | Read/Manage own town rules | Full Manage |
| `audit_logs` | **STRICTLY BLOCKED** | Read own town events | Full Read Only |
| `webhook_events` | **STRICTLY BLOCKED** | **STRICTLY BLOCKED** (System only) | Full Read Only |

---

## 4. Key Threat Mitigations

1. **Self-Privilege Escalation Prevention**:
   - In `profiles_update_own`, `WITH CHECK` clauses enforce that users can update personal metadata (name, avatar), but **cannot alter their `role` or `territory_id`**.
2. **Tamper-Evident Audit Trails**:
   - `REVOKE UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;`
   - `REVOKE UPDATE, DELETE ON public.webhook_events FROM anon, authenticated;`
   - Operational logs cannot be modified or erased, even by authenticated franchise admins.
3. **Customer PII & Lead Shielding**:
   - `public.contacts` and `public.whatsapp_messages` have zero anonymous read policies. Customer phone numbers and conversation transcripts are protected from web scraping.
4. **Service Role Key Seclusion**:
   - `SUPABASE_SERVICE_ROLE_KEY` is exclusively accessed server-side in `getSupabaseAdminClient()`.
   - The browser client only receives `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
