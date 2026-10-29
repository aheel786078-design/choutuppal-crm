# Choutuppal Franchise CRM — Phase 3F Step 3.1: Automation Engine Audit & Rule Readiness Report

**Date**: October 26, 2026  
**Auditor**: Principal Application Security Engineer & Software Architect  
**Project Root**: `/data/user/0/com.termux/files/home/storage/downloads/Cpl Crm/choutuppal-franchise-crm`  
**Execution Status**: **AUDIT COMPLETE — READY FOR INTEGRATION (Phase 3F Step 2: 19/19 Passed, Step 3: 23/23 Passed, Exit Codes: 0)**  
**Supabase State**: **DISCONNECTED (Preserved local JSON architecture without external dependencies)**  
**Rule Readiness Status**: **179/179 Rules Verified in Draft State (0 active, 0 live messages sent, no external webhook side effects)**

---

## 1. Executive Summary & Readiness Decision

### 1.1 Executive Summary
We performed an independent, source-level audit of the Phase 3F Step 3 implementation across the automation engine, CSV parser, type definitions, persistence store, rule management APIs, and dry-run sandbox endpoints. 

The audit confirms:
1. **Rule Data Integrity**: All 179 rows from `csv/sample_automations.csv` were parsed losslessly into `data/admin_data.json`. Every rule has a unique, deterministic ID (`auto_${sha256(...).slice(0, 12)}`). Repeated imports skip existing records without duplicates.
2. **Intentional Safety State**: All 179 imported rules default to `status: 'draft'` and `isActive: false`. This is an intentional security design to prevent newly ingested rules from immediately auto-replying to citizen messages without administrator review.
3. **Pure, Side-Effect-Free Evaluator**: [`src/lib/automation-engine.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/automation-engine.ts) is a pure function. It contains zero filesystem writes, zero store mutations, zero external network calls, and zero WhatsApp API invocations.
4. **Multilingual Unicode & Boundary Safety**: The engine uses Unicode property regexes (`[\p{L}\p{N}\p{M}]/u`) to prevent substring false positives in English and Telugu (e.g., keyword `"hi"` never matches inside `"this is cool"`, `"1"` never matches `"12345"`, and `"ఆటో"` never matches inside compound `"ఈ నాఆటో"`).
5. **Anti-Storm Multiple-Match Policy**: When multiple rules match an inbound message, deterministic ranking selects a single winner for `send_message`. Secondary matching message actions are marked `isSuppressed: true`. Secondary CRM actions (`add_tag`, `update_stage`) remain eligible so that workflow tagging and stage progression are not dropped.
6. **Robust Dry-Run Security**: [`src/app/api/crm/automations/dry-run/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/crm/automations/dry-run/route.ts) enforces cryptographic session authentication (`requireAuth`), 64KB payload limits (`HTTP 413`), and strict territory isolation (`HTTP 403` on cross-territory evaluation).

### 1.2 Readiness Decision
**DECISION: READY FOR PHASE 3F STEP 4 (Webhook Integration with Sandbox Guards)**.  
The core evaluator and rule data foundation are structurally sound, deterministic, and safe. Webhook integration can proceed in sandbox execution mode.

---

## 2. Actual Files Inspected

During this audit, the following files were inspected directly on disk:

| File | Purpose in Audit | Verification Outcome |
|---|---|---|
| [`src/lib/automation-engine.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/automation-engine.ts) | Pure rule evaluation, Unicode matching, template rendering, ranking | Pure function verified; zero side effects; allowlist enforced |
| [`src/lib/parse-automation-csv.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/parse-automation-csv.ts) | CSV tokenizer, formula neutralization, deterministic ID generation | RFC 4180 verified; multiline/Telugu preserved; deterministic hashing verified |
| [`src/lib/types.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/types.ts) | Type definitions for `AutomationRule`, `DealStage`, `CRMContact` | Types aligned with CRM domain; status unions properly defined |
| [`src/lib/store.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/store.ts) | JSON store persistence, store interface, territory resolution | `automations: []` added cleanly; backward-compatible |
| [`src/app/api/crm/automations/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/crm/automations/route.ts) | Authenticated CRUD, dry-run CSV preview, batch import | 2MB payload limit, territory authorization (HTTP 403), draft import verified |
| [`src/app/api/crm/automations/dry-run/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/crm/automations/dry-run/route.ts) | Inbound message dry-run endpoint | 64KB payload limit, territory isolation, 0 mutations verified |
| [`src/app/api/whatsapp/webhook/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/whatsapp/webhook/route.ts) | Existing webhook route and deduplication logic | Deduplication by `providerMessageId` identified; live dispatch untouched |
| [`data/admin_data.json`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/data/admin_data.json) | Local persistent store | 179 draft rules, 212 listings (211 flagship), 211 contacts, 4 deals, 1 flow |
| `csv/sample_automations.csv` | Original raw dataset (179 rows) | 179 rows match store records 1:1 with zero name or trigger discrepancies |
| `test_phase3f_automations_step2.py` | Step 2 automated verification suite | 19/19 checks passed (exit code 0) |
| `test_phase3f_engine.py` | Step 3 automated verification suite | 23/23 checks passed (exit code 0) |

---

## 3. Rule Schema & Status Semantics

### 3.1 Interaction of `status`, `isActive`, and `isSupported`

In [`src/lib/types.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/types.ts):
```typescript
export type AutomationRuleStatus = 'draft' | 'active' | 'paused' | 'disabled'

export interface AutomationRule {
  id: string
  name: string
  triggerType: AutomationTriggerType
  triggerValue: string
  actionType: AutomationActionType
  actionValue: string
  status: AutomationRuleStatus
  isActive?: boolean
  isSupported?: boolean
  unsupportedReason?: string
  territoryId: string
  ...
}
```

The system employs **conservative three-way eligibility**:
1. `isSupported` (`boolean`): Set during parsing. If a rule specifies an unknown trigger or action, `isSupported = false` and `status = 'disabled'`. The evaluator rejects unsupported rules upfront without inspecting triggers.
2. `status` (`AutomationRuleStatus`): High-level operational lifecycle:
   - `draft`: Newly imported or created rules awaiting admin review. **Never executed.**
   - `active`: Admin-approved and eligible for real-time evaluation.
   - `paused`: Temporarily deactivated by admin. **Never executed.**
   - `disabled`: Permanently disabled (unsupported trigger/action or deactivated). **Never executed.**
3. `isActive` (`boolean`): Compatibility boolean reflecting active state. The evaluator requires `isActive === true`.

**Evaluator Safety Guarantee**:
A rule is evaluated **only** when `rule.status === 'active' && rule.isActive === true && rule.isSupported !== false`. If any field signals non-active, the rule is immediately skipped with a clear trace reason.

---

## 4. Findings on All 179 Imported Rules

### 4.1 Verification Breakdown
- **Total Rules in Store**: 179
- **Total Rows in `sample_automations.csv`**: 179 data rows
- **Discrepancies in Rule Names**: **0 (Zero)**. Every single row in CSV corresponds to an entry in `data/admin_data.json`.
- **Unique IDs**: 179 / 179 (Zero duplicate IDs).
- **Current Status Distribution**:
  - `draft`: 179 (100%)
  - `active`: 0 (0%)
  - `paused`: 0 (0%)
  - `disabled`: 0 (0%)
- **`isActive` Distribution**: `False`: 179 (100%)
- **`isSupported` Distribution**: `True`: 179 (100%)
- **Trigger Type Distribution**:
  - `keyword_match`: 173 rules
  - `time_based`: 4 rules (e.g. Day 2 Name Verify, Day 3 Channel Invite, Day 4 Ward Invite, Day 5 Instagram Follow)
  - `first_inbound_message`: 2 rules (`Welcome Inbound Message`, `Auto Tag Day 1 Welcome`)
- **Action Type Distribution**:
  - `send_message`: 155 rules
  - `add_tag`: 24 rules
- **Template Slug**: 0 / 179 rules populated. In the raw CSV, the `template_slug` column is completely empty across all 179 rows. This is an accurate reflection of source data, not an ingestion bug.

### 4.2 Why All 179 Rules Are Draft
Draft status is an **intentional, multi-layer safety control**:
- In `src/lib/parse-automation-csv.ts`, `defaultStatus` is set to `'draft'`.
- Even if a CSV row specifies `is_active=true`, imported rules are ingested as `status: 'draft'` and `isActive: false`.
- This ensures that an administrator must explicitly review, test (via dry-run), and activate rules through `/crm/automations` or the API before any automated messages can be dispatched to citizens.

### 4.3 Deterministic ID & Deduplication Verification
- Rule IDs are computed via `auto_${sha256(territoryId|name|triggerType|triggerValue|actionType).slice(0, 12)}`.
- Re-importing `sample_automations.csv` was verified in Check 9 and Check 10 of `test_phase3f_automations_step2.py`: `importedCount = 0`, `skippedCount = 179`. Zero duplicate records are generated.

---

## 5. Evaluator Contract, Matching & Ranking Behavior

### 5.1 Supported vs. Deferred vs. Unsupported Triggers
- `keyword_match`: **Supported**. Case-insensitive, whitespace-collapsed, Unicode word-bounded.
- `first_inbound_message`: **Supported**. Triggers when `contact.messageCount === 0` or `contact.isFirstInbound === true` or contact record is absent. Skips if `contact.messageCount > 0`.
- `time_based`: **Explicitly Deferred**. Rules like 24h/48h delays are cataloged in `deferredRuleIds` with trace message: `"Trigger type 'time_based' is explicitly deferred (cannot be evaluated in real-time inbound message flow)"`.
- Unknown triggers: **Unsupported**. Rejected with `unsupportedRuleIds`.

### 5.2 Multilingual Word-Boundary Algorithm
The engine defines a Unicode word character using the standard Unicode property regex `[\p{L}\p{N}\p{M}]/u` (letters, digits, combining marks).

A keyword matches text if:
1. Exact full-text match (`normText === normKw`), OR
2. Bounded match: character before index is not a word character (`!isWordChar(before)`) AND character after index is not a word character (`!isWordChar(after)`).

*Audited Scenarios*:
- English substring: `"this is cool"` contains `"hi"`, but is preceded by `'t'`. **Rejected**.
- Numeric substring: `"order 12345"` contains `"1"`, but is followed by `'2'`. **Rejected**.
- Telugu isolated term: `"నాకు ఆటో కావాలి"` contains `"ఆటో"` bounded by spaces. **Matched**.
- Telugu compound word: `"ఈ నాఆటో బాగాలేదు"` contains `"ఆటో"` preceded by `'నా'` (word character). **Rejected**.

### 5.3 Deterministic Ranking & Multiple-Match Policy
When multiple rules match a single inbound message:
1. **Ranking Tiebreaker**:
   - Priority 1: Exact full-message match first.
   - Priority 2: Longest matched keyword phrase length descending (`keywordLength`).
   - Priority 3: Stable alphabetical sort by `rule.id`.
2. **Single-Reply Anti-Storm Guarantee**:
   - The top-ranked rule is the primary winner and produces an unsuppressed `send_message` action.
   - Secondary matching rules with `send_message` are marked:
     `{ isSuppressed: true, suppressionReason: 'Suppressed by multiple-match policy (winner: ...)' }`.
3. **Intentional Secondary CRM Action Eligibility**:
   - Secondary rules with `add_tag`, `remove_tag`, or `update_stage` are **not** suppressed.
   - *Audit Rationale*: In `sample_automations.csv`, multiple business workflows pair a `send_message` rule with an `add_tag` rule on the identical keyword (e.g., Row 19 `New Vendor Onboard Prompt` [send_message] and Row 20 `Tag New Vendor Pending` [add_tag]). Suppressing non-message actions would cause contact tagging to fail. Allowing non-message actions preserves intended CRM workflow state without creating WhatsApp reply storms.

---

## 6. Action Planning & Template Safety

### 6.1 Allowlisted Template Variables
Allowlisted variables:
- `{{contact.name}}` -> Contact name or fallback `"Citizen"`
- `{{contact.phone}}` -> Contact phone number
- `{{territory.name}}` -> Territory name (e.g. `"Choutuppal"`)
- `{{territory.id}}` -> Territory identifier (`"territory_choutuppal"`)
- `{{territory.domain}}` -> Primary domain (`"choutuppal.in"`)
- `{{territory.phone}}` -> Contact phone (`"9441348175"`)
- `{{territory.whatsapp}}` -> WhatsApp number (`"9441348175"`)

### 6.2 Unknown Variable & Code Execution Safety
- Unknown variables (e.g. `{{user.password_hash}}` or `{{eval(something)}}`):
  - Handled by RegExp match without `eval()` or dynamic object property access.
  - Variable remains in literal form in the rendered string.
  - A validation warning is recorded in the action plan: `Unknown template variable '{{...}}' left unreplaced`.
- Zero code execution: The evaluator never evaluates mathematical formulas, shell commands, or arbitrary script code.

### 6.3 Stage Action Validation
- Allowed deal stages: `VALID_DEAL_STAGES` = `['NEW_LEAD', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']`.
- An `update_stage` action specifying an invalid stage (e.g., `"BOGUS_STAGE"`) is suppressed with warning: `Invalid deal stage 'BOGUS_STAGE'. Must be one of: NEW_LEAD, CONTACTED, QUALIFIED, PROPOSAL, WON, LOST`.

---

## 7. Dry-Run API Security & Tenant Isolation

Audited endpoint: [`src/app/api/crm/automations/dry-run/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/crm/automations/dry-run/route.ts)

| Security Aspect | Implementation | Verified Behavior |
|---|---|---|
| **Authentication** | `requireAuth(req)` | Missing or invalid token returns `HTTP 401 Unauthorized` |
| **Payload Size Limit** | `Buffer.byteLength(rawBody, 'utf8') > 64 * 1024` | Payloads > 64KB return `HTTP 413 Payload Too Large` |
| **Malformed JSON** | `JSON.parse(rawBody)` try/catch | Malformed JSON returns `HTTP 400 Bad Request` |
| **Empty Input** | `typeof messageText !== 'string' \|\| !messageText.trim()` | Missing `messageText` returns `HTTP 400 Bad Request` |
| **Tenant Isolation** | Non-Super-Admin locked to `auth.user.territoryId` | Franchise Admin specifying foreign `territoryId` returns `HTTP 403 Forbidden` |
| **Super Admin Scope** | `auth.user.role === 'SUPER_ADMIN'` | Super Admin can specify any territory or defaults to flagship |
| **Rule Injection Defense** | Server loads `store.automations` filtered by territory | Client cannot inject arbitrary rule objects; only server-persisted rules matching `ruleIds` are evaluated |
| **Storage Immutability** | Read-only `loadStore()` | Zero store writes (`saveStore` is not imported or called); `dispatched: false` returned |

---

## 8. Tests Actually Executed & Outcomes

Both test suites were executed independently in this session:

### 8.1 Phase 3F Step 2 Test Suite (`test_phase3f_automations_step2.py`)
- **Command**: `python3 test_phase3f_automations_step2.py`
- **Exit Code**: `0`
- **Result**: **19 PASSED, 0 FAILED**
- **Verified Checks**:
  1. Quoted commas & escaped quotes parsing
  2. Multilingual Telugu Unicode & multiline fields
  3. Missing/extra columns & malformed CSV handling
  4. Unknown triggers & actions flagged as unsupported
  5. Unauthenticated API rejection (HTTP 401)
  6. Cross-territory access rejection (HTTP 403)
  7. Draft status on import (non-active by default)
  8. Dry-run preview causes zero store mutations
  9. Deterministic deduplication on duplicate import
  10. Master dataset ingestion (179 rules stored)
  11. Rule lifecycle & status transitions (draft -> active -> paused)
  12. Baseline data integrity verification (212 listings, 211 contacts, 4 deals, 1 flow)

### 8.2 Phase 3F Step 3 Test Suite (`test_phase3f_engine.py`)
- **Command**: `python3 test_phase3f_engine.py`
- **Exit Code**: `0`
- **Result**: **23 PASSED, 0 FAILED**
- **Verified Checks**:
  1. Active keyword rule matching
  2. Draft rule never matching
  3. Paused and disabled rules never matching
  4. Unsupported rule rejection
  5. First-inbound trigger behavior (new vs returning contacts)
  6. Keyword boundary & Unicode normalization (Latin digits & Telugu Unicode)
  7. Multiple-match deterministic behavior & single reply policy
  8. Cross-territory rule exclusion
  9. Safe template variable substitution
  10. Unknown template variables warning & safety
  11. Action type validation & stage verification
  12. Time-based rules explicitly deferred
  13. Zero storage mutation guarantee (exact bytes match)
  14. Pure evaluator network isolation (`dispatched: false`, 0 outbound messages)
  15. Dry-run API authentication & tenant authorization (401, 403, 413, Super Admin 200)
  16. Baseline data integrity verification (all counts and draft statuses intact)

---

## 9. Confirmed Defects, Risks & Unresolved Questions

### 9.1 Confirmed Risks / Limitations
1. **Time-Based Triggers (4 rules)**: Rules for 24h, 48h, 72h, and 96h followups cannot be evaluated by the synchronous inbound message engine. They are correctly flagged as deferred, but will require a background cron/queue service to execute in production.
2. **Per-Rule Cooldowns**: The cooldown interface exists (`cooldownSeconds`), but since evaluation is pure and does not update `rule.lastExecutedAt`, cooldown enforcement will require an execution layer to record timestamps when rules fire.
3. **Contact Lookup on Webhook**: When live webhook integration occurs, the caller must pass the trusted `ContactContext` resolved from the persistent CRM contacts table, ensuring that first-inbound rules accurately distinguish new citizens from existing contacts.

### 9.2 Defect Status
- **Zero Critical Defects Found**: No code execution vulnerabilities, no tenant leaks, no storage mutation leaks, and no duplicate record generation were detected.

---

## 10. Recommended Next Step & Acceptance Criteria

### 10.1 Recommended Next Step
Proceed to **Phase 3F Step 4: Webhook Integration with Sandbox Execution Guards**.

### 10.2 Scope & Acceptance Criteria for Step 4
1. **Sandbox Webhook Evaluation**:
   - Wire `evaluateAutomations` into [`src/app/api/whatsapp/webhook/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/whatsapp/webhook/route.ts) after message deduplication.
   - When WhatsApp provider credentials are not configured (sandbox mode), record planned replies in the CRM inbox without calling the external Meta Cloud API.
2. **Selective Admin Activation**:
   - Allow specific tested rules to be toggled to `active` via the `/crm/automations` UI.
   - Verify that only activated rules execute in the webhook.
3. **Execution Timestamp Tracking**:
   - Safely update `executionCount` and `lastExecutedAt` on firing rules to enable cooldown enforcement.
4. **Non-Regression**:
   - All 211 flagship listings, 211 contacts, and 4 deals must remain 100% intact.
   - Supabase must remain disconnected until the local JSON CRM phase is fully complete.

---
*Audit concluded with zero file mutations. Standing by for user instruction before beginning Phase 3F Step 4.*
