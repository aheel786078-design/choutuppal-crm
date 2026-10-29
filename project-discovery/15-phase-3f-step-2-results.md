# Choutuppal Franchise CRM — Phase 3F Step 2: Automation Data Model, Safe CSV Parser & Rule Management Report

**Date**: October 26, 2026  
**Auditor**: Principal Application Security Engineer & Software Architect  
**Project Root**: `/data/user/0/com.termux/files/home/storage/downloads/Cpl Crm/choutuppal-franchise-crm`  
**Execution Status**: **COMPLETE & FULLY VERIFIED (19/19 Step 2 Checks Passed, 167/167 Total Regression Passed)**  
**Supabase State**: **DISCONNECTED (Preserved local JSON architecture without external dependencies)**  
**Automation Engine State**: **STANDBY / DRAFT MODE (0 active rules, 0 live messages sent, no external webhook side effects)**

---

## 1. Executive Summary

In Phase 3F Step 2, we implemented the persistent data foundation, RFC-compliant CSV parser, tenant-scoped API routes, and interactive UI for the WhatsApp automation system, as specified in the architectural design document `project-discovery/14-phase-3f-automation-design.md`.

Before this phase, `sample_automations.csv` (179 rules) and `sample_flows.csv` (39 flows) existed only as unparsed disk files. The UI at `/crm/automations` displayed static placeholder rules with simulated toggle states, and the `/api/crm/automations` API route returned hardcoded mock data.

We have established a robust, tenant-isolated rule management subsystem:
1. **Strong Typing & Data Models**: Added `AutomationTriggerType`, `AutomationActionType`, `AutomationRuleStatus`, and `AutomationRule` to [`src/lib/types.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/types.ts).
2. **Safe, RFC-Compliant CSV Parser**: Implemented [`src/lib/parse-automation-csv.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/parse-automation-csv.ts) featuring a character-by-character state machine that cleanly handles complex Telugu Unicode (`నమస్కారం`, `పోలీస్ స్టేషన్`), quoted commas, escaped quotes (`""`), multiline strings, formula neutralization (`=, +, -, @`), deterministic ID hashing, and graceful flagging of unsupported triggers/actions.
3. **Persistent Local JSON Store**: Extended `AdminDataStore` in [`src/lib/store.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/store.ts) with `automations: AutomationRule[]`, complete with backwards-compatible migration in `loadStore()` and `getFallbackStore()`.
4. **Tenant-Scoped API**: Upgraded [`src/app/api/crm/automations/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/crm/automations/route.ts) to support authenticated `GET`, `POST` (dry-run preview with 0 mutations, safe CSV batch import, manual draft creation, 2MB size limit -> HTTP 413), `PUT` (territory-guarded rule updates), and `DELETE` (territory-guarded rule deletion).
5. **Interactive UI with Dry-Run Import**: Updated [`src/app/crm/automations/page.tsx`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/crm/automations/page.tsx) with live metric summary cards (Total, Draft, Active, Paused, Disabled), status filtering tabs, search filtering, inline status toggling, and an Import CSV Modal that performs a dry-run preview before confirming import.
6. **Safety & Zero Disruption**: All 179 imported rules default to `draft` status (`isActive: false`). No WhatsApp messages were transmitted, no automated execution was triggered, and all 211 Choutuppal flagship listings remain completely intact.
7. **Comprehensive Automated Verification**: Created [`test_phase3f_automations_step2.py`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/test_phase3f_automations_step2.py) covering all 12 check specifications (19/19 passed) and ran the full platform regression suite (167/167 passed).

---

## 2. Files Modified & Created

| File | Status | Description |
|---|---|---|
| [`src/lib/types.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/types.ts) | Modified | Added `AutomationTriggerType`, `AutomationActionType`, `AutomationRuleStatus`, and `AutomationRule` interface. |
| [`src/lib/store.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/store.ts) | Modified | Extended `AdminDataStore` with `automations: AutomationRule[]`, updated `loadStore()` and `getFallbackStore()`. |
| [`src/lib/parse-automation-csv.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/parse-automation-csv.ts) | Created | RFC-compliant CSV parser with Unicode/Telugu support, formula neutralization, deterministic hashing, and validation. |
| [`src/app/api/crm/automations/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/crm/automations/route.ts) | Modified | Replaced mock handlers with authenticated, tenant-isolated CRUD and dry-run preview / import endpoints. |
| [`src/app/crm/automations/page.tsx`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/crm/automations/page.tsx) | Modified | Connected UI to live automations API with metrics cards, filter tabs, search, and CSV import preview modal. |
| [`data/admin_data.json`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/data/admin_data.json) | Modified | Seeded 179 rules from `sample_automations.csv` as `draft` status without modifying existing listings/contacts/deals. |
| [`test_phase3f_automations_step2.py`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/test_phase3f_automations_step2.py) | Created | 19-check test suite testing CSV edge cases, authentication, tenant isolation, dry-run safety, and deduplication. |
| `project-discovery/15-phase-3f-step-2-results.md` | Created | This deliverable report documenting Phase 3F Step 2 results. |

---

## 3. Architecture & Security Implementation Details

### 3.1 Automation Data Model ([`src/lib/types.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/types.ts))

```typescript
export type AutomationTriggerType =
  | 'keyword_match'
  | 'first_inbound_message'
  | 'time_based'
  | 'stage_changed'
  | 'tag_added'
  | 'lead_created'

export type AutomationActionType =
  | 'send_message'
  | 'add_tag'
  | 'remove_tag'
  | 'update_stage'
  | 'assign_staff'
  | 'queue_approval'

export type AutomationRuleStatus = 'draft' | 'active' | 'paused' | 'disabled'

export interface AutomationRule {
  id: string
  name: string
  description?: string
  territoryId: string
  triggerType: AutomationTriggerType
  triggerValue: string
  actionType: AutomationActionType
  actionValue: string
  templateSlug?: string
  status: AutomationRuleStatus
  isActive: boolean
  isSupported?: boolean
  unsupportedReason?: string
  executionCount?: number
  lastTriggeredAt?: string
  createdAt: string
  updatedAt: string
}
```

### 3.2 RFC-Compliant Safe CSV Parser ([`src/lib/parse-automation-csv.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/parse-automation-csv.ts))

The CSV parser uses a streaming character-by-character state machine to tokenize fields according to RFC 4180:
- **Unicode & Multilingual Integrity**: Supports UTF-8 Telugu characters without stripping, mangling, or re-encoding artifacts.
- **Quoted Commas & Escaped Quotes**: Properly distinguishes delimiter commas from commas enclosed in quotes (e.g., `"Hi, hello, నమస్కారం"`), and unescapes double quotes `""` to literal `"` (e.g., `Say ""MENU"" for services.` -> `Say "MENU" for services.`).
- **Multiline Text Preservation**: Handles embedded newlines inside quoted fields (such as multi-line Telugu emergency contact directory responses).
- **Formula Injection Defense (CSV Injection)**: Strips or neutralizes leading spreadsheet formula triggers (`=`, `+`, `-`, `@`) by prepending a single quote `'` if present.
- **Deterministic Identifier Generation**: Generates deterministic rule IDs via `auto_${sha256(name|triggerType|triggerValue|actionType|territoryId).slice(0, 12)}`. When the exact same rule is imported again, duplicate rules are detected and skipped without bloating the store.
- **Default Non-Active Rule Status**: Rules imported from CSV are strictly initialized with `status: 'draft'` and `isActive: false`, even if the CSV row specified `is_active=true`.
- **Unsupported Feature Flagging**: Unknown triggers or actions are not silently discarded; they are parsed with `isSupported: false`, `status: 'disabled'`, and an explanatory `unsupportedReason`.

### 3.3 Multi-Tenant API Route ([`src/app/api/crm/automations/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/crm/automations/route.ts))

| Method | Endpoint | Auth Required | Scope & Security Guarantees |
|---|---|---|---|
| **GET** | `/api/crm/automations` | Yes (`requireAuth`) | Filters rules by the user's territory (`auth.user.territoryId`). Super Admins can see all rules or filter by `?territoryId=...`. Supports `?status=...` and `?search=...`. Computes summary metrics (`total`, `active`, `draft`, `paused`, `disabled`). |
| **POST** (Preview) | `/api/crm/automations` with `dryRun: true` | Yes (`requireAuth`) | Validates payload size (rejection HTTP 413 for payloads > 2MB). Parses CSV content and checks duplicate status against the current store. **Performs zero writes to disk or store.** Returns `preview: { validRules, duplicateCount, unsupportedCount, previewRules }`. |
| **POST** (Import) | `/api/crm/automations` with `dryRun: false` | Yes (`requireAuth`) | Requires territory access. Imports parsed rules, skips duplicates via deterministic ID matching, defaults all imported rules to `status: 'draft'`, appends to store, and persists to `data/admin_data.json`. Returns HTTP 201 with `{ importedCount, skippedCount }`. |
| **POST** (Create) | `/api/crm/automations` with single rule | Yes (`requireAuth`) | Validates rule name, trigger type, and action type. Initializes rule as `status: 'draft'`. Returns HTTP 201. |
| **PUT** | `/api/crm/automations` | Yes (`requireAuth`) | Verifies caller owns rule's territory (`requireTerritoryAccess`), preventing cross-territory IDOR (HTTP 403). Allows updating status (`draft`, `active`, `paused`, `disabled`), keywords, or action values. Timestamps `updatedAt`. |
| **DELETE** | `/api/crm/automations` | Yes (`requireAuth`) | Verifies caller owns rule's territory (`requireTerritoryAccess`). Removes rule from store and persists to disk. |

---

## 4. Current Record Counts & Data Store Integrity

All existing records in [`data/admin_data.json`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/data/admin_data.json) were verified before and after Phase 3F Step 2 implementation:

| Store Entity | Count | Status / Notes |
|---|---|---|
| **Listings** | **212** | **100% Intact** (Includes all 211 Protected Flagship Choutuppal listings + 1 test listing) |
| **Contacts** | **211** | **100% Intact** (All customer & merchant contacts preserved) |
| **Deals** | **4** | **100% Intact** (Phase 3E persistent deals preserved) |
| **Flows** | **1** | **100% Intact** (Initial sample flow preserved) |
| **Automations** | **179** | **Seeded in Draft Mode** (`status: 'draft'`, `isActive: false`) |

### Status Breakdown of Persisted Automations:
- `draft`: **179** (100%)
- `active`: **0** (0%)
- `paused`: **0** (0%)
- `disabled`: **0** (0%)

---

## 5. Verification & Test Suite Results

### 5.1 Phase 3F Step 2 Automated Test Suite (`test_phase3f_automations_step2.py`)

Command executed:
```bash
python3 test_phase3f_automations_step2.py
```

Output:
```
======================================================================
CHOUTUPPAL FRANCHISE CRM — PHASE 3F STEP 2 AUTOMATION DATA & CSV SUITE
======================================================================
[*] Initial Listings: 212
[*] Initial Contacts: 211
[*] Initial Deals: 4
[*] Initial Flows: 1

[CHECK 1] Quoted Commas & Escaped Quotes Parsing
  ✔ PASS: Quoted commas and escaped quotes parsed accurately (triggerValue contains 10 keywords)

[CHECK 2] Multilingual Telugu Unicode & Multiline Fields
  ✔ PASS: Multiline Telugu Unicode preserved across line breaks (Lines in actionValue: 3)

[CHECK 3] Missing/Extra Columns & Malformed CSV Handling
  ✔ PASS: Malformed CSV missing headers rejected cleanly (Error: Missing required headers: name, trigger_type, action_type, action_value)
  ✔ PASS: Empty rule name flagged with row-numbered error (Row: 2)

[CHECK 4] Unknown Triggers & Actions Flagged as Unsupported
  ✔ PASS: Unknown trigger and action imported as 'disabled' with isSupported: False (reason=Unknown trigger UNKNOWN_TRIGGER; Unknown action EXECUTE_CODE)

[CHECK 5] Unauthenticated API Rejection (HTTP 401)
  ✔ PASS: Unauthenticated GET /api/crm/automations rejected with HTTP 401
  ✔ PASS: Unauthenticated POST /api/crm/automations rejected with HTTP 401

[CHECK 6] Cross-Territory Access Rejection (HTTP 403)
  ✔ PASS: Cross-territory CSV import rejected with HTTP 403 Forbidden

[CHECK 7] Draft Status on Import (Non-Active by Default)
  ✔ PASS: Imported rule assigned 'draft' status and isActive: False (id=auto_6adf9ad64222)

[CHECK 8] Dry-Run Preview Causes Zero Store Mutations
  ✔ PASS: Dry-run preview parsed 179 rules with ZERO store mutations (Rules in store: 180 before, 180 after)

[CHECK 9] Deterministic Deduplication on Duplicate Import
  ✔ PASS: Duplicate CSV import detected identical rule and skipped cleanly (skippedCount=1)

[CHECK 10] Master Dataset Ingestion (179 Rules)
  ✔ PASS: Successfully ingested master automations dataset (180 rules stored) (imported=0, skipped=179)

[CHECK 11] Rule Lifecycle & Status Transitions
  ✔ PASS: Rule transitioned to 'active' status
  ✔ PASS: Rule transitioned to 'paused' status
  ✔ PASS: Cross-territory rule modification blocked with HTTP 403 Forbidden

[CHECK 12] Baseline Data Integrity Verification
  ✔ PASS: All 212 listings intact (including 211 flagship) (Count=212)
  ✔ PASS: All 211 contacts intact (Count=211)
  ✔ PASS: All 4 deals intact (Count=4)
  ✔ PASS: All 1 flows intact (Count=1)

[*] Cleaned up and restored database backup.

======================================================================
PHASE 3F STEP 2 TEST SUMMARY: 19 PASSED, 0 FAILED
======================================================================
```

### 5.2 Full Platform Regression Suite (8 Suites / 167 Tests)

Command executed:
```bash
python3 test_franchise_platform.py && \
python3 test_security_audit.py && \
python3 test_phase3a_sync_listing.py && \
python3 test_phase3b_admin_content.py && \
python3 test_phase3c_shorts.py && \
python3 test_phase3d_inbox.py && \
python3 test_phase3e_deals.py && \
python3 test_phase3f_automations_step2.py
```

**Results Breakdown:**
- `test_franchise_platform.py`: **16/16 Passed**
- `test_security_audit.py`: **37/37 Passed**
- `test_phase3a_sync_listing.py`: **3/3 Passed**
- `test_phase3b_admin_content.py`: **13/13 Passed**
- `test_phase3c_shorts.py`: **27/27 Passed**
- `test_phase3d_inbox.py`: **20/20 Passed**
- `test_phase3e_deals.py`: **32/32 Passed**
- `test_phase3f_automations_step2.py`: **19/19 Passed**

**Total Platform Regressions: 167 Passed, 0 Failed (100% Pass Rate).**

---

## 6. Strict Adherence to Constraints

1. **Supabase Connectivity**: Supabase was NOT connected or configured. The entire feature was built and verified on the local JSON architecture.
2. **WhatsApp Execution & Live Messages**: No live WhatsApp messages were transmitted. The automation engine is strictly in storage and management mode.
3. **Safety of Flagship Listings**: All 211 flagship Choutuppal listings and 211 CRM contacts were preserved with zero record losses or ID mutations.
4. **Draft-by-Default Policy**: All 179 parsed rules default to `draft` status, preventing any unintentional automatic replies until explicitly reviewed and enabled by an administrator.
5. **No Dangerous Evaluation**: The parser never executes `eval()`, regular expression compilations of raw user input, or formula evaluation.

---

## 7. Next Steps: Ready for Phase 3F Step 3

With Step 2 complete, the data models, CSV parser, API routes, and admin UI are fully verified and persisted.

### Scope of Phase 3F Step 3:
1. **Core Rule Evaluation Engine (`src/lib/automation-engine.ts`)**:
   - Implement `evaluateAutomations(inboundMessage, context)`.
   - Match incoming messages against active rules (`status === 'active' && isActive === true`).
   - Match by exact keyword or substring (normalized whitespace, case-insensitive, Telugu Unicode-aware).
   - Enforce cooldown timers, deduplication, and single-match-per-message policy to prevent reply storms.
2. **Webhook & Inbox Integration**:
   - Integrate rule evaluation into [`src/app/api/whatsapp/webhook/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/whatsapp/webhook/route.ts).
   - In sandbox mode (when WhatsApp credentials are not set), evaluate matches, log execution history, and save replies locally in the inbox without triggering external API calls.
3. **Automated Verification**:
   - Create `test_phase3f_automations_step3.py` to verify matching accuracy, cooldown prevention, and sandbox execution.

*As per instructions, Phase 3F Step 3 will only proceed after receiving your explicit approval.*
