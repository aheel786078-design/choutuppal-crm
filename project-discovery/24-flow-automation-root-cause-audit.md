# Choutuppal Franchise CRM — Phase 1 Root Cause Audit: WhatsApp Flow Automation & CSV Runtime Integration

**Document:** `project-discovery/24-flow-automation-root-cause-audit.md`  
**Date:** October 27, 2026  
**Auditor:** Antigravity Engine Architecture Team  
**Scope:** Investigation of WhatsApp Flow CSV Importer, Flow Data Models, Admin Builder, and Webhook Runtime Execution Path  
**Storage Target:** `data/admin_data.json` (Local JSON Store — Supabase Disconnected)  

---

## 1. Executive Summary & Root Cause Statement

When administrators imported WhatsApp Flows using `sample_flows.csv` into the Choutuppal Franchise CRM, they reported that **imported custom Telugu messages were either never delivered or replaced by generic "welcome_menu" templates or hardcoded bot responses**.

Our comprehensive code trace of `src/app/crm/flows/page.tsx`, `src/lib/parse-flow-csv.ts`, `src/app/api/crm/flows/route.ts`, `src/lib/types.ts`, `src/app/api/whatsapp/webhook/route.ts`, and `src/lib/whatsapp-cloud-api.ts` has uncovered **four critical structural root causes**:

1. **Storage Data Loss (The Drop Defect):**  
   In `src/app/api/crm/flows/route.ts` (lines 24–41), the batch import handler maps CSV rows into the legacy `CRMFlowConfig` interface. In doing so, `f.initial_message`, `f.template_slug`, `f.nodes`, and `f.imageUrl` are **completely dropped**. `initial_message` is conditionally shoved into `flow.description` only if `description` is blank. Because `CRMFlowConfig` has no message body field, the imported custom text is never stored in `data/admin_data.json`.
2. **Complete Runtime Disconnect (The Bypass Defect):**  
   In `src/app/api/whatsapp/webhook/route.ts` (lines 180–440), incoming WhatsApp messages are routed through 10 hardcoded `if (lower.includes(...))` statements (for vendor claims, magic login, franchise applications, taxi, auto, plumber, electrician, real estate, and directory cards). **`store.flows` is never queried, iterated, or evaluated at runtime**. Incoming keyword triggers from imported flows (e.g. `Jobs`, `Rentals`, `Bazaar`, `Next`, etc.) are completely ignored by the webhook.
3. **Template Hijacking & UI Deception:**  
   In `sample_flows.csv`, every row includes `template_slug: "welcome_menu"`. In `src/app/crm/flows/page.tsx` (lines 147 & 199), the UI falls back to `'Welcome to Choutuppal App!'` (because `initial_message` was never returned by the API) and hardcodes a green badge: `welcome_menu bound`. If an external WhatsApp provider dispatch is invoked with `template_slug === 'welcome_menu'`, Meta's pre-approved static `welcome_menu` template is sent, completely overwriting the custom Telugu text intended by the admin.
4. **Disconnected 1-Node Islands vs. Connected Flow Graph:**  
   In `sample_flows.csv`, the 39 rows represent a connected conversational decision tree (e.g., Row 2 "Welcome Flow" has button `Next`; Row 3 "Welcome Step 2" has trigger `Next` with buttons `ప్రభుత్వ సేవలు`, `వ్యాపారాలు_నిపుణులు`, `మార్కెట్ప్లేస్_రియల్_ఎస్టేట్`; Rows 4, 9, 12 match those button labels). However, `parse-flow-csv.ts` treated every single row as an isolated flow, generating dummy dead-end button nodes that replied with hardcoded generic text (`ధన్యవాదాలు! మీరు "..." ఎంచుకున్నారు. వివరాలు త్వరలో రానున్నాయి.`).

---

## 2. In-Depth Audit Findings by Investigation Point

### 2.1 Storage of `initial_message`
* **Finding:** **FAILED (Data Loss)**
* **Evidence:** In `src/app/api/crm/flows/route.ts`:
  ```typescript
  const flow: CRMFlowConfig = {
    id: f.id || `flow_${Date.now()}_...`,
    name: f.name,
    triggerKeyword: (f.trigger_keywords?.[0] || 'FLOW').toUpperCase(),
    isActive: true,
    description: f.description || f.initial_message || '',
    type: 'LISTINGS_WITH_PHOTOS',
    sendPhotos: Boolean(f.imageUrl),
    ...
  }
  ```
  `CRMFlowConfig` (defined in `src/lib/types.ts` line 268) has no `initial_message`, `messageBody`, or `nodes` property. The custom text is lost upon saving.

### 2.2 `template_slug` Precedence & Conflict
* **Finding:** **FAILED (Ambiguity & Silent Hijacking)**
* **Evidence:** `sample_flows.csv` specifies both custom Telugu text in `initial_message` AND `template_slug: "welcome_menu"`. The system lacks a precedence rule defining whether Meta template dispatch or custom free-form interactive session messaging should take precedence. When Meta Cloud API requires a 24-hour window re-engagement, templates are mandatory; inside a 24-hour customer session, custom interactive button/list messages are permitted. Without explicit precedence, templates clobber custom bodies.

### 2.3 Webhook Runtime Execution Path
* **Finding:** **FAILED (Complete Absence of Flow Execution)**
* **Evidence:** In `src/app/api/whatsapp/webhook/route.ts`:
  - `store.flows` is never evaluated.
  - The webhook handles 10 static keyword branches hardcoded in code (lines 180–424).
  - An imported flow with keywords like `"ఉద్యోగాలు"` (Jobs) or `"అద్దెలు"` (Rentals) does nothing; the webhook falls through to line 442: `NextResponse.json(withShadow({ status: 'processed_ok' }))`.

### 2.4 Button IDs & Next-Node Transitions
* **Finding:** **FAILED (Dead-End Dummy Nodes)**
* **Evidence:** In `src/lib/parse-flow-csv.ts`:
  ```typescript
  buttons.forEach((btn, idx) => {
    nodes.push({
      node_key: btn.next_node_key,
      node_type: 'send_message',
      config: {
        text: `ధన్యవాదాలు! మీరు "${btn.title}" ఎంచుకున్నారు. వివరాలు త్వరలో రానున్నాయి.\n\n🌐 https://choutuppal.in`,
        next_node_key: 'end_terminal',
      },
    })
  })
  ```
  The buttons never route to the subsequent rows of the conversational tree.

### 2.5 Stability of Flow IDs and Node IDs
* **Finding:** **FAILED (Non-Deterministic Random IDs)**
* **Evidence:** `parse-flow-csv.ts` line 101 generates `flow_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`. Re-importing `sample_flows.csv` generates 39 new IDs on every click, creating duplicate records and corrupting any external references.

### 2.6 Media & Website Listing References
* **Finding:** **FAILED (Dropped at Ingestion)**
* **Evidence:** While `parse-flow-csv.ts` attempted regex extraction of image URLs, `CRMFlowConfig` only stored `sendPhotos: boolean`. `mediaUrl`, `mediaType`, `listingId`, and `coverImage` were discarded. Listing variable interpolation (`{{listing.name}}`, `{{listing.phone}}`) was non-existent.

### 2.7 Overlapping Keyword Resolution & Determinism
* **Finding:** **FAILED (No Deterministic Evaluator)**
* **Evidence:** `CRMFlowConfig` stores only a single uppercase string `triggerKeyword`. Array triggers like `["Hi", "Hello", "నమస్కారం", "Menu"]` were collapsed into just `"HI"`. There was no longest-match, exact-match, or territory-scoped priority arbiter.

### 2.8 Flow Activation Safety
* **Finding:** **FAILED (Unsafe Auto-Activation)**
* **Evidence:** In `src/app/api/crm/flows/route.ts` line 28, imported flows were saved with `isActive: true`. This violates our core safety mandate: imported assets must default to `draft` or `inactive` status until explicitly published by an administrator.

---

## 3. Existing Inventory Review

| Component / File | Current Role | Current Defect | Required Phase 2–8 Remediation |
| :--- | :--- | :--- | :--- |
| [`src/lib/types.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/types.ts) | Exports `CRMFlowConfig` | Lacks node graph, message bodies, triggers, media, and listing references | Upgrade to Canonical `WhatsAppFlow` model with full node graph |
| [`src/lib/parse-flow-csv.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/parse-flow-csv.ts) | Parses legacy flow CSV | Generates dead-end nodes, random IDs, drops templates | Upgrade to deterministic multi-node parser with backward compatibility |
| [`src/app/api/crm/flows/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/crm/flows/route.ts) | CRUD & batch import API | Drops initial message, nodes, templates, forces active | Implement authenticated, territory-scoped flow CRUD & dry-run preview |
| [`src/app/crm/flows/page.tsx`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/crm/flows/page.tsx) | Flow listing & cards | Read-only cards, hardcoded fallback text and template badge | Build full visual flow builder & node editor with live preview |
| [`src/app/admin/crm-flows/page.tsx`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/admin/crm-flows/page.tsx) | Legacy simulator | Only simulates hardcoded category browser | Connect to unified flow simulator and canonical flow state |
| [`src/app/api/whatsapp/webhook/route.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/app/api/whatsapp/webhook/route.ts) | Webhook inbound router | Completely ignores `store.flows`, uses 10 hardcoded branches | Integrate deterministic flow engine evaluator with shadow-mode safety |
| [`src/lib/whatsapp-cloud-api.ts`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/src/lib/whatsapp-cloud-api.ts) | Outbound WhatsApp API | Only formats `sendListingWhatsAppCard` | Add interactive buttons, list sections, and custom flow message builder |

---

## 4. Architectural Remediation Blueprint

To fix the root causes permanently without creating a disconnected second engine, we will execute the following plan:

```
[ sample_flows.csv (Legacy or Extended) ]
                   │
                   ▼
       [ parseFlowCsvContent ] (Deterministic IDs, Unicode, Graph Builder)
                   │
                   ▼
     [ Canonical WhatsAppFlow Model ] ◄──► [ Admin Visual Flow Builder (/crm/flows) ]
                   │
                   ▼
         [ data/admin_data.json ] (store.flows - draft/published lifecycle)
                   │
                   ▼
  [ Inbound WhatsApp Webhook ] ──► [ Flow Runtime Evaluator (evaluateFlows) ]
                                                │
       ┌────────────────────────────────────────┴────────────────────────────────────────┐
       ▼                                                                                 ▼
[ Shadow/Dry-Run Mode ]                                                          [ Live Dispatch Mode ]
(Diagnostic trace, zero dispatches)                                            (When explicitly authorized)
```

### Key Principles for Implementation:
1. **Canonical Flow Model:** Both visual builder and CSV importer will output and consume the exact same `WhatsAppFlow` structure with explicit `nodes: FlowNode[]`.
2. **Stable Deterministic IDs:** Flow IDs will be generated deterministically (e.g. `flow_welcome_day1`, `flow_govt_gate`, `flow_rentals_hub`) so re-imports are 100% idempotent.
3. **Template vs. Custom Message Precedence:**
   - If a flow specifies `messageBody` / `initial_message`, that custom text is **always preserved and rendered**.
   - `template_slug` is strictly optional and only invoked when configured by the admin as an explicit template dispatch node.
4. **Next-Node Graph Linking:** Multi-row CSV imports will be linked into a coherent conversational graph by matching button replies to subsequent trigger nodes.
5. **Sandbox Isolation:** Inbound webhook integration will default to non-dispatching shadow diagnostics until explicitly authorized for live rollout.

---

**Audit Completed:** Ready to proceed to **Phase 2 — Canonical Flow Data Model**.
