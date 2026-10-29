# Project Discovery Report 29: Admin-Controlled Business Listing Order in WhatsApp Flow Builder

**Phase:** Phase 9 — Admin-Controlled Business Listing Order in WhatsApp Flow Builder  
**Project:** Choutuppal Franchise CRM (`choutuppal-franchise-crm`)  
**Storage Engine:** Local JSON Store (`data/admin_data.json`)  
**Status:** COMPLETED & 100% VERIFIED  
**Date:** October 27, 2026  

---

## 1. Executive Summary & Objective Realization

Phase 9 successfully implements full administrator control over business listing presentation and sequence within the WhatsApp Visual Flow Builder. Administrators can now configure:

1. **Exact Listing Sequences:** Which business listings appear first, second, third, etc., in WhatsApp interactive messages.
2. **Category Precedence:** Which business categories appear first, second, and third within multi-category listing flows.
3. **Internal Category Ordering:** How individual businesses within each category are sorted (alphabetically, newest, or manually).
4. **Automated vs. Manual Sorting:** Five distinct sort modes (`manual`, `category_priority`, `newest`, `alphabetical`, `featured`).
5. **Interactive Navigation & Detail Handoff:** Seamless transition when customers select a business (`listing_<id>`) or paginate through batches (`page_<N>`), with strict Meta WhatsApp Cloud API compliance (maximum 10 rows per interactive list message).

All features operate under strict multi-tenant territory isolation (`territory_choutuppal`) and publication gating (only approved/published listings visible to WhatsApp callers), while maintaining complete backward compatibility with existing flows and zero external database dependencies.

---

## 2. Baseline Record Counts & Preservation Audit

In adherence to non-negotiable data preservation rules, zero records were deleted, overwritten, or corrupted.

| Entity Type | Preflight Baseline | Post-Phase 9 Count | Net Delta | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **Listings** | 212 (211 Choutuppal + 1 Nalgonda) | 212 | 0 | 100% Preserved |
| **CRM Contacts** | 211 | 211 | 0 | 100% Preserved |
| **CRM Deals** | 4 | 4 | 0 | 100% Preserved |
| **WhatsApp Flows** | 1 (`flow_category_browser`) | 1 | 0 | 100% Preserved |
| **Automation Rules** | 179 (all draft/inactive) | 179 | 0 | 100% Preserved & Inactive |
| **Territories** | 4 (Choutuppal, Suryapet, Bhongir, Nalgonda) | 4 | 0 | 100% Preserved |

- **Preflight Backup Created:** `data/admin_data.json.bak_phase9_preflight_1793095018`
- **Integrity Validation:** Every single flag, status, and attribute across all 212 listings remains identical.

---

## 3. Architecture & Data Model Enhancements

### 3.1 Type Definitions (`src/lib/types.ts`)

Added the canonical `ListingSortMode` union and extended both `FlowNodeConfig` (node level) and `WhatsAppFlow` (flow level):

```typescript
export type ListingSortMode = 'manual' | 'category_priority' | 'newest' | 'alphabetical' | 'featured'

export interface FlowNodeConfig {
  // Existing properties...
  listingSortMode?: ListingSortMode
  listingSortOrder?: string[]       // Array of listing IDs or slugs in explicit order
  categoryPriority?: string[]       // Array of category IDs or names in priority order
  listingPageSize?: number          // Batch size per WhatsApp message (1-10)
  listingCategory?: string          // Optional single-category filter
  listingPage?: number              // Current active page index
}

export interface WhatsAppFlow {
  // Existing properties...
  listingSortMode?: ListingSortMode
  listingSortOrder?: string[]
  categoryPriority?: string[]
  listingPageSize?: number
}
```

---

## 4. Sorting Modes Implementation Matrix

The sorting engine in `src/lib/flow-runtime-engine.ts` implements all 5 requested modes via `sortAndFilterListings()`:

| Sort Mode | Behavior & Deterministic Rules | Secondary Sort / Tie-Breaker | Fallback Handling |
| :--- | :--- | :--- | :--- |
| `manual` | Items matching `manualOrder` array appear first in the exact given index sequence. | Remaining published listings are appended deterministically (alphabetical). | Non-existent or deleted IDs in `manualOrder` are skipped gracefully. Never falls back to alphabetical if IDs are specified. |
| `category_priority` | Listings are grouped by the configured `categoryPriority` order (e.g. `services` -> `automobile` -> `health`). | Alphabetical by business title within each category. | Categories not listed in `categoryPriority` appear after priority groups. |
| `newest` | Listings are sorted descending by `createdAt` timestamp (most recently registered businesses first). | Secondary sort by `title` ascending if timestamps match. | Uses `updatedAt` or timestamp 0 if `createdAt` is missing. |
| `alphabetical` | Listings are sorted ascending by business `title` using case-insensitive Telugu/English collation (`localeCompare`). | Stable sort index. | Safe empty string fallback if `title` is missing. |
| `featured` | Listings with `isFeatured: true` or `isPremium: true` appear before non-featured listings. | Within featured and non-featured groups, newest or alphabetical order is maintained. | Non-featured listings follow immediately without truncation. |

---

## 5. Precedence Hierarchy & Fallback Logic

The resolver function `resolveListingSettings(node, flow)` enforces strict precedence rules:

```
[Node-Level Configuration] (Highest Precedence)
       │
       ▼ (if undefined or empty)
[Flow-Level Configuration]
       │
       ▼ (if undefined or empty)
[Inferred & Safe Defaults]
  - If manualOrder has items -> 'manual'
  - If categoryPriority has items -> 'category_priority'
  - Otherwise -> 'manual'
  - Default Page Size -> 10 (clamped to 1..10)
```

**Anti-Hijacking Guarantee:** Explicit manual ordering never silently falls back to alphabetical order. If an administrator specifies `listingSortOrder: ['lst_1', 'lst_2']`, the engine guarantees `lst_1` is position 1 and `lst_2` is position 2.

---

## 6. Dynamic Multi-Page Pagination & Meta Limits

WhatsApp Cloud API imposes a strict ceiling of **10 list rows per interactive message** and **3 buttons per interactive button message**.

1. **Dynamic Page Calculation:**
   $$\text{totalPages} = \max\left(1, \left\lceil \frac{\text{totalCount}}{\text{pageSize}} \right\rceil\right)$$
2. **Page Row Assembly:**
   - Active page items: slices from `(currentPage - 1) * pageSize` to `currentPage * pageSize`.
   - If `hasNextPage`: appends navigation row `id: "page_{N+1}"`, title: `"➡️ Next ({N+1}/{totalPages})"`.
   - If `hasPrevPage`: appends navigation row `id: "page_{N-1}"`, title: `"⬅️ Previous ({N-1}/{totalPages})"`.
3. **Hard Clamping:**
   The total number of rows (items + navigation rows) never exceeds 10. `pageSize` is clamped to $1 \le \text{pageSize} \le 10$.

---

## 7. Customer Selection & Detail Transition

When a customer taps a business list row or types `listing_<id>` or `listing_detail_<id>`:

1. **Direct Interception:** The runtime intercepts the selection before standard keyword matching.
2. **Security & Publication Check:**
   - If listing is draft or unapproved: responds with `"Listing is in {status} status and withheld from public bot."`
   - If listing belongs to another territory: responds with territory mismatch warning.
   - If listing does not exist: responds with `"This business listing is unavailable or does not exist."`
3. **Detail Card Generation:**
   Renders rich listing overview containing:
   - Business Title (`*Title*`)
   - Category (`📂 Category`)
   - Address (`📍 Address`)
   - Phone (`📞 Phone`)
   - Direct Web Portal Link (`🌐 https://choutuppal.in/business/{slug}`)
   - Description
4. **Action Buttons:**
   - `📞 Call Now`
   - `💬 WhatsApp`
   - `🔙 Back to List` (returns to previous batch)

---

## 8. Security & Publication Isolation

The listing engine strictly enforces two layers of data protection:

1. **Publication Status Filter:** Only listings with `status` in `['published', 'approved', 'APPROVED']` are included in sequence results. Drafts, pending citizen submissions, rejected submissions, and archived items are completely excluded.
2. **Multi-Tenant Territory Scoping:** Only listings matching the caller's territory (`territory_choutuppal`) or `ALL` are accessible. Foreign territory records (e.g. `territory_nalgonda`) are strictly omitted.

---

## 9. CSV Import & Export Round-Trip Specification

### 9.1 Supported CSV Headers
`src/lib/parse-flow-csv.ts` supports the following columns with case-insensitive aliasing:

- `listing_sort_mode` (aliases: `sort_mode`, `listing_order_mode`)
- `category_priority` (aliases: `categories_priority`, `category_order`) — semicolon-separated: `"services;automobile;health"`
- `listing_sort_order` (aliases: `sort_order`, `business_order`) — semicolon-separated: `"lst_1;lst_2;lst_3"`
- `listing_page_size` (aliases: `page_size`, `batch_size`) — integer: `1` to `10`

### 9.2 Exporter Implementation (`exportFlowsToCsv`)
Exporting flows generates valid CSVs including all 4 listing order columns, guaranteeing 100% round-trip fidelity upon re-import.

---

## 10. Admin Visual UI Builder Enhancements

In `src/app/crm/flows/page.tsx`, a dedicated **"Business Listing Order"** control panel has been added:

1. **Sort Mode Selector:** Dropdown with all 5 modes (`manual`, `category_priority`, `newest`, `alphabetical`, `featured`).
2. **Category Filter Dropdown:** Select a specific business category or view all.
3. **Batch Page Size Input:** Stepper input bounded between 1 and 10 with real-time WhatsApp limit badges.
4. **Interactive Manual Reordering:**
   - Dropdown to select and add listings to the sequence.
   - Position badges (`#1`, `#2`, `#3`).
   - Move Up (`ChevronUp`), Move Down (`ChevronDown`), and Remove actions.
5. **Category Priority Manager:**
   - Add categories to priority order.
   - Shift priority up/down.
6. **Live Simulator Sync:** Dry-run preview and interactive simulator immediately reflect the configured order and pagination.

---

## 11. Automated Test Suite Results (`test_phase9_listing_order.py`)

A comprehensive 12-test suite with 41 granular assertions was executed:

```
======================================================================
  PHASE 9: BUSINESS LISTING ORDER IN WHATSAPP FLOW BUILDER
  Automated Verification Suite
======================================================================

--- Test 1: Baseline Integrity Pre-Test ---
  [PASS] Listings count == 212 Found 212
  [PASS] Contacts count == 211 Found 211
  [PASS] Deals count == 4 Found 4
  [PASS] Flows count >= 1 Found 1
  [PASS] Automations count == 179 Found 179
  [PASS] Territories count == 4 Found 4
  [PASS] All 179 automations are draft/inactive 

--- Test 2: Manual Order Deterministic Sort ---
  [PASS] Manual order matches explicit order Top: ['lst_dir_18', 'lst_dir_3', 'lst_dir_8']
  [PASS] Deleted/non-existent IDs skipped gracefully 
  [PASS] All remaining published listings appended without loss 

--- Test 3: Category Priority Sorting ---
  [PASS] Categories appear in configured priority order Indices: services=1, auto=17, health=41
  [PASS] Within category, sub-sort is alphabetical 

--- Test 4: Newest First & Alphabetical Sorting ---
  [PASS] Newest first sorts descending by createdAt 
  [PASS] Alphabetical sorts ascending by title 

--- Test 5: Featured First Sorting ---
  [PASS] Featured listings appear before non-featured 
  [PASS] Featured listings identified correctly (count: 33) 

--- Test 6: Precedence Hierarchy ---
  [PASS] Node-level config overrides flow-level defaults 
  [PASS] Missing node config inherits flow-level settings 
  [PASS] Missing flow & node settings default safely 
  [PASS] Explicit manual order never falls back to alphabetical 

--- Test 7: Interactive Pagination & Meta Limits ---
  [PASS] WhatsApp limit respected (rows <= 10) P1: 6, P2: 7
  [PASS] Page 1 includes Next page navigation row 
  [PASS] Page 2 includes Previous page navigation row 
  [PASS] Pagination metadata correctly tracked 

--- Test 8: Listing Selection & Detail View Transition ---
  [PASS] Selecting listing displays detail card with title 
  [PASS] Detail card includes listing contact info 
  [PASS] Selecting invalid/missing listing gracefully handled 

--- Test 9: Strict Security & Territory Isolation ---
  [PASS] Unpublished/draft/rejected listings strictly excluded from order 
  [PASS] Direct selection of unapproved listing rejected with unavailable notice 

--- Test 10: CSV Schema & Round-Trip Fidelity ---
  [PASS] CSV parser correctly extracts listing order columns 
  [PASS] CSV exporter includes listing order headers 
  [PASS] CSV round-trip preserves all listing order configurations 

--- Test 11: Edge Cases & Robustness ---
  [PASS] Empty listing dataset handled safely 
  [PASS] Non-existent category priority handled without error 
  [PASS] Page size out-of-range clamped to safe WhatsApp limit (10) 

--- Test 12: Final Baseline Record Counts & Zero Data Loss ---
  [PASS] Final Listings count == 212 Count: 212
  [PASS] Final Contacts count == 211 Count: 211
  [PASS] Final Deals count == 4 Count: 4
  [PASS] Final Flows count >= 1 Count: 1
  [PASS] Final Automations count == 179 Count: 179
  [PASS] Final Territories count == 4 Count: 4

======================================================================
  SUMMARY: 41 Passed, 0 Failed (Total: 41)
======================================================================
Exit Code: 0
```

---

## 12. Full Regression Test Matrix

All test suites from previous phases were executed in full and passed with zero errors:

| Phase | Test Suite Script | Checks Passed | Exit Code | Result |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 9** | `test_phase9_listing_order.py` | 41 / 41 | 0 | **PASSED** |
| **Phase 8** | `test_phase8_flow_builder_csv.py` | 13 / 13 | 0 | **PASSED** |
| **Phase 7** | `test_phase7_flow_automation.py` | 9 / 9 | 0 | **PASSED** |
| **Phase 6** | `test_phase6_feature_completion.py` | 14 / 14 | 0 | **PASSED** |
| **Phase 5** | `test_phase5_admin_fixes.py` | 13 / 13 | 0 | **PASSED** |
| **Phase 4** | `test_phase4_listing_lifecycle.py` | 41 / 41 | 0 | **PASSED** |
| **Phase 3f** | `test_phase3f_automations_step2.py` | 19 / 19 | 0 | **PASSED** |
| **Phase 3f** | `test_phase3f_webhook_shadow.py` | 17 / 17 | 0 | **PASSED** |
| **Total** | **8 Test Suites** | **167 / 167** | **0** | **100% GREEN** |

---

## 13. Constraints Compliance Certification

- [x] **No Supabase / PostgreSQL Migrations:** Local JSON store (`data/admin_data.json`) maintained with zero database calls.
- [x] **Preserve All Flagship Data:** 212 listings (211 Choutuppal), 211 contacts, 4 deals, 1 flow, 179 automations, 4 territories verified pre- and post-test.
- [x] **Zero Real WhatsApp Dispatches:** Live Meta Cloud API endpoints were never invoked during testing; all dry-runs executed in sandbox mode.
- [x] **All 179 Automations Remain Inactive:** Every rule verified in `isActive: false` state.
- [x] **Zero Unauthorized Package Installs:** No new system packages or third-party dependencies installed.
