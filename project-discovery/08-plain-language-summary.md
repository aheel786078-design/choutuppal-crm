# Plain-Language System Summary & Architecture Guide

**Project**: Mana Choutuppal.in Multi-Town Franchise CRM & SuperApp Platform  
**Directory**: `/data/user/0/com.termux/files/home/storage/downloads/Cpl Crm/choutuppal-franchise-crm`  
**Target Audience**: Non-technical stakeholders, Product Owners, Business Directors & Developers  
**Current Status**: Complete Local Discovery & Security Hardened • Ready for Supabase Setup  

---

## 1. What is Choutuppal Franchise CRM in Simple Terms?

**Mana Choutuppal.in** started as a hyperlocal website and WhatsApp service for Choutuppal town (Yadadri Bhuvanagiri district, Telangana). It allows citizens to find local shops, taxi drivers, plumbers, electricians, emergency services, and real estate open plots directly through a website or a WhatsApp bot.

This project transforms that single-town app into a **multi-town franchise business system**:
1. **Choutuppal.in** remains the company-owned **Flagship** territory (the parent headquarters). It is protected and can never be deleted or turned off.
2. The platform owner (**Super Admin**) can launch new town franchises (e.g. Suryapet, Bhongir, Nalgonda) in seconds.
3. Each local franchise partner gets their own **CRM dashboard**, their own **town website** (like `suryapet.in` or `choutuppal.in/town/suryapet`), and their own **local WhatsApp bot**.
4. **Data Isolation**: A franchise owner in Nalgonda can NEVER see, edit, or delete listings, leads, or customer contacts belonging to Suryapet or Choutuppal.
5. **No Password Login**: Franchise partners log in securely via single-use **WhatsApp Magic Links** sent straight to their phones.

---

## 2. Text-Based Architecture Diagram

```
                              ┌─────────────────────────────────────────────────┐
                              │            SUPER ADMIN (Headquarters)           │
                              │  Controls all towns, plans, quotas & approvals  │
                              └────────────────────────┬────────────────────────┘
                                                       │
                               ┌───────────────────────┴───────────────────────┐
                               │                                               │
                               ▼                                               ▼
               ┌───────────────────────────────┐               ┌───────────────────────────────┐
               │     FLAGSHIP CHOUTUPPAL       │               │   FRANCHISE PARTNERS (Towns)  │
               │   Company-Owned & Protected   │               │   Suryapet, Bhongir, Nalgonda │
               │   Domain: choutuppal.in       │               │   Domains: suryapet.in, etc.  │
               │   Listings: 211 businesses    │               │   Listings: Scoped by quota   │
               └───────────────┬───────────────┘               └───────────────┬───────────────┘
                               │                                               │
                               └───────────────────────┬───────────────────────┘
                                                       │
                                                       ▼
                              ┌─────────────────────────────────────────────────┐
                              │         NEXT.JS 15 APPLICATION LAYER            │
                              │  • Edge Middleware Route Protection             │
                              │  • Tri-Mode Domain & Territory Resolver         │
                              │  • Cryptographic HMAC-SHA256 Signed Sessions    │
                              │  • WhatsApp Webhook Bot with Telugu Responses   │
                              └────────────────────────┬────────────────────────┘
                                                       │
                               ┌───────────────────────┴───────────────────────┐
                               │                                               │
                               ▼                                               ▼
               ┌───────────────────────────────┐               ┌───────────────────────────────┐
               │    CURRENT LOCAL STORAGE      │               │     UPCOMING SUPABASE CLOUD   │
               │  • data/admin_data.json       │               │  • 11 PostgreSQL Tables       │
               │  • 571 KB single document     │  ──────────►  │  • Row Level Security (RLS)   │
               │  • Fast, 100% offline testing │   Migration   │  • Multi-user concurrency     │
               │  • Ephemeral on Vercel        │               │  • Persistent cloud storage   │
               └───────────────────────────────┘               └───────────────────────────────┘
```

---

## 3. High-Level Feature Comparison Table

| Feature | What it does | Current Implementation | Data Storage | Verified Status | Missing Items | Next Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Public Town Website** | Lets citizens search businesses, taxis, and plots by town. | Dynamic Next.js server components with search & category filters. | Reads `data/admin_data.json` | **IMPLEMENTED AND VERIFIED** | None | Switch to Supabase query when ready. |
| **Flagship Territory** | Protects Choutuppal as the company-owned flagship hub. | Code, API, and DB guards prevent suspension or deletion. | Stored in `admin_data.json` (211 listings) | **IMPLEMENTED AND VERIFIED** | None | Maintain protected flag during migration. |
| **Franchise Creation** | Super Admin launches new towns with domains & quotas. | `/admin/franchise` modal checks slug & domain collisions. | Writes to `franchises`, `territories`, `domains` | **IMPLEMENTED AND VERIFIED** | None | Ready for Supabase table insert. |
| **Franchise Lifecycle** | Suspends/activates franchises and syncs town visibility. | Status update modal with tamper-evident audit logging. | Updates `admin_data.json` | **IMPLEMENTED AND VERIFIED** | None | Auto-expiry cron job for expired plans. |
| **Plan Quotas** | Limits listings based on plan tier (STARTER: 200, ENT: 2500). | Checked before listing creation and in test harness. | Stored in franchise feature limits | **IMPLEMENTED AND VERIFIED** | Online payment gateway | Add Razorpay/Stripe if online billing needed. |
| **Business Listings** | Full listings management with photo row, zoom & gallery. | Table view with cover photos, lightbox modal, test WhatsApp card. | Reads/writes `store.listings` (211 records) | **IMPLEMENTED AND VERIFIED** | `syncListingToCrm` helper | Export `syncListingToCrm` in `store.ts`. |
| **Approval Workflow** | Queue for approving new listings, shorts, and franchise apps. | Moderation queue filters by town; approves & publishes items. | Writes to `store.approvals` and `listings` | **IMPLEMENTED AND VERIFIED** | Auto-WhatsApp notification | Send WhatsApp alert to owner on approval. |
| **WhatsApp Magic Login** | Passwordless 1-click login link sent via WhatsApp. | 256-bit CSPRNG token, SHA-256 hashed storage, single-use burn. | `store.magicTokens` in `admin_data.json` | **IMPLEMENTED AND VERIFIED** | Meta Cloud API keys | Add Meta tokens to deliver live WhatsApp SMS. |
| **WhatsApp Chatbot** | Replies in Telugu to citizen queries, bookings & vendor claims. | Meta HMAC-SHA256 verified webhook with Telugu response logic. | Writes messages to `store.messages` | **IMPLEMENTED AND VERIFIED** | Meta Cloud API keys | Add live access token for real WhatsApp sends. |
| **CRM Customer Leads** | Tracks merchant leads and inquiries without cross-town leak. | Scoped to caller's town; unauthenticated scraping blocked. | `store.contacts` in `admin_data.json` | **IMPLEMENTED AND VERIFIED** | CSV export button | Add download button for lead reports. |
| **CSV Flow Import** | Allows importing customized chatbot flows from `.csv` files. | `FlowImportModal` parses CSV and creates decision tree nodes. | Pushes to `store.flows` | **IMPLEMENTED AND VERIFIED** | None | Ready for production use. |
| **Content (Banners/News)** | Manages top banners, breaking news ticker, and articles. | Admin UI pages use local React state; API exists but is not wired. | Local component `useState` (Not saved to disk) | **UI ONLY / MOCK DATA** | API wiring | Connect `fetch('/api/admin/content')` in UI. |
| **Pipelines (Kanban)** | Visual deal pipeline for tracking local business sales. | Interactive drag/move Kanban board in UI. | Local component `useState` | **UI ONLY / MOCK DATA** | Backend API | Build `/api/crm/pipelines` endpoint. |
| **Shared WhatsApp Inbox**| Team inbox for chatting with merchants and customers. | Mock chat interface displaying sample conversation. | Local component `useState` | **UI ONLY / MOCK DATA** | Realtime chat sync | Connect to live WhatsApp messages table. |
| **Cloudflare R2 Upload**| Fast media upload for high-resolution listing photos. | API route validates MIME & size; returns fallback when keys missing.| Local fallback URL | **BLOCKED BY MISSING CONFIG**| Cloudflare R2 Keys | Enter Cloudflare R2 credentials. |

---

## 4. Workflows Explained Simply

### Super Admin Workflow
1. Super Admin logs in at `/login` with credentials or WhatsApp link.
2. Lands on `/admin/dashboard` showing network-wide stats (total listings: 211, active franchises, pending approvals).
3. Opens `/admin/franchise` -> clicks "Launch New Town Franchise".
4. Fills town details (e.g. Nalgonda, `nalgonda.in`, partner name and phone).
5. The system automatically creates the new town, generates the territory record, assigns the domain, sets up plan quotas, and logs an immutable audit entry.
6. If a partner doesn't pay, Super Admin clicks "Suspend", which immediately turns off the partner's access and displays a polite "Services Paused" message on the town site.

### Franchise Admin Workflow
1. The partner enters their phone number at `/login`.
2. A secure login link is generated and sent to their WhatsApp.
3. Partner clicks the link -> The system burns the single-use token, generates an encrypted session, and logs them in.
4. Partner lands on `/crm/dashboard` seeing only their town's numbers.
5. They can add and edit their local business listings, upload shop photos, and view customer leads.
6. They CANNOT view or edit any data from other towns.

### Public Customer Workflow
1. A citizen visits `choutuppal.in` or their local town site (e.g. `suryapet.in`).
2. They see featured shops, emergency taxis, plumbers, and real estate plots.
3. They click "WhatsApp Chat" or "Call Now".
4. A pre-filled WhatsApp message opens directly connecting the customer with the verified local merchant.

### WhatsApp Bot & Automation Workflow
1. A customer sends "Hi" or "Taxis" to the WhatsApp number.
2. The webhook verifies that the message genuinely came from Meta using cryptographic signatures.
3. The bot detects the town, finds matching active drivers or shops, and replies in Telugu with photos, addresses, and call buttons.
4. If a citizen types "Add my shop", the bot creates a pending approval item for the admin to verify before publishing.

---

## 5. Summary of Real vs. Mocked Features

### What is REAL and working right now:
- **Flagship Protection**: Choutuppal is 100% safeguarded with 211 active listings.
- **Franchise Creation & Lifecycle**: Creating, suspending, reactivating, and setting quotas for towns works and persists to disk.
- **Security & Authorization**: All admin routes are protected by cryptographic tokens; cross-town hacking (IDOR) is blocked.
- **Listing Management**: Viewing, editing, categorizing, and searching listings works.
- **WhatsApp Bot Logic**: Full Telugu conversation flows, vendor claim detection, and magic link generation are implemented.
- **CSV Import**: Custom chatbot flows import cleanly from spreadsheets.

### What is currently MOCKED (UI Only):
- **Admin Banners, Ticker, News, Shorts, Stories-Offers**: You can edit them on screen, but they are stored in temporary browser memory and disappear on page refresh.
- **Shared Inbox & Pipelines**: The chat screen and sales Kanban board are visual prototypes that need to be connected to database tables.
- **WhatsApp Broadcast Dispatch**: Clicking "Send Broadcast" shows a simulated success timer rather than delivering live messages.

---

## 6. Precise Requirements for Safe Supabase Connection

Before adding Supabase credentials to `.env.local` or Vercel:
1. **Create Supabase Project**: Set up a clean PostgreSQL instance on Supabase.
2. **Execute `supabase/schema.sql`**: Run the SQL script in the Supabase SQL editor to create all 11 tables and activate Row Level Security.
3. **Run One-Time Data Migration**: Run a script to copy the 211 listings, territories, domains, and contacts from `data/admin_data.json` into the remote Supabase database.
4. **Export Missing Function**: Add `syncListingToCrm` into `src/lib/store.ts`.
5. **Connect Database Adapter**: Update the API handlers to query Supabase tables.
6. **Set Environment Keys**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Server only)

---

## 7. Recommended Next Action

**Do not rush to deploy to Vercel or connect Supabase yet.**  
First, let me wire the disconnected Admin Content UI pages (Banners, News, Ticker) to their backend API and implement the missing `syncListingToCrm` function so that the application has zero local code gaps.

Once you review and approve this discovery report, we will execute the Supabase connection safely and systematically.
