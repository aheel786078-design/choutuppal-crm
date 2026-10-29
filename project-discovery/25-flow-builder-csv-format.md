# Flow Builder CSV Format & Graph Runtime Specification

## 1. Overview
The Choutuppal Franchise CRM WhatsApp Flow Automation system provides a unified canonical flow format shared by:
1. **CSV Bulk Importer** (supports both the 39-row `sample_flows.csv` format and extended schemas)
2. **Admin Visual Flow Builder** (`src/app/crm/flows/page.tsx`)
3. **Flow Runtime Evaluator** (`src/lib/flow-runtime-engine.ts`)
4. **WhatsApp Dispatch Pipeline** (`src/lib/whatsapp-cloud-api.ts` & `src/app/api/whatsapp/webhook/route.ts`)

---

## 2. CSV Specification & Column Mapping

The system supports standard CSV files with commas (`,`) as delimiters, double-quoted multiline fields (`"..."`), and escaped quotes (`""`).

### Supported Columns

| Column Name | Required | Type | Description | Example |
|---|---|---|---|---|
| `name` | **Yes** | String | Flow display name and deterministic ID seed | `Welcome Step 2` |
| `trigger_type` | **Yes** | String | `keyword`, `first_inbound_message`, `manual` | `keyword` |
| `trigger_keywords` | No | String | Comma or semicolon separated list of trigger phrases | `Hi, hi, Hello, నమస్కారం, menu` |
| `initial_message` | No | String (Multiline) | Full conversational text with Telugu Unicode characters | `నమస్కారం! చౌటుప్పల్ యాప్ కి స్వాగతం...` |
| `button_options` | No | String | Semicolon or pipe separated button labels (up to 3 for quick-reply buttons, 4-10 for interactive list) | `ప్రభుత్వ సేవలు;వ్యాపారాలు_నిపుణులు;మార్కెట్ప్లేస్_రియల్_ఎస్టేట్` |
| `template_slug` | No | String | Optional Meta WhatsApp template identifier. *Custom message text always takes precedence unless explicitly configured.* | `welcome_menu` |
| `description` | No | String | Internal notes or workflow purpose | `Main onboarding menu` |
| `image_url` | No | URL | Optional hero/banner image URL (also auto-detected from message text if matching `.jpg/.png/.webp`) | `https://images.unsplash.com/...` |
| `status` | No | String | `draft`, `published`, `paused`, `archived`. **Defaults to `draft` for safety.** | `draft` |
| `territory_id` | No | String | Scoped territory ID or global | `territory_choutuppal` |

---

## 3. Conversational Graph Auto-Linking

When importing multi-row CSV datasets (e.g., the 39 rows in `sample_flows.csv`), the parser automatically builds an internal keyword-to-flow index:
- If Row A defines a button with label `ప్రభుత్వ సేవలు`
- And Row B specifies `trigger_keywords` containing `ప్రభుత్వ సేవలు`
- The parser automatically creates an action node linking Button 1 of Row A directly to Row B's entry node (`goto_flow_forced_gate_govt`).
- If no matching row exists, it generates a polite acknowledgment node routing to `end_terminal`.

This transforms isolated rows into an unbroken conversational tree without requiring administrators to manually draw wireframe connections between 39 individual nodes.

---

## 4. WhatsApp Cloud API Constraints Enforced

1. **Button Limits**:
   - Meta WhatsApp Cloud API permits a maximum of **3 quick-reply buttons** per interactive message.
   - If a flow defines 1 to 3 options, the parser produces a `send_buttons` interactive message.
   - If a flow defines 4 to 10 options, the parser produces an interactive `send_list` message with sections and rows.
2. **Character Limits**:
   - Quick-reply button titles: maximum 20 characters.
   - List row titles: maximum 24 characters.
   - Body text: maximum 1024 characters for interactive messages, 4096 for plain text.
3. **Telugu Unicode Handling**:
   - Multiline quoted Telugu text is preserved byte-for-byte in UTF-8.
   - Escaped `\n` literals and real linebreaks are normalized without corrupting Telugu vowel marks (matras) or conjuncts.

---

## 5. Dynamic Variable Interpolation Tokens

Both manual flows and CSV-imported message bodies can use dynamic templating tokens that are interpolated at runtime:

| Variable Token | Resolved Value | Fallback |
|---|---|---|
| `{{contact.name}}` | Sender's display name | `మిత్రమా` / `Customer` |
| `{{contact.phone}}` | Sender's clean phone number | `98480xxxxx` |
| `{{town.name}}` / `{{territory.name}}` | Current territory town name | `Choutuppal` |
| `{{town.url}}` | Territory public domain URL | `https://choutuppal.in` |
| `{{town.phone}}` | Franchise admin contact phone | `9441348175` |
| `{{listing.title}}` / `{{listing.name}}` | Attached listing business name | Target listing title |
| `{{listing.phone}}` | Listing contact telephone | Listing phone |
| `{{listing.address}}` | Listing locality/address | Listing address |
| `{{listing.url}}` | Public listing detail URL | `https://choutuppal.in/business/...` |
| `{{listing.cover_image}}` | Listing high-res photo URL | Hero image URL |

---

## 6. Safe Import & Preflight Validation
- **Dry-Run Preview**: Sending `POST /api/crm/flows` with `{ dryRun: true, flows: [...] }` validates syntax, counts candidate flows, checks node integrity, and returns a summary without writing to `data/admin_data.json`.
- **Draft Status Default**: Newly imported flows default to `status: 'draft'`, preventing accidental live webhook hijacking.
- **Deterministic IDs**: Slugified flow IDs (e.g., `flow_welcome_flow`) prevent duplicate flow generation upon re-importing the same CSV.
