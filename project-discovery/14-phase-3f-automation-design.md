# Choutuppal Franchise CRM — Phase 3F, Step 1: Automation Engine Discovery & Architecture Design

**Date**: October 26, 2026  
**Auditor**: Principal Application Security Engineer, SaaS Architect & WhatsApp Integration Specialist  
**Project Root**: `/data/user/0/com.termux/files/home/storage/downloads/Cpl Crm/choutuppal-franchise-crm`  
**Phase Target**: Phase 3F — Automation Execution Engine Discovery & Architecture Design  
**Supabase State**: **DISCONNECTED (Preserving local JSON architecture; Read-Only Discovery)**  

---

## 1. Executive Summary

In Phases 3A through 3E, the platform successfully established persistent listing-to-CRM syncing, dynamic admin content management, shorts moderation with SSRF defenses, persistent WhatsApp shared inbox, and a Kanban sales pipeline. 

During discovery, **Gap 7** was identified: *"CRM automation rules may be loaded from CSV but are not actually executed."* 

This discovery document provides an exhaustive, read-only inspection of the repository's existing automation artifacts, CSV datasets (`sample_flows.csv` and `sample_automations.csv`), webhook handlers, store functions, and scheduling capabilities. It delivers a comprehensive, production-grade design for an **Event-Condition-Action (ECA) WhatsApp Automation Engine** engineered for multi-tenant franchise operation, strict security isolation, dry-run simulation, and future Supabase/cloud worker migration.

---

## 2. Actual CSV Inventory & Deep Dataset Interpretation

Two CSV files reside in both `/csv/` and `/public/csv/`:

```
./csv/sample_flows.csv (39 rows)
./csv/sample_automations.csv (179 rows)
./public/csv/sample_flows.csv (39 rows)
./public/csv/sample_automations.csv (179 rows)
```

A programmatic inspection of all 218 rows across both datasets reveals their distinct schemas, purposes, and operational semantics:

### 2.1 `sample_flows.csv` (Interactive Decision Trees & Button State Machines)

- **Total Rows**: 39
- **Columns**: `name, trigger_type, trigger_keywords, initial_message, button_options, template_slug, description`
- **Unique Trigger Types**: `{'keyword'}` (100% of rows)
- **Dataset Character**:
  - `sample_flows.csv` represents **Conversational State Machines / Interactive Menu Flowcharts**.
  - Each row corresponds to a conversational menu node equipped with rich Telugu copy, optional media attachments, and up to three interactive quick-reply button chips separated by semicolons (`;`).
  - Key Workflows represented:
    1. **Onboarding & Welcome Flow** (Rows 2–3): Welcome message, save contacts prompt, and Main Menu router.
    2. **Forced Channel Gate** (Row 4): Unlocks government services only after user joins official WhatsApp channel and community.
    3. **Directory Branching** (Rows 5–12): Police, Hospitals, Revenue, Electricity, Gram Panchayat, Local Businesses, and Real Estate marketplace.
    4. **Citizen & Vendor Intake Forms** (Rows 13–20): Job seeker registration (`ఉద్యోగం_కావాలి`), employer vacancy posting, rental housing requests, and property owner listings.
    5. **Creative & Commercial Services** (Rows 21–28): Birthday/wedding posters, political flex printing, business video ads, and wedding function hall directories.
    6. **B2B & Franchise Expansion** (Rows 35–40): Automated sales pitches for selling the Super App franchise to neighboring towns (Suryapet, Bhongir, Nalgonda) and selling automated chatbots to hospitals, schools, and restaurants.

### 2.2 `sample_automations.csv` (Atomic Event-Condition-Action Rule Book)

- **Total Rows**: 179
- **Columns**: `name, trigger_type, trigger_value, action_type, action_value, is_active, description, template_slug`
- **Breakdown by Trigger Type**:
  - `keyword_match`: **173 rows** (96.6%)
  - `time_based`: **4 rows** (2.2%) — `24h`, `48h`, `72h`, `96h`
  - `first_inbound_message`: **2 rows** (1.1%) — Day 1 Welcome & initial user tagging
- **Breakdown by Action Type**:
  - `send_message`: **155 rows** (86.6%) — Formatted auto-responses with emergency contacts, official phone numbers, and web portal links.
  - `add_tag`: **24 rows** (13.4%) — Contact lead tagging into CRM (`CRMContact.tags`).
- **Dataset Character**:
  - `sample_automations.csv` is an **Event-Condition-Action (ECA) Automation Rule Book**.
  - It pairs user inputs and lifecycle milestones with atomic CRM actions.
  - In many cases, dual rules exist for the same event: one sends an immediate Telugu response message, while a companion rule automatically tags the contact in CRM for staff follow-up:
    - *Example 1 (Inbound Lead)*: Keyword `"వార్త, అప్డేట్, న్యూస్ పోస్ట్, News"` triggers `send_message` (Row 22) **AND** `add_tag: tag_news_lead` (Row 23).
    - *Example 2 (Franchise Inquiry)*: Keyword `"City Franchise, Franchise, వైట్-లేబుల్"` triggers `send_message` (Row 24) **AND** `add_tag: tag_franchise_lead` (Row 25).
    - *Example 3 (Real Estate)*: Keyword `"Real Estate, ప్రాపర్టీ, ప్లాట్లు"` triggers `send_message` (Row 37) **AND** `add_tag: tag_real_estate_lead` (Row 38).
    - *Example 4 (Job Portal)*: Keyword `"ఉద్యోగం_కావాలి"` triggers `send_message` (Row 39) **AND** `add_tag: tag_job_seeker` (Row 40).
    - *Example 5 (Community Groups)*: Rows 57–76 cover **Ward 1 through Ward 20**, providing localized WhatsApp community invite links for each municipal ward.
    - *Example 6 (Emergency & Public Directory)*: Rows 77–179 cover vital emergency contacts (SI, CI, Dial 100/112, Fire Station, 108/102 Ambulance, CHC Govt Hospital, TSSPDCL Electricity AE, RTC Controller, Panthangi Toll Plaza, Tahsildar, MPDO, etc.).
    - *Example 7 (Time-based Drip Sequence)*: Rows 5, 7, 9, 11 define a 4-day onboarding drip sequence (`24h` name check, `48h` channel invite, `72h` ward group invite, `96h` Instagram invite).

---

## 3. Existing vs. Missing Automation Functionality

| Capability | Current Status in Codebase | Source File & Implementation State | Critical Gaps |
|---|---|---|---|
| **Flow CSV Parser** | **Implemented** | [`src/lib/parse-flow-csv.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/parse-flow-csv.ts) | Parses `sample_flows.csv`, handles semicolon-delimited buttons, extracts image URLs, generates node graphs. | Does not parse `sample_automations.csv`. |
| **Flow Management API** | **Implemented** | [`src/app/api/crm/flows/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/crm/flows/route.ts) | Allows batch importing flows and updating active flows in `store.flows`. | Lacks role/territory authorization; does not persist execution state. |
| **Flows Admin UI** | **Implemented** | [`src/app/crm/flows/page.tsx`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/crm/flows/page.tsx) | Displays 39 flows in a responsive grid, keyword chips, button badges, and CSV import modal. | Client-side search only; no visual node editor or execution metrics. |
| **Automations API** | **Partial / Defective** | [`src/app/api/crm/automations/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/crm/automations/route.ts) | Naive `GET` endpoint reading `sample_automations.csv` via `line.split(',')`. | **Broken CSV parsing**: Splits on commas inside quotes, mangling keywords and Telugu text. No `POST`, `PUT`, or `DELETE`. No DB persistence. |
| **Automations UI** | **Partial (Read-Only)** | [`src/app/crm/automations/page.tsx`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/crm/automations/page.tsx) | Directly fetches `/csv/sample_automations.csv` client-side and renders a table. | No state modification, no rule toggle, no dry-run testing, no execution logs. |
| **Webhook Rule Execution** | **MISSING** | [`src/app/api/whatsapp/webhook/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/whatsapp/webhook/route.ts) | Webhook contains ~10 hardcoded `if (lower.includes(...))` branches (taxi, auto, plumber, etc.). | **Neither `sample_automations.csv` nor `store.flows` are evaluated**. Inbound emergency queries, ward lookups, and keyword triggers fall through. |
| **Contact Tagging Engine** | **MISSING** | Nowhere in runtime | Contacts are never tagged via `add_tag` actions during message receipt. | Lead classification tags (`tag_job_seeker`, `tag_news_lead`) are never applied. |
| **Time-based Drip Scheduler** | **MISSING** | Nowhere in runtime | No cron, timer, or due-job queue exists in `src/`. | The 4 time-based drip rules (`24h`–`96h`) never execute. |
| **Broadcast Dispatching** | **Simulated** | [`src/app/crm/broadcasts/page.tsx`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/crm/broadcasts/page.tsx) | Uses `setTimeout(..., 1200)` to simulate sending broadcast messages. | No persistent campaign model, no contact filtering, no quota checks, no message logging. |

---

## 4. Trigger-Condition-Action (ECA) Engine Architecture

To transform static CSV definitions into an operational engine, the system will use an **Event-Condition-Action (ECA)** pipeline:

```
[Inbound Webhook / Cron Tick]
             │
             ▼
    ┌─────────────────┐
    │ Event Normalizer│ ──► Extracts: phone, rawText, lowerText, buttons, contact, territoryId
    └─────────────────┘
             │
             ▼
    ┌─────────────────┐
    │  Rule Evaluator │ ──► Scans Active Rules for:
    └─────────────────┘     1. Territory Match (Tenant rule OR Global rule)
                            2. Trigger Match (first_inbound_message | keyword_match | time_based)
                            3. Condition Check (tags, rate-limits, deduplication)
             │
             ▼
    ┌─────────────────┐
    │ Action Dispatch │ ──► Strictly Allowlisted Actions:
    └─────────────────┘     ├─► send_message (with safe {{variable}} templating)
                            ├─► add_tag / remove_tag (updates store.contacts)
                            ├─► update_stage (updates contact/deal stage)
                            └─► start_flow (routes to interactive flow node)
             │
             ▼
    ┌─────────────────┐
    │ Audit & Logging │ ──► Writes execution log to store.auditLogs & store.messages
    └─────────────────┘
```

### 4.1 Trigger Subsystem

| Trigger Type | Source / Event | Matching Semantics |
|---|---|---|
| `first_inbound_message` | Inbound WhatsApp Webhook | Evaluated only when contact has `messageCount === 0` or contact is newly created. |
| `keyword_match` | Inbound WhatsApp Webhook | Splits trigger values by comma; cleans leading/trailing whitespace. Evaluates case-insensitive word-boundary or substring match against `lowerText`. Supports Telugu unicode matching. |
| `time_based` | Scheduled Worker / Tick API | Evaluated against contact `createdAt` or last milestone. Trigger value parses durations: e.g. `24h` (86,400s), `48h`, `72h`. Checks whether the scheduled action was already dispatched to prevent duplicate sends. |
| `flow_button_reply` | Inbound WhatsApp Button Click | Matches `message.interactive.button_reply.id` or title against flow node button configurations. |

### 4.2 Condition Subsystem

Before any action is dispatched, all conditions must evaluate to `true`:
1. **Rule Status**: `rule.status === 'active'` (rules in `draft`, `paused`, or `disabled` are skipped).
2. **Tenant Scoping**: Rule belongs to caller's `territoryId` OR is a global flagship template (`territoryId === FLAGSHIP_TERRITORY_ID` or `isGlobal === true`).
3. **Contact Filter Conditions** (Optional):
   - `require_tag`: Contact must already have this tag.
   - `exclude_tag`: Contact must NOT already have this tag (e.g., skip `Day 2 Name Verify` if `tag_name_verified` is present).
4. **Anti-Loop / Rate Limit Condition**:
   - Contact has not received an automated reply to the identical rule within the last 5 minutes.
   - User has not exceeded max automated replies (limit: 5 replies per 5-minute window).

### 4.3 Strictly Allowlisted Action System

To prevent arbitrary execution and maintain zero-trust security:

```typescript
export type AutomationActionType = 
  | 'send_message' 
  | 'add_tag' 
  | 'remove_tag' 
  | 'update_stage' 
  | 'queue_approval'
```

1. **`send_message`**:
   - Takes `action_value` string (message copy).
   - Interpolates safe, allowlisted template variables:
     - `{{contact.first_name}}` / `{{contact.name}}`: Substituted with contact name or fallback ("మిత్రమా").
     - `{{territory.name}}`: Local town name (e.g. "చౌటుప్పల్", "సూర్యాపేట").
     - `{{territory.phone}}`: Local helpline/SI contact.
     - `{{territory.domain}}`: Local domain (e.g. `https://choutuppal.in`, `https://suryapet.choutuppal.in`).
   - Appends outbound message record into `store.messages`.
   - In Sandbox mode: Sets `providerDelivered: false`, `status: 'sent'`.
   - In Live mode: Dispatches via Meta Cloud API.

2. **`add_tag`**:
   - Takes `action_value` tag name (e.g. `tag_job_seeker`).
   - Idempotently adds tag to `contact.tags` (prevents duplicates).
   - Increments contact `updatedAt`.

3. **`remove_tag`**:
   - Removes specified tag from `contact.tags`.

4. **`update_stage`**:
   - Transitions contact stage to `'NEW_LEAD' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST'`.

5. **`queue_approval`**:
   - Inserts entry into `store.approvals` for items requiring human moderation (new vendor onboard, news submission, citizen report).

---

## 5. Security & Tenant Isolation Model

### 5.1 Defense Against CSV Formula Injection (CWE-1236)
- CSV cells often contain special characters. If an imported cell begins with `=`, `+`, `-`, or `@`, spreadsheet software might execute malicious code.
- **Enforcement**: The CSV parser will strip or escape leading formula operators, treating all cell contents strictly as plain UTF-8 text strings.

### 5.2 Zero Arbitrary Code Execution
- Rules are strictly declarative data objects.
- **Never** pass rule values to `eval()`, `new Function()`, or shell execution.
- Templating engine will use a strict regex replacer restricted to the allowlisted variable dictionary.

### 5.3 Tenant Isolation & Anti-Spoofing
- Every imported rule is stamped with `territoryId`.
- Super Admin can create global rules or territory-scoped rules.
- Franchise Admins can only create, view, pause, or edit rules belonging to their own `territoryId`.
- When an incoming message arrives:
  1. The engine checks for a **Territory-Specific Rule** first (e.g., Nalgonda SI phone).
  2. If none exists, it falls back to a **Global / Flagship Rule** with dynamically injected territory tokens (`{{territory.name}}`, `{{territory.domain}}`).
  3. A Franchise Admin can never modify or disable Flagship Choutuppal rules or other franchise rules.

### 5.4 Infinite Loop & Self-Trigger Prevention
- Outbound automated messages generated by the bot MUST NEVER be processed by the webhook as inbound messages.
- The webhook rejects messages where `message.from === store.settings.whatsappPhoneNumberId` or `direction === 'outbound'`.
- Deduplication cache (`providerMessageId`) discards duplicate webhook notifications from Meta.

---

## 6. Proposed Data Model & API Architecture

### 6.1 Data Model ([`src/lib/types.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/types.ts))

```typescript
export type AutomationTriggerType = 
  | 'keyword_match' 
  | 'first_inbound_message' 
  | 'time_based' 
  | 'flow_button_reply'

export type AutomationActionType = 
  | 'send_message' 
  | 'add_tag' 
  | 'remove_tag' 
  | 'update_stage' 
  | 'queue_approval'

export type AutomationRuleStatus = 'active' | 'paused' | 'draft' | 'disabled'

export interface AutomationRule {
  id: string
  name: string
  territoryId: string
  isGlobal: boolean
  triggerType: AutomationTriggerType
  triggerKeywords?: string[]        // For keyword_match
  timeDelayHours?: number           // For time_based (e.g. 24, 48, 72)
  actionType: AutomationActionType
  actionValue: string               // Message template or Tag name
  buttonOptions?: string[]          // Interactive buttons if any
  status: AutomationRuleStatus
  priority: number                  // 1-100 (higher evaluated first)
  description?: string
  templateSlug?: string
  executionCount: number
  lastExecutedAt?: string
  createdAt: string
  updatedAt: string
}

export interface AutomationExecutionLog {
  id: string
  ruleId: string
  ruleName: string
  territoryId: string
  contactPhone: string
  contactName?: string
  triggerType: AutomationTriggerType
  matchedTrigger: string
  actionsExecuted: Array<{
    type: AutomationActionType
    value: string
    success: boolean
    output?: string
  }>
  executedAt: string
}
```

### 6.2 Proposed API Endpoints

1. **`GET /api/crm/automations`**
   - Authenticated (`requireAuth`).
   - Query params: `territoryId`, `status`, `search`, `triggerType`.
   - Returns list of scoped rules + execution metrics.

2. **`POST /api/crm/automations`**
   - Authenticated (`requireAuth`, `requireTerritoryAccess`).
   - Supports:
     - Single rule creation with strict field validation.
     - **Batch CSV Import**: Safely parses `sample_automations.csv`, validates columns, ignores formula prefixes, assigns `territoryId`, and imports rules into `store.automations`.

3. **`PUT /api/crm/automations`**
   - Authenticated.
   - Supports toggling status (`active` <-> `paused`), editing trigger keywords, or updating message copy.
   - Protects against cross-territory IDOR.

4. **`DELETE /api/crm/automations`**
   - Authenticated.
   - Deletes rule with territory ownership verification.

5. **`POST /api/crm/automations/dry-run` (Simulation Sandbox)**
   - Authenticated.
   - Accepts test payload: `{ incomingText: string, senderPhone: string, territoryId?: string }`.
   - Evaluates active rules without persisting messages or modifying contact tags.
   - Returns matched rules, rendered message preview with variable interpolation, planned tags, and potential warnings.

6. **`POST /api/crm/automations/run-scheduled` (Time-Based Worker)**
   - Authenticated or secret cron-token authenticated (`x-cron-key`).
   - Scans contacts against `time_based` rules (`24h`, `48h`, etc.).
   - Dispatches due drip messages, records execution log, and prevents duplicate sends.

---

## 7. Dry-Run Mode vs. Real Delivery Distinction

To enable risk-free testing on Termux without external WhatsApp costs or Meta Cloud API credentials:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           EXECUTION MODES                                │
├──────────────────────────┬───────────────────────┬───────────────────────┤
│ Mode                     │ Side Effects          │ Delivery Channel      │
├──────────────────────────┼───────────────────────┼───────────────────────┤
│ 1. DRY-RUN (Simulation)  │ ZERO disk mutation.   │ No network dispatch.  │
│                          │ No store mutation.    │ Returns JSON preview. │
├──────────────────────────┼───────────────────────┼───────────────────────┤
│ 2. LOCAL SANDBOX STORE   │ Appends to            │ No network dispatch.  │
│    (Current default)     │ store.messages &      │ Logs                  │
│                          │ store.contacts.       │ providerDelivered:    │
│                          │ Safe on local disk.   │ false.                │
├──────────────────────────┼───────────────────────┼───────────────────────┤
│ 3. LIVE PRODUCTION       │ Appends to store.     │ Dispatches HTTP POST  │
│    (When keys present)   │ Dispatches live Meta  │ to graph.facebook.com │
│                          │ Cloud API call.       │ with official token.  │
└──────────────────────────┴───────────────────────┴───────────────────────┘
```

The system will operate in **Mode 2 (Local Sandbox Store)** by default, with **Mode 1 (Dry-Run)** available via API and UI for safe testing. Live network delivery (Mode 3) is strictly gated behind valid Meta API tokens and explicit environment configuration.

---

## 8. Staged Implementation Plan (Phase 3F Roadmap)

- **Step 1: Discovery & Architecture Design (COMPLETED)**
  - Inventory CSV files, inspect existing endpoints, and establish architectural specifications.
  - Deliver: `project-discovery/14-phase-3f-automation-design.md`.

- **Step 2: Safe CSV Import & Automation Store Persistence**
  - Add `automations: AutomationRule[]` to `AdminDataStore` in `src/lib/store.ts`.
  - Create safe RFC-compliant CSV parser (`src/lib/parse-automation-csv.ts`) that handles quoted commas, multilingual Telugu text, and formula sanitization.
  - Implement authenticated CRUD in `src/app/api/crm/automations/route.ts` with batch import.

- **Step 3: Core Rule Evaluation Engine (`evaluateAutomations`)**
  - Implement `src/lib/automation-engine.ts`:
    - Event matching (keywords, first inbound, button reply).
    - Allowlisted actions (`send_message`, `add_tag`, `queue_approval`).
    - Safe variable templating (`{{contact.name}}`, `{{territory.name}}`).
    - Anti-loop & rate-limiting guards.

- **Step 4: Webhook Integration**
  - Wire `evaluateAutomations()` into `src/app/api/whatsapp/webhook/route.ts`.
  - Replace hardcoded `if/else` ladders with dynamic rule evaluation, while preserving flagship magic login and listing claim workflows.

- **Step 5: Dry-Run API & Interactive Admin UI**
  - Implement `/api/crm/automations/dry-run`.
  - Upgrade `src/app/crm/automations/page.tsx` with rule toggle switches, live keyword search, rule edit modal, and interactive test tester (type a phrase and see the matched response).

- **Step 6: Time-based Drip Engine (Scheduler)**
  - Implement `/api/crm/automations/run-scheduled` to process `24h`, `48h`, `72h`, `96h` drip milestones.

- **Step 7: Automated Verification & Regression Audit**
  - Write `test_phase3f_automations.py` covering all 7 test groups (parsing, security, triggers, tags, tenant scoping, dry-run, regression).
  - Verify zero regressions against the 148 baseline tests.

---

## 9. Test Plan & Acceptance Criteria

When implemented in subsequent steps, the engine must satisfy the following criteria:

1. **CSV Ingestion & Integrity**:
   - `sample_automations.csv` imports all 179 rules without crashing or corrupting Telugu strings.
   - Comma-containing quoted cells are correctly parsed into single columns.
   - Dangerous CSV prefixes (`=`, `+`, `-`, `@`) are neutralized.
2. **Keyword Trigger Accuracy**:
   - Inbound message `"పోలీస్ స్టేషన్"` matches rule 77 and dispatches SI/CI contact details.
   - Inbound message `"వార్డు 5"` matches rule 61 and returns Ward 5 community link.
   - Inbound message `"ఉద్యోగం_కావాలి"` dispatches job seeker copy AND adds `tag_job_seeker` to the contact.
3. **Tenant Isolation**:
   - Franchise Admin for Nalgonda cannot see, edit, or delete rules belonging to Choutuppal.
   - Global rules interpolate `{{territory.name}}` as "Nalgonda" when evaluating a Nalgonda conversation.
4. **Dry-Run Mode**:
   - Dry-run API returns simulated output without altering `admin_data.json` or incrementing contact message counts.
5. **Data Safety**:
   - All 212 existing listings, 211 contacts, and 4 sales deals remain 100% intact throughout testing.

---

## 10. Conclusion & Approval Request

This concludes **Phase 3F, Step 1: Discovery & Architecture Design**. No application code, dependencies, or data stores were modified during this inspection.

*Awaiting user approval before proceeding to Step 2 (Data Model & CSV Safe Parser implementation).*
