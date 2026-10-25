# Phase B: Supabase and PostgreSQL RLS Policy Inventory & Audit

**Date**: 2026-10-25  
**Auditor**: Principal Application Security Engineer  
**Component**: `supabase/schema.sql` & PostgreSQL Database Policies  
**Status**: AUDIT COMPLETE — CRITICAL GAPS IDENTIFIED — REMEDIATION SPECIFIED  

---

## 1. Table-by-Table RLS Baseline Audit

Below is the verification of the 11 multi-tenant tables currently defined in `supabase/schema.sql`:

| Table Name | RLS Enabled? | FORCE RLS? | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy | Assessment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `public.territories` | ❌ NO | ❌ NO | ❌ None | ❌ None | ❌ None | ❌ None | **CRITICAL EXPOSURE** |
| `public.franchises` | ❌ NO | ❌ NO | ❌ None | ❌ None | ❌ None | ❌ None | **CRITICAL EXPOSURE** |
| `public.territory_domains` | ❌ NO | ❌ NO | ❌ None | ❌ None | ❌ None | ❌ None | **CRITICAL EXPOSURE** |
| `public.profiles` | ❌ NO | ❌ NO | ❌ None | ❌ None | ❌ None | ❌ None | **CRITICAL EXPOSURE** |
| `public.franchise_staff` | ❌ NO | ❌ NO | ❌ None | ❌ None | ❌ None | ❌ None | **CRITICAL EXPOSURE** |
| `public.listings` | ❌ NO | ❌ NO | ❌ None | ❌ None | ❌ None | ❌ None | **CRITICAL EXPOSURE** |
| `public.approvals` | ❌ NO | ❌ NO | ❌ None | ❌ None | ❌ None | ❌ None | **CRITICAL EXPOSURE** |
| `public.stories` | ❌ NO | ❌ NO | ❌ None | ❌ None | ❌ None | ❌ None | **CRITICAL EXPOSURE** |
| `public.offers` | ❌ NO | ❌ NO | ❌ None | ❌ None | ❌ None | ❌ None | **CRITICAL EXPOSURE** |
| `public.contacts` | ❌ NO | ❌ NO | ❌ None | ❌ None | ❌ None | ❌ None | **CRITICAL EXPOSURE** |
| `public.audit_logs` | ❌ NO | ❌ NO | ❌ None | ❌ None | ❌ None | ❌ None | **CRITICAL EXPOSURE** |

---

## 2. Answers to Mandatory RLS Criteria

1. **Is RLS enabled?**  
   `NO`. `supabase/schema.sql` did not issue `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` on any table.
2. **Is RLS forced where appropriate?**  
   `NO`. Table owners and superusers bypass RLS unless `FORCE ROW LEVEL SECURITY` is applied.
3. **Are table grants correct for anon, authenticated, and privileged server roles?**  
   `NO`. Default PostgreSQL grants apply; anonymous connections can query any table via PostgREST.
4. **Are SELECT, INSERT, UPDATE, and DELETE independently controlled?**  
   `NO`. No policies exist.
5. **Does each policy use the correct authenticated identity and authorized territory assignment?**  
   `NO`. Territory scoping was only partially implemented in application-level JSON filters, not at the database engine level.
6. **Can a client insert a row with a different `territory_id`?**  
   `YES`. Without RLS `WITH CHECK` clauses, any client with database credentials could insert rows into any territory.
7. **Can a client change an existing row's `territory_id`?**  
   `YES`. Without `UPDATE ... USING (...) WITH CHECK (...)` rules, cross-tenant reassignment is possible.
8. **Can users access related records through foreign keys, views, or joins?**  
   `YES`. Any PostgREST join (`/rest/v1/listings?select=*,territories(*)`) would expose cross-tenant data.
9. **Can unauthenticated users read private data?**  
   `YES`. Private CRM contacts and pending approval queue items are completely exposed if RLS is absent.
10. **Can an inactive or suspended franchise continue making privileged changes?**  
    `YES`. Without database-level status verification functions, suspended franchises are not automatically blocked by the database.

---

## 3. Remediation Specifications

To achieve complete tenant isolation and satisfy Phase B requirements, `supabase/schema.sql` must be enhanced with:

1. **Helper Security Functions**:
   - `auth.is_super_admin()`: Returns true if caller UID has `SUPER_ADMIN` role in `public.profiles`.
   - `auth.current_territory_id()`: Returns caller UID's assigned `territory_id`.
   - `auth.is_territory_active(t_id)`: Checks whether territory is active and franchise is not suspended.
2. **Mandatory Row Level Security Activation**:
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` on all 11 tables.
   - `ALTER TABLE ... FORCE ROW LEVEL SECURITY;` where applicable.
3. **Granular Policies**:
   - **Public Read Rules**: Only published listings and public territory metadata can be read by anonymous users.
   - **Tenant Scoping Rules**: Franchise Admins and Staff are strictly restricted to `territory_id = auth.current_territory_id()`.
   - **Immutability Rules**: `territory_id` cannot be modified during UPDATE.
   - **Tamper-Proof Audit Logs**: `audit_logs` are INSERT-only for the application; UPDATE and DELETE are revoked for all non-superusers.
