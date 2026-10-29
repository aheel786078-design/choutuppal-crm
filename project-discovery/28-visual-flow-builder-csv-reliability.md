# Phase 8: WhatsApp CRM Visual Flow Builder, CSV Import Reliability & Message Fidelity
**Comprehensive Audit, Architectural Hardening, Usability Implementation & Test Verification Report**

*Repository:* `choutuppal-franchise-crm`  
*Target Environment:* Termux Linux / Node.js v26.4.0 (TypeScript Loader)  
*Active Data Store:* Local JSON (`data/admin_data.json`)  
*External Database Status:* Supabase / PostgreSQL postponed (Zero schema migrations executed)  
*Date of Verification:* October 27, 2026  

---

## 1. Executive Summary & Production Readiness Status

During Phase 8, the WhatsApp CRM Visual Flow Builder, CSV Import Engine, and Runtime Dispatcher were audited, debugged, hardened, and verified end-to-end. Previously identified critical bottlenecks—including hardcoded 3-node graph truncation on flow save, missing interactive list row probe matching in the runtime engine, omission of video/document media arguments in the webhook handler, lack of column mapping feedback in the import UI, and missing directory listing publication checks—have all been repaired.

### Key Milestones Completed:
1. **Full Graph Persistence Architecture**: Eliminated the destructive 3-node hardcoded reconstruction bug in `src/app/crm/flows/page.tsx`. Multi-node conversational graphs (5+ nodes) are preserved across disk saves, browser reloads, modal reopenings, and graph updates.
2. **Deterministic CSV Parsing & Telugu Unicode Fidelity**: Enhanced `src/lib/parse-flow-csv.ts` to support RFC 4180 quotes, multiline cells, UTF-8 BOM, case-insensitive column aliases (`flowname`, `message_body`, `video_url`, etc.), duplicate header rejection, column count mismatch diagnostics, and non-HTTPS media warnings.
3. **Message Body Non-Hijacking Guarantee**: The runtime engine (`src/lib/flow-runtime-engine.ts`) enforces custom copy rendering. Flows retaining legacy `template_slug` fields never have their Telugu copy overwritten by canned generic templates.
4. **Interactive Button & List Row State Transitions**: Probe evaluation now evaluates button replies and list-row selections (`listSections`) across both active node contexts (`activeNodeId`) and global flow triggers.
5. **Multi-Format Media Compliance**: Full support for `text`, `image`, `video`, and `document` payloads in `src/lib/whatsapp-cloud-api.ts`. Enforces HTTPS URLs and gracefully falls back to text messages upon malformed or missing URLs.
6. **Strict Website Listing Security**: When binding directory listings by ID, slug, or category, listings are strictly validated for publication status (`published`, `approved`, `APPROVED`) and territory boundaries (`territory_choutuppal`). Unpublished or cross-territory listings are withheld from WhatsApp dispatch with security reasons logged.
7. **Zero Baseline Mutation**: All 212 listings, 211 contacts, 4 deals, 1 flow baseline, 179 draft automations, and 4 territories remain 100% intact. Zero live WhatsApp messages or Meta API calls were made.

---

## 2. Baseline Data Reconciliation Table

The local JSON database at `data/admin_data.json` was audited prior to testing, monitored across intermediate operations, and verified after all 7 automated test suites completed.

| Entity | Pre-Phase 8 Baseline | Target Constraint | Post-Phase 8 Reconciled | Audit Status |
| :--- | :---: | :---: | :---: | :---: |
| **Total Directory Listings** | 212 | 212 (211 Flagship + 1 Nalgonda) | 212 | **VERIFIED PASS** |
| **Flagship Choutuppal Listings** | 211 | 211 | 211 | **VERIFIED PASS** |
| **CRM Merchant Contacts** | 211 | 211 | 211 | **VERIFIED PASS** |
| **Active CRM Deals** | 4 | 4 | 4 | **VERIFIED PASS** |
| **WhatsApp Conversational Flows** | 1 (`flow_category_browser`) | >= 1 | 1 | **VERIFIED PASS** |
| **Automations (Draft Rules)** | 179 | 179 (100% Draft/Inactive) | 179 | **VERIFIED PASS** |
| **Active Automation Rules** | 0 | 0 (Strict Safety Rule) | 0 | **VERIFIED PASS** |
| **Platform Territories** | 4 | 4 (Choutuppal, Bhongir, Suryapet, Nalgonda) | 4 | **VERIFIED PASS** |
| **Database Corruption / Record Loss** | None | 0 | None | **VERIFIED PASS** |

---

## 3. Root Cause Analysis: Node Graph Truncation & UI Overwrite Bug

### The Issue:
When administrators edited an existing flow or imported a complex 5-node decision tree from CSV and clicked "Save Flow" in the Admin UI, the flow would reload with only 3 nodes: `start`, `entry_message`, and `end_terminal`. Any custom nodes, follow-up messages, buttons, or action branches created after node 2 were discarded.

### Root Cause in `src/app/crm/flows/page.tsx`:
```typescript
// PREVIOUS DEFECTIVE CODE:
const nodesToSave: FlowNode[] = [
  { id: 'start', type: 'start', ... },
  { id: 'entry_message', type: 'send_buttons', ... },
  { id: 'end_terminal', type: 'end', ... }
]
// Unconditionally overwrote editingFlow.nodes with this 3-node array
```

### Remediation:
In `src/app/crm/flows/page.tsx`, `handleSaveFlow` was redesigned to:
1. Deep-clone `editingFlow.nodes` to preserve all existing custom nodes (`node_2`, `node_3`, `node_feedback`, `goto_...`, etc.).
2. Update the `entry_message` node config in place without deleting downstream nodes.
3. Dynamically append action nodes for new buttons that lack an existing downstream route.
4. Add pre-save validations checking for duplicate node IDs and button titles exceeding Meta's 20-character limit.
5. Provide a "Connected Graph Nodes" inspector panel displaying node IDs, types, and outgoing transitions.

---

## 4. Flow Graph Persistence Architecture

Flows are persisted in `data/admin_data.json` following the canonical schema:

```
[Start Node] (id: "start", type: "start")
    │
    ▼ (nextNodeId: "entry_message")
[Message / Buttons Node] (id: "entry_message", type: "send_buttons")
    ├── Button 1 (payload: "btn_listings") ──► [Listing Node] (id: "node_listing")
    └── Button 2 (payload: "btn_support")  ──► [Support Node] (id: "node_support")
                                                      │
                                                      ▼ (nextNodeId: "node_feedback")
                                            [Feedback Node] (id: "node_feedback", type: "send_buttons")
                                                      │
                                                      ▼ (nextNodeId: "end_terminal")
                                            [Terminal Node] (id: "end_terminal", type: "end")
```

### Verified Behaviors:
- **Save to Store**: Canonical flow object saved with all 5+ nodes, positions, and transitions.
- **Disk Reload**: Direct file read verifies 100% node retention without truncation.
- **Reopen in Builder**: Reopening the flow loads all nodes into the UI canvas and Connected Nodes Inspector.

---

## 5. CSV Parser Reliability & Non-Destructive Ingestion

The CSV parser at `src/lib/parse-flow-csv.ts` was enhanced to handle real-world messy CSV spreadsheets exported from Excel, Google Sheets, and CRM tools.

### Key Enhancements:
1. **RFC 4180 Multiline & Quote Parsing**: Custom parser tokenizes fields with embedded commas, quotes (`""` -> `"`), multiline strings, and Windows/Unix linebreaks.
2. **Case-Insensitive Column Aliases**:
   - `name`: `['name', 'flow_name', 'flowname', 'title', 'flow_title']`
   - `triggerKeywords`: `['trigger_keywords', 'triggerkeywords', 'keywords', 'triggers', 'trigger_keyword']`
   - `initialMessage`: `['initial_message', 'initialmessage', 'message', 'body', 'message_body', 'text']`
   - `mediaUrl`: `['media_url', 'mediaurl', 'video_url', 'videourl', 'video', 'media']`
   - `mediaType`: `['media_type', 'mediatype', 'media_kind', 'mediakind', 'type_media']`
   - `nextNodeIds`: `['next_node_ids', 'next_node_id', 'next_nodes', 'nextnodeid', 'next_node']`
   - `buttonPayloads`: `['button_payloads', 'buttonpayloads', 'payloads', 'button_ids']`
3. **Detected Column Mappings**: Parser exports `detectedMappings` capturing the user's exact header labels.
4. **Row-Level Diagnostics**:
   - Duplicate header detection (`Duplicate headers detected in CSV: ...`).
   - Column count mismatch warnings (`Row column count (2) differs from header count (5)...`).
   - Button title truncation warnings for titles > 20 characters.
   - Non-HTTPS media URL warnings (`Media URL is not secure HTTPS...`).

---

## 6. Message Fidelity & Custom Copy Non-Hijacking Guarantee

### The Safeguard:
In early iterations, flows imported from CSV that specified a `template_slug` (e.g. `canned_welcome_v1`) would occasionally be overwritten by generic hardcoded template strings during runtime dispatch.

### Runtime Engine Enforcement:
In `src/lib/flow-runtime-engine.ts`, the text rendering pipeline uses:
```typescript
const rawBody = activeNode.config.text || matchedFlow.initial_message || matchedFlow.description || ''
const resolvedText = interpolateVariables(rawBody, { ... })
```
The exact custom copy (Telugu Unicode, formatting, contact variables) is preserved and returned in `renderedBody`, `body`, and `messageText`. The `template_slug` is transmitted strictly as an optional Meta API parameter without replacing the custom message body.

---

## 7. Interactive Button & List Row State Transitions

### Probe Resolution Flowchart:
```
Inbound User Input (cleanPayload || cleanButtonTitle || cleanText)
                          │
                          ▼
            Is activeNodeId provided?
                  /          \
               YES            NO
              /                \
   Search activeNode for         Search activeFlow across
   button or list transition     all nodes for matching probe
              │                         │
      Matched transition?               ▼
          /        \             Matched transition?
        YES         NO                 /        \
       /             \               YES         NO
      /               \             /             \
Transition to       Fallback to   Transition to   Evaluate general
target nextNodeId   flow triggers target nextNode  keyword triggers
```

### Multi-Turn Simulation Context:
- **Turn 1**: Citizen triggers flow with `help` -> Lands on `node_step1` ("మీరు వ్యాపారి లేదా వినియోగదారులా?").
- **Turn 2**: Citizen replies with `వ్యాపారి` passing `activeNodeId: "node_step1"` -> Runtime follows button transition directly to `node_step2_merchant`.
- **Turn 3**: Citizen selects `లిస్టింగ్ చేర్చండి` from `node_step2_merchant` -> Runtime transitions to `end_terminal`.

---

## 8. Media Payload Compliance across Image, Video, Document & Fallback

In `src/lib/whatsapp-cloud-api.ts`, `buildWhatsAppPayload` and `buildWhatsAppCloudApiPayload` construct compliant Meta payloads:

1. **Text Message**:
   ```json
   { "messaging_product": "whatsapp", "recipient_type": "individual", "to": "919876543210", "type": "text", "text": { "body": "..." } }
   ```
2. **Image Message (HTTPS)**:
   ```json
   { "messaging_product": "whatsapp", "type": "image", "image": { "url": "https://...", "link": "https://...", "caption": "..." } }
   ```
3. **Video Message (HTTPS)**:
   ```json
   { "messaging_product": "whatsapp", "type": "video", "video": { "url": "https://...", "link": "https://...", "caption": "..." } }
   ```
4. **Document Message (HTTPS)**:
   ```json
   { "messaging_product": "whatsapp", "type": "document", "document": { "url": "https://...", "link": "https://...", "caption": "...", "filename": "brochure.pdf" } }
   ```
5. **Insecure URL / Missing Media Fallback**:
   If `mediaUrl` uses insecure `http://` or is missing, the payload gracefully falls back to `type: "text"` with the full text message body, preventing Meta API dispatch rejections.

---

## 9. Strict Directory Listing Security & Multi-Tenant Isolation

When an action node specifies `listingId`, `listingSlug`, or `listingCategory`, `src/lib/flow-runtime-engine.ts` enforces two non-negotiable security invariant checks:

1. **Publication Invariant**:
   - Listing must have `status: 'published'`, `approved: true`, or `status: 'APPROVED'`.
   - Draft, pending, or rejected listings are **withheld from output** with diagnostic reason logged: `Listing "..." is in draft status (not published/approved) and withheld from public bot.`
2. **Territory Invariant**:
   - The listing's `territoryId` must match the caller's territory (e.g. `territory_choutuppal`).
   - Cross-territory lookups (e.g. Nalgonda listing requested in a Choutuppal flow) are **withheld from output** with diagnostic reason logged: `Listing "..." belongs to different territory "territory_nalgonda" and is inaccessible from "territory_choutuppal".`

Zero sensitive draft data or cross-tenant business details are leaked to public WhatsApp users.

---

## 10. WhatsApp Cloud API Webhook Integration & Honest Provider Delivery

In `src/app/api/whatsapp/webhook/route.ts`:
- **Media Preservation**: Webhook handler passes `mediaUrl: flowResult.mediaUrl` and `mediaType: flowResult.mediaType` to `sendWhatsAppFlowMessage`, ensuring video and document flows are dispatched with their full media headers.
- **Honest Delivery Reporting**: When Meta API credentials (`WHATSAPP_API_TOKEN`) are not configured, messages are staged to the sandbox inbox with `providerDelivered: false`. The system never falsely records unconfirmed dispatches as successful deliveries.

---

## 11. Admin Flow Builder Usability Enhancements

In `src/app/crm/flows/page.tsx` and `src/components/crm/flow-import-modal.tsx`:
- **Detected Column Mappings**: Import modal renders visual badges showing mapped and unmapped fields.
- **Row-Level Warnings Panel**: Renders non-fatal warnings (e.g. truncated button titles, shifted columns, non-HTTPS media) in amber.
- **Import Summary Banner**: Displays exact counts of created and updated flows upon successful import.
- **Connected Graph Nodes Inspector**: The editor modal features a graph inspection panel listing all nodes, their IDs, types, and downstream transitions before saving.
- **Pre-Save Graph Validation**: Detects duplicate node IDs, empty messages, and button title limit violations (>20 characters) before dispatching the save request.

---

## 12. Automated Test Suite Results

### A. Phase 8 Dedicated Test Suite (`test_phase8_flow_builder_csv.py`)
*Command:* `python3 test_phase8_flow_builder_csv.py`  
*Exit Code:* `0` (Success)  
*Duration:* ~12s  

| Test # | Test Name | Result |
| :---: | :--- | :---: |
| 1 | Baseline Record Verification (212 listings, 211 contacts, 4 deals, 179 draft automations, 4 territories) | **PASS** |
| 2 | CSV Parser Telugu Unicode & Multiline Fidelity | **PASS** |
| 3 | Header Aliases & Case-Insensitive Field Mappings | **PASS** |
| 4 | Row-Level Diagnostics (Duplicate headers, column count mismatches, non-HTTPS warnings) | **PASS** |
| 5 | Duplicate Import Deduplication & Preview Dry-Run Zero Mutation | **PASS** |
| 6 | 5+ Node Graph Persistence (Save -> Reload from disk -> Reopen) | **PASS** |
| 7 | Custom Text Non-Hijacking (template_slug does not clobber custom Telugu body) | **PASS** |
| 8 | Button & List Row NextNode Transitions | **PASS** |
| 9 | Media Payload Construction across Formats (Text, Image, Video, Document, Fallback) | **PASS** |
| 10 | Strict Website Listing Security (Published & Territory Isolation vs Draft vs Cross-Territory) | **PASS** |
| 11 | Multi-Turn Simulation Context with activeNodeId | **PASS** |
| 12 | Inbound Webhook Dispatch Fidelity (Video & Document Flows) | **PASS** |
| 13 | Final Baseline Record Counts & Integrity Verification | **PASS** |

### B. Full Regression Test Matrix
All previous verification suites were executed against the hardened codebase:

| Suite Name | Command | Tests Run | Passed | Failed | Exit Code | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Phase 8 Flow Builder & CSV** | `python3 test_phase8_flow_builder_csv.py` | 13 | 13 | 0 | 0 | **PASS** |
| **Phase 7 Flow Automation** | `python3 test_phase7_flow_automation.py` | 9 | 9 | 0 | 0 | **PASS** |
| **Phase 6 Feature Completion** | `python3 test_phase6_feature_completion.py` | 14 | 14 | 0 | 0 | **PASS** |
| **Phase 5 Admin Fixes** | `python3 test_phase5_admin_fixes.py` | 13 | 13 | 0 | 0 | **PASS** |
| **Phase 4 Listing Lifecycle** | `python3 test_phase4_listing_lifecycle.py` | 41 | 41 | 0 | 0 | **PASS** |
| **Phase 3f Step 2 Automations** | `python3 test_phase3f_automations_step2.py` | 19 | 19 | 0 | 0 | **PASS** |
| **Phase 3f Step 4 Webhook Shadow** | `python3 test_phase3f_webhook_shadow.py` | 17 | 17 | 0 | 0 | **PASS** |
| **Total Automated Assertions** | — | **126** | **126** | **0** | **0** | **100% PASS** |

---

## 13. End-to-End Administrator User Guide

### 1. Importing Flows via CSV
1. Navigate to **CRM → Flows** in the franchise admin navigation.
2. Click **Import CSV** in the upper right corner.
3. Select or drag a `.csv` file (or click **Download Master CSV** to obtain `sample_flows.csv`).
4. Inspect the **Detected Column Mappings** chips (green for recognized columns).
5. Review any **Warnings (Non-Fatal)** for button titles truncated to 20 characters or non-HTTPS media URLs.
6. Click **Preflight Dry-Run** to test parsing without mutating records.
7. Select **Draft (Safe)** or **Published (Live)** import posture, then click **Import Flows**.

### 2. Creating & Editing Multi-Node Flows Visually
1. In the Flows list, click **+ Create Flow** or click **Edit** on an existing flow.
2. Enter the Flow Name, Trigger Keywords (comma-separated), and Message Text.
3. Add interactive quick-reply buttons (up to 3) or list options (up to 10).
4. For media messages, select **Image**, **Video**, or **Document** and provide a secure `https://` URL.
5. In the **Connected Graph Nodes** inspector, review the auto-generated nodes (`start`, `entry_message`, `action_node_1`, etc.).
6. Click **Save Flow**. All graph nodes and transitions are persisted to the database.

### 3. Binding a Website Listing to a Flow
1. In the Flow Editor, select **Directory Listing** as the entry node or action type.
2. Search and select a published business from the dropdown (e.g. *Apollo Pharmacy*).
3. The flow will interpolate `{{listing.title}}`, `{{listing.phone}}`, `{{listing.address}}`, `{{listing.url}}`, and display the business cover image.
4. If the listing is unpublished or belongs to a different franchise territory, the system automatically withholds it from public responses.

---

## 14. Final Feature Status & Certification Matrix

| Feature Area | Component / Subsystem | Implementation Details | Verified Status |
| :--- | :--- | :--- | :---: |
| **Multi-Node Graph Persistence** | `src/app/crm/flows/page.tsx` | Eliminates hardcoded 3-node save; preserves full branching graphs (5+ nodes) | **PASS** |
| **CSV Parser & Aliases** | `src/lib/parse-flow-csv.ts` | Case-insensitive header matching; multiline & quote tokenization; BOM strip | **PASS** |
| **Telugu Unicode Fidelity** | `src/lib/parse-flow-csv.ts` | Exact preservation of Telugu glyphs and complex Telugu conjunct characters | **PASS** |
| **Row-Level Diagnostics** | `src/lib/parse-flow-csv.ts` | Duplicate header detection; column count mismatch warnings; button truncation | **PASS** |
| **Import Modal UI** | `src/components/crm/flow-import-modal.tsx` | Detected column chips; non-fatal warnings box; post-import count summary | **PASS** |
| **Message Body Fidelity** | `src/lib/flow-runtime-engine.ts` | Custom body prioritized over template_slug; zero template hijacking | **PASS** |
| **Interactive Transitions** | `src/lib/flow-runtime-engine.ts` | Button and list section row probe matching with `activeNodeId` priority | **PASS** |
| **Multi-Turn Navigation** | `src/lib/flow-runtime-engine.ts` | Contextual multi-turn dialogue progression across sequential user turns | **PASS** |
| **Media Payloads** | `src/lib/whatsapp-cloud-api.ts` | Text, image, video, document payloads; HTTPS enforcement; graceful fallback | **PASS** |
| **Listing Security** | `src/lib/flow-runtime-engine.ts` | Strict publication status checks (`published`, `approved`, `APPROVED`) | **PASS** |
| **Territory Isolation** | `src/lib/flow-runtime-engine.ts` | Cross-territory listing lookups withheld with diagnostic reason | **PASS** |
| **Inbound Webhook** | `src/app/api/whatsapp/webhook/route.ts` | Dispatches video & document media with complete metadata to flow sender | **PASS** |
| **Live External Meta API Calls** | Meta Graph API | Deliberately mock/sandbox mode; live credential calls remain deferred | **NOT VERIFIED** (By Design) |
| **Supabase Database Schema** | PostgreSQL / Supabase | Deliberately deferred until full functional signoff; zero DDL executed | **NOT VERIFIED** (By Design) |
| **Baseline Data Preservation** | `data/admin_data.json` | 212 listings, 211 contacts, 4 deals, 1 flow, 179 draft automations preserved | **PASS** |

---
*Report Certified by Antigravity Autonomous Pair Programmer on October 27, 2026.*
