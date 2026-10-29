# Project Inventory & Technical Baseline

**Target Project**: Mana Choutuppal.in Multi-Town Franchise CRM & SuperApp Platform  
**Directory**: `/data/user/0/com.termux/files/home/storage/downloads/Cpl Crm/choutuppal-franchise-crm`  
**Inspection Date**: October 2026  
**Auditor**: Senior Software Architect & QA Specialist  
**Git Commit**: `c1917fd` (Branch: `master`, working tree 100% clean)

---

## 1. Runtime, Framework & Tooling

| Component | Detected Version / Details | Status |
| :--- | :--- | :--- |
| **Node.js Runtime** | `v26.4.0` (Active on Linux Termux) | Verified |
| **Python Runtime** | `3.12+` (Used for headless integration & security test suites) | Verified |
| **Package Manager** | `pnpm` v12.9.0 (npm compatible) | Configured |
| **Core Framework** | Next.js 15.1.0 (App Router, Server & Client Components) | Active |
| **UI Library** | React 19.0.0, Tailwind CSS 3.4.17, Radix UI Primitives | Active |
| **Icons & Styling** | Lucide React 0.475.0, Tailwind Merge, Sonner Toast | Active |
| **Database SDK** | `@supabase/supabase-js` 2.49.1, `@supabase/ssr` 0.5.2 | Installed (Unconnected) |
| **Object Storage SDK** | `@aws-sdk/client-s3` 3.750.0, `@aws-sdk/s3-request-presigner` 3.750.0 | Installed |

### Build & Execution Scripts (`package.json`)
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

---

## 2. Directory & Source Code Structure

```
choutuppal-franchise-crm/
├── .env.example                    # Template environment variables
├── .env.local                      # Local environment configuration
├── .gitignore                      # Security-hardened git ignore
├── csv/                            # CSV assets for CRM flow & automation imports
│   ├── sample_automations.csv      # Sample keyword automation triggers
│   └── sample_flows.csv            # Sample WhatsApp chatbot decision trees
├── data/
│   └── admin_data.json             # Active runtime data store (571 KB, 211 listings)
├── package.json                    # Project dependencies and metadata
├── project-discovery/              # Comprehensive audit & discovery reports
├── public/                         # Static public web assets
├── security-audit/                 # Security audit, RLS policies & test logs
├── src/
│   ├── app/                        # Next.js App Router (Pages & API endpoints)
│   ├── components/                 # React UI components (Admin, CRM, Home, Shared)
│   ├── hooks/                      # Custom React hooks (realtime, toast, mobile)
│   ├── lib/                        # Core backend logic, stores, crypto, auth, storage
│   └── middleware.ts               # Edge authentication guard for /admin and /crm
├── supabase/                       # PostgreSQL database architecture & RLS
│   ├── migrations/                 # Migration files
│   └── schema.sql                  # Comprehensive PostgreSQL 15+ schema with RLS
├── test_franchise_platform.py      # Automated 16-check franchise platform test suite
└── test_security_audit.py          # Automated 37-check security & isolation test suite
```

---

## 3. Pages & Routing Architecture

### Public Website Routes (`src/app/`)
| Path | Component | Data Source | Implemented State |
| :--- | :--- | :--- | :--- |
| `/` | `src/app/page.tsx` | `src/lib/home-data.ts` (`loadStore()`) | **IMPLEMENTED & VERIFIED** |
| `/town/[slug]` | `src/app/town/[slug]/page.tsx` | `store.territories`, `store.listings` | **IMPLEMENTED & VERIFIED** |
| `/business/[slug]` | `src/app/business/[slug]/page.tsx` | `store.listings` | **IMPLEMENTED & VERIFIED** |
| `/listings` | `src/app/listings/page.tsx` | `store.listings` (category/village filter) | **IMPLEMENTED & VERIFIED** |
| `/real-estate` | `src/app/real-estate/page.tsx` | `store.listings` (`REAL_ESTATE` type) | **IMPLEMENTED & VERIFIED** |
| `/services` | `src/app/services/page.tsx` | `store.listings` (`SERVICE` type) | **IMPLEMENTED & VERIFIED** |
| `/shorts` | `src/app/shorts/page.tsx` | `/api/admin/dashboard` & local state | **PARTIALLY IMPLEMENTED** |
| `/news` | `src/app/news/page.tsx` | `store.news` | **IMPLEMENTED BUT NOT VERIFIED** |
| `/news/[slug]` | `src/app/news/[slug]/page.tsx` | `store.news` | **IMPLEMENTED BUT NOT VERIFIED** |
| `/about`, `/community` | `src/app/about/page.tsx`, `community/page.tsx` | Static content | **IMPLEMENTED & VERIFIED** |
| `/terms`, `/privacy`, `/cookies`| Legal pages | Static content | **IMPLEMENTED & VERIFIED** |

### Authentication Routes
| Path | Component | Backend Handler | Implemented State |
| :--- | :--- | :--- | :--- |
| `/login` | `src/app/login/page.tsx` | `/api/auth/magic-link` & Supabase Auth check | **IMPLEMENTED & VERIFIED** |
| `/register` | `src/app/register/page.tsx` | Supabase Auth fallback | **PARTIALLY IMPLEMENTED** |

### Super Admin Dashboard (`src/app/admin/`)
| Path | Component | Data / API Source | Implemented State |
| :--- | :--- | :--- | :--- |
| `/admin` | `src/app/admin/page.tsx` | Redirects to `/admin/dashboard` | **IMPLEMENTED & VERIFIED** |
| `/admin/dashboard` | `src/app/admin/dashboard/page.tsx` | `/api/admin/dashboard` | **IMPLEMENTED & VERIFIED** |
| `/admin/franchise` | `src/app/admin/franchise/page.tsx` | `/api/admin/franchises` | **IMPLEMENTED & VERIFIED** |
| `/admin/listings` | `src/app/admin/listings/page.tsx` | `/api/admin/listings` | **IMPLEMENTED & VERIFIED** |
| `/admin/approvals` | `src/app/admin/approvals/page.tsx` | `/api/admin/approvals` | **IMPLEMENTED & VERIFIED** |
| `/admin/contacts` | `src/app/admin/contacts/page.tsx` | `/api/crm/contacts` | **IMPLEMENTED & VERIFIED** |
| `/admin/crm-flows` | `src/app/admin/crm-flows/page.tsx` | `/api/crm/flows` | **IMPLEMENTED & VERIFIED** |
| `/admin/banners` | `src/app/admin/banners/page.tsx` | Local `useState` (Not wired to API) | **UI ONLY / MOCK DATA** |
| `/admin/ticker` | `src/app/admin/ticker/page.tsx` | Local `useState` (Not wired to API) | **UI ONLY / MOCK DATA** |
| `/admin/news` | `src/app/admin/news/page.tsx` | Local `useState` (Not wired to API) | **UI ONLY / MOCK DATA** |
| `/admin/stories-offers` | `src/app/admin/stories-offers/page.tsx` | Local `useState` (Not wired to API) | **UI ONLY / MOCK DATA** |
| `/admin/shorts` | `src/app/admin/shorts/page.tsx` | Local `useState` (Not wired to API) | **UI ONLY / MOCK DATA** |
| `/admin/inbox` | `src/app/admin/inbox/page.tsx` | Local `useState` (Not wired to API) | **UI ONLY / MOCK DATA** |
| `/admin/broadcasts` | `src/app/admin/broadcasts/page.tsx` | Local `setTimeout` simulation | **UI ONLY / MOCK DATA** |
| `/admin/pipelines` | `src/app/admin/pipelines/page.tsx` | Local `useState` Kanban | **UI ONLY / MOCK DATA** |
| `/admin/settings` | `src/app/admin/settings/page.tsx` | Local `useState` (No API endpoint) | **UI ONLY / MOCK DATA** |

### Franchise CRM Dashboard (`src/app/crm/`)
| Path | Component | Data / API Source | Implemented State |
| :--- | :--- | :--- | :--- |
| `/crm` | `src/app/crm/page.tsx` | Redirects to `/crm/dashboard` | **IMPLEMENTED & VERIFIED** |
| `/crm/dashboard` | `src/app/crm/dashboard/page.tsx` | Territory-filtered dashboard | **IMPLEMENTED & VERIFIED** |
| `/crm/contacts` | `src/app/crm/contacts/page.tsx` | `/api/crm/contacts` | **IMPLEMENTED & VERIFIED** |
| `/crm/flows` | `src/app/crm/flows/page.tsx` | `/api/crm/flows` | **IMPLEMENTED & VERIFIED** |
| `/crm/automations` | `src/app/crm/automations/page.tsx` | `/csv/sample_automations.csv` (Client) | **PARTIALLY IMPLEMENTED** |
| `/crm/inbox` | `src/app/crm/inbox/page.tsx` | Local `useState` | **UI ONLY / MOCK DATA** |
| `/crm/broadcasts` | `src/app/crm/broadcasts/page.tsx` | Local `useState` | **UI ONLY / MOCK DATA** |
| `/crm/pipelines` | `src/app/crm/pipelines/page.tsx` | Local `useState` | **UI ONLY / MOCK DATA** |

---

## 4. API Endpoints Inventory (`src/app/api/`)

| Endpoint | Methods | Auth Guard | Data Source | Primary Role |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/magic-link` | `GET`, `POST` | Public / Rate-limited | `store.magicTokens` | Generates 256-bit CSPRNG tokens, redeems hashes, sets HTTP-only session cookie. |
| `/api/admin/franchises` | `GET`, `POST` | `requireSuperAdmin` on mutations | `store.franchises`, `store.territories` | Onboards franchises, activates/suspends, updates plan quotas, writes audit logs. |
| `/api/admin/listings` | `GET`, `POST`, `PUT`, `DELETE` | `requireAuth` + `requireTerritoryAccess` | `store.listings` | CRUD operations for listings with photo rows and territory sanitization. |
| `/api/admin/approvals` | `GET`, `POST` | `requireAuth` + territory scoping | `store.approvals`, `store.listings` | Moderates new listings, shorts, and franchise applications. |
| `/api/admin/dashboard` | `GET` | Public / Internal | `store` | Aggregates platform statistics and recent records. |
| `/api/admin/content` | `GET`, `POST` | None | `store.banners`, `tickers`, `news` | Content CRUD endpoint (built, but not yet wired to UI pages). |
| `/api/crm/contacts` | `GET`, `POST`, `PUT`, `DELETE` | `requireAuth` + territory scoping | `store.contacts` | Manages merchant and lead contacts with territory isolation. |
| `/api/crm/flows` | `GET`, `POST` | Public / Internal | `store.flows` | Manages WhatsApp decision trees and supports CSV batch import. |
| `/api/crm/automations` | `GET` | Public | `/csv/sample_automations.csv` | Reads automation rules from CSV. |
| `/api/whatsapp/webhook` | `GET`, `POST` | Meta `X-Hub-Signature-256` HMAC | `store.messages`, `store.listings` | Verifies Meta webhook; responds to Telugu keywords, vendor claim, and magic link. |
| `/api/whatsapp/send` | `POST` | `requireAuth` + E.164 validation | `src/lib/whatsapp-cloud-api.ts` | Dispatches outbound rich WhatsApp listing media cards. |
| `/api/upload/r2` | `POST` | `requireAuth` + MIME allowlist | `src/lib/r2-storage.ts` | Presigned Cloudflare R2 upload URLs with local fallback. |
| `/api/shorts/submit` | `POST` | Public / URL validation | `store.approvals` | Submits community shorts into approval moderation queue. |

---

## 5. Middleware & Edge Security (`src/middleware.ts`)

- **Matching Patterns**: `/admin/:path*`, `/crm/:path*`.
- **Enforcement**: Checks for signed `session_token` cookie.
- **Handling**: Unauthenticated requests are intercepted and redirected to `/login?redirect=<target_path>`. Expired sessions trigger cookie deletion and redirect with `?error=session_expired`.

---

## 6. Git Status & Repository Baseline

- **Current Branch**: `master`
- **Head Commit**: `c1917fd` (*chore: update local test audit logs and state in admin_data.json*)
- **Working Tree**: Completely clean, zero untracked or unstaged files.
- **Files Tracked in Git**: 32 source code & configuration files.
