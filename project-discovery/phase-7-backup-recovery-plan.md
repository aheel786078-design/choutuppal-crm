# Phase 7 Backup, Recovery & Data Integrity Architecture Plan
**Choutuppal Franchise CRM | Disaster Recovery & Data Protection**

**Date:** October 28, 2026  
**Author:** Senior Reliability Engineer, Data Integrity Specialist & Next.js Architect  
**Project:** Choutuppal Franchise CRM (`choutuppal-franchise-crm`)  
**Data Store Target:** `data/admin_data.json`  
**Backup Directory Target:** `data/backups/` (Private directory, outside `public/` web server root)

---

## 1. Problem Statement & Operational Context

The Choutuppal Franchise CRM platform currently persists all business state (listings, CRM contacts, deals, bot flows, franchises, territories, settings, and audit logs) into a single local JSON document: `data/admin_data.json`.

In the Termux on Android environment, two distinct storage contexts coexist:
1. **Android Shared Storage (`/storage/emulated/0/Download/...`):**
   - Mounted via FUSE / SDCardFS.
   - Lacks true POSIX permission enforcement (fixed `root:everybody` ownership).
   - High latency file locking and lack of atomic multi-process guarantees.
2. **Termux Native ext4 (`/data/user/0/com.termux/files/home/...`):**
   - Native Linux ext4 filesystem with full POSIX permissions, atomic `rename(2)` guarantees within the same mount, and standard user ownership (`u0_a242`).

### Core Failure Modes & Risks:
- **Catastrophic Truncation:** If a process crashes or runs out of battery during write serialization, direct file writes can produce 0-byte or truncated JSON files.
- **Silent Corruption:** Unnoticed syntax errors or missing required entity keys in the JSON tree rendering the CRM unbootable.
- **Lack of Verification:** Backups that are copied without checksum verification or structural parsing cannot be trusted during an outage.
- **Accidental Overwrites:** Blind backup scripts overwriting earlier backups or restoring over live data without safety gates.

---

## 2. Core Design Principles

1. **Strict Non-Destructive Invariant:**
   - The authoritative production store (`data/admin_data.json`) must never be modified, overwritten, or reseeded during backup or testing operations.
2. **Deterministic Cryptographic Verification:**
   - Every backup operation computes the SHA-256 hash of the source data, writes to an atomic temporary file, and verifies that the destination SHA-256 matches byte-for-byte.
3. **Double-Pass Structural Validation:**
   - After creation, the backup file is re-read and parsed with `JSON.parse` to confirm valid JSON syntax, and checked against top-level entity invariants (`listings`, `territories`, `contacts`, `auditLogs`).
4. **Metadata Manifest Isolation:**
   - Every backup is accompanied by a companion manifest (`*.manifest.json`) containing technical metadata (timestamp, file size, SHA-256, entity counts, validation status).
   - **Zero PII Leakage:** The manifest strictly omits contact names, phone numbers, customer messages, credentials, or listing details.
5. **Collision Prevention & Immutability:**
   - Backups use millisecond-precision timestamps plus hash prefixes (`admin_data_YYYYMMDD_HHMMSS_<sha8>.json`).
   - If a target backup file already exists, the script halts with an error rather than overwriting it.
6. **Isolated Synthetic Recovery Testing:**
   - Recovery and restoration procedures are verified strictly using isolated temporary directories (`/tmp/...`) and synthetic test fixtures. Live business records are never touched during recovery tests.

---

## 3. Backup Workflow Architecture

```
 live store: data/admin_data.json
             │
             ▼
    [1. Pre-Read Validation] ──► Parse JSON & check invariants
             │
             ▼
    [2. Compute Source SHA-256]
             │
             ▼
    [3. Write to Temp File] ──► data/backups/.tmp_<timestamp>_<sha8>.json
             │
             ▼
    [4. Verify Temp SHA-256] ──► Match source SHA-256?
             │
             ▼
    [5. Atomic Rename] ──► data/backups/admin_data_<timestamp>_<sha8>.json
             │
             ▼
    [6. Post-Write Validation] ──► Re-parse destination JSON & count entities
             │
             ▼
    [7. Write Manifest] ──► data/backups/admin_data_<timestamp>_<sha8>.manifest.json
             │
             ▼
       Exit Code 0 (Success)
```

### 3.1 Naming & Path Specification
- **Live Data:** `data/admin_data.json`
- **Backup Folder:** `data/backups/`
- **Backup File Format:** `admin_data_YYYYMMDD_HHMMSS_<sha_prefix>.json`
- **Manifest Format:** `admin_data_YYYYMMDD_HHMMSS_<sha_prefix>.manifest.json`
- **Security Scope:** Neither `data/` nor `data/backups/` is inside `public/`. Next.js static asset routing ignores this directory, preventing public web exposure.

### 3.2 Manifest Schema
```json
{
  "manifestVersion": "1.0",
  "backupFile": "admin_data_20261028_163000_d6a6e8ba.json",
  "sourceFile": "data/admin_data.json",
  "timestamp": "2026-10-28T11:00:00.000Z",
  "sourceSha256": "d6a6e8bafe75cff95fdf2b15f671963b163bc5193c9aeea96cb41c66ced4d04f",
  "backupSha256": "d6a6e8bafe75cff95fdf2b15f671963b163bc5193c9aeea96cb41c66ced4d04f",
  "fileSizeBytes": 535284,
  "isValidJson": true,
  "validationStatus": "VERIFIED",
  "entityCounts": {
    "listings": 212,
    "contacts": 211,
    "deals": 4,
    "automations": 179,
    "franchises": 3,
    "territories": 4,
    "auditLogs": 110,
    "magicTokens": 38,
    "franchiseStaff": 0,
    "governmentContacts": 0
  }
}
```

---

## 4. Safe Recovery Workflow & Human Verification Steps

Restoring business data is an emergency administrative operation. To prevent accidental data loss:
1. **Source & Destination Clarity:** Any recovery command must explicitly name the backup source file and the destination path.
2. **Pre-Restoration Safety Snapshot:** Before overwriting any live target, a safety snapshot of the current state must be created automatically.
3. **Non-Destructive Dry Run:** A `--verify-only` mode checks backup syntax and checksum without copying.
4. **Manual Human Approval Gate:** Production restoration must never be triggered silently by automated background jobs.

### Step-by-Step Human Recovery Protocol:
1. **Step 1 — Verify Backup Health:**
   ```bash
   node scripts/backup-manager.mjs verify data/backups/admin_data_20261028_163000_d6a6e8ba.json
   ```
2. **Step 2 — Inspect Manifest & Record Counts:**
   Confirm that `isValidJson: true`, `validationStatus: "VERIFIED"`, and entity counts match expectations.
3. **Step 3 — Execute Restoration (Explicit Target):**
   ```bash
   node scripts/backup-manager.mjs restore data/backups/admin_data_20261028_163000_d6a6e8ba.json --target=data/admin_data.json
   ```
4. **Step 4 — Verify Restored SHA-256:**
   Verify that `sha256sum data/admin_data.json` matches the manifest checksum.

---

## 5. Store Write Hardening & Concurrency Protection

### Current Implementation in `src/lib/store.ts`:
- `saveStore` writes to `${DATA_FILE}.tmp.${Date.now()}...` and calls `fs.renameSync(tempFile, DATA_FILE)`.
- If an exception occurs during `writeFileSync`, it removes the temp file and rethrows.

### Required Hardening Improvements:
1. **Pre-Rename File Validation:** Verify that `fs.statSync(tempFile).size > 0` before renaming to prevent replacing live data with a truncated/empty file if the process ran out of disk space during `JSON.stringify`.
2. **In-Process Mutex / Serialization:** Introduce an in-memory sequential promise chain for writes within the active Node.js server process, preventing concurrent async mutations from interleaving.

---

## 6. Implementation & Verification Roadmap

1. **Step 1:** Implement standalone CLI backup and recovery manager [`scripts/backup-manager.mjs`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/scripts/backup-manager.mjs) using standard Node.js built-ins (`fs`, `path`, `crypto`).
2. **Step 2:** Harden `saveStore` in `src/lib/store.ts` with pre-rename size check.
3. **Step 3:** Implement comprehensive test suite [`test_phase7_backup_recovery.py`](file:///data/user/0/com.termux/files/home/storage/downloads/Cpl%20Crm/choutuppal-franchise-crm/test_phase7_backup_recovery.py) covering all 12 recovery scenarios using synthetic fixtures in isolated temporary directories.
4. **Step 4:** Execute backup of current live store to `data/backups/` and verify checksum invariance.
5. **Step 5:** Run full regression suite, TypeScript checks, and Next.js production build in ext4 workspace.
6. **Step 6:** Document all results in `project-discovery/phase-7-backup-recovery-implementation-report.md`.
