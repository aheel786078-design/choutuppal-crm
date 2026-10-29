# Phase 8 Concurrency Review & Architecture Plan
**Choutuppal Franchise CRM | Safe Data Concurrency & Backup Resilience**

**Date:** October 28, 2026  
**Author:** Senior Reliability Engineer, Application Security Engineer & Next.js Architect  
**Authoritative Source Directory:** `/data/user/0/com.termux/files/home/storage/downloads/Cpl Crm/choutuppal-franchise-crm`  
**Linux ext4 Verification Workspace:** `/data/user/0/com.termux/files/home/projects/build-verify-crm`  
**Live Data Store Baseline SHA-256:** `d6a6e8bafe75cff95fdf2b15f671963b163bc5193c9aeea96cb41c66ced4d04f`

---

## 1. Executive Summary

Phase 8 investigates and resolves two fundamental resilience bottlenecks in the Choutuppal Franchise CRM:
1. **Data Mutation Concurrency:** The existing monolithic JSON storage model in `src/lib/store.ts` uses synchronous atomic writes (`fs.writeFileSync` to a temp file followed by `fs.renameSync`). While this reliably prevents partial-file writes and filesystem truncation, it does **not** protect against concurrent **read-modify-write** race conditions. If two HTTP requests concurrently execute `loadStore()` at time $T_0$, modify independent or identical records, and both invoke `saveStore()`, the second write will overwrite the first, resulting in silent data loss (lost updates).
2. **Backup Resilience & Storage Isolation on Android/Termux:** Backups currently reside in `data/backups/` within the shared Android download storage (`/storage/emulated/0/Download/Cpl Crm/choutuppal-franchise-crm/data/backups/`). This shared directory is co-located with live data, exposed to other Android apps with storage permission, and vulnerable to accidental deletion by phone cleaning tools or storage managers.

This document presents a comprehensive audit of all mutation patterns across the codebase and specifies an in-process serialized mutation queue (`mutateStore`) that encapsulates the complete read-modify-write lifecycle.

---

## 2. In-Depth Audit: `loadStore()` and `saveStore()` Callers

Across the application, `saveStore()` is called in **36 distinct locations** across 15 route handlers and library files.

### 2.1 The Classic Read-Modify-Write Race Condition
In every current mutation handler, the pattern follows three distinct stages:
1. **Read Stage:** `const store = loadStore()` reads and parses `data/admin_data.json` into an in-memory JavaScript object.
2. **Async / Mutation Stage:** The handler awaits authorization (`await requireAuth(req)`), parses request bodies (`await req.json()`), performs validation or duplicate checks, and modifies the in-memory array (`store.contacts.unshift(...)`, `store.listings[idx] = ...`).
3. **Write Stage:** `saveStore(store)` serializes and persists the in-memory object to disk.

#### The Failure Scenario (Lost Update)
```
Time   Request A (Update Listing #1)         Request B (Create Contact #2)
 |
 T0    storeA = loadStore() (Listings: 212)
 T1                                          storeB = loadStore() (Contacts: 211)
 T2    storeA.listings[0].price = 5000000
 T3                                          storeB.contacts.unshift(newContact)
 T4    saveStore(storeA) [Listings: 212]
 T5                                          saveStore(storeB) [Contacts: 212, Listings: OLD]
 v
Result: Request B overwrote disk with storeB. Request A's listing price change is PERMANENTLY LOST!
```

### 2.2 The Double-Mutation Hazard: `logAuditEvent` Interleaving
A subtle but prevalent race condition was identified in almost every route:
```typescript
// Example from src/app/api/admin/listings/route.ts
store.listings = store.listings.filter((l) => l.id !== id)
saveStore(store) // Mutation 1: Write listing deletion to disk

logAuditEvent({  // Mutation 2: logAuditEvent() independently loads store and saves!
  actorId: auth.user.userId,
  action: 'listing.deleted',
  ...
})
```
Inside `src/lib/store.ts`:
```typescript
export function logAuditEvent(params: {...}): AuditLog {
  const store = loadStore() // Re-reads store from disk
  store.auditLogs.unshift(log)
  saveStore(store)          // Saves store again
  return log
}
```
If an unrelated Request C writes to `data/admin_data.json` between `saveStore(store)` and `logAuditEvent(...)`, `logAuditEvent` will read Request C's changes, prepend the log, and save. But if Request C executed `loadStore()` before `saveStore(store)` finished, Request C might overwrite the listing deletion or the audit log!

### 2.3 High-Risk Concurrent Mutation Points Identified
1. **WhatsApp Webhooks (`src/app/api/whatsapp/webhook/route.ts`):** Inbound WhatsApp messages from multiple concurrent users texting simultaneously (claiming vendors, requesting magic links, submitting leads). Each webhook independently reads and saves `store.messages` and `store.approvals`.
2. **CRM Contact Ingestion (`src/app/api/crm/contacts/route.ts` & `/import-csv/route.ts`):** Multiple staff members adding leads or uploading CSVs simultaneously.
3. **Admin Listing Lifecycle & Bulk Operations (`src/app/api/admin/listings/route.ts` & `/bulk/route.ts`):** Super admin running bulk status updates while franchise admin edits a listing.
4. **Payment Webhooks & Checkout (`src/app/api/webhooks/payment/route.ts` & `src/app/api/checkout/route.ts`):** Razorpay payment confirmations updating merchant subscription entitlements concurrently with staff management.

---

## 3. Analysis: Why Serializing Only Writes Is Completely Insufficient

A common pitfall is to place a queue or mutex strictly around `saveStore(store)`:
```typescript
// PSEUDO-CODE OF A BROKEN DESIGN:
async function badQueuedSave(store) {
  await queue.lock()
  try {
    fs.writeFileSync(...)
  } finally {
    queue.unlock()
  }
}
```
**Why this fails:**
Serializing only the write stage guarantees that two writes do not corrupt the filesystem concurrently. However, **Request B already read stale data at $T_1$**. By the time Request B enters `badQueuedSave`, its in-memory `store` object does not contain Request A's updates. When Request B's write finishes, Request A's data is still lost.

**Architectural Rule:**
> **The serialization boundary MUST enclose the entire Read -> Modify -> Write lifecycle.**
> The fresh data must be read from disk *after* acquiring the execution lock, modified in memory, and written to disk *before* releasing the lock.

---

## 4. Proposed Design: `mutateStore<T>` In-Process Serialized Queue

### 4.1 Mechanics and Queue Structure
In `src/lib/store.ts`, implement an in-memory asynchronous FIFO queue using a chained Promise pattern:

```typescript
let mutationQueue: Promise<unknown> = Promise.resolve()

export async function mutateStore<T>(
  mutator: (store: AdminDataStore) => Promise<T> | T
): Promise<T> {
  // 1. Capture the tail of the current queue
  const previous = mutationQueue

  // 2. Setup the gate for the next item in line
  let resolveNext: () => void
  mutationQueue = new Promise<void>((resolve) => {
    resolveNext = resolve
  })

  // 3. Await completion of all prior mutations (absorbing prior failures)
  await previous.catch(() => {})

  try {
    // 4. Fresh, serialized read from disk inside the critical section
    const store = loadStore()

    // 5. Execute caller's synchronous or asynchronous mutation logic
    const result = await mutator(store)

    // 6. Atomically persist the mutated store to disk
    saveStore(store)

    return result
  } finally {
    // 7. Advance the queue regardless of success or failure
    resolveNext!()
  }
}
```

### 4.2 Error Propagation and Recovery
- **No Cascade Poisoning:** `await previous.catch(() => {})` guarantees that if mutation $N$ throws an exception (e.g. invalid payload or duplicate conflict), mutation $N+1$ does **not** reject with mutation $N$'s error. Mutation $N+1$ proceeds normally.
- **Store Protection on Error:** If `mutator(store)` throws an error, execution immediately jumps to `finally`. `saveStore(store)` is **never invoked**. The corrupted or incomplete in-memory state is discarded, and `data/admin_data.json` remains untouched.
- **Caller Error Visibility:** The exact error thrown by `mutator(store)` is rejected to the caller of mutation $N$, preserving standard HTTP error handling (`400`, `404`, `409`, `500`).

### 4.3 Enhanced `logAuditEvent` Integration
Enhance `logAuditEvent` to accept an optional `inStore?: AdminDataStore` parameter:
```typescript
export function logAuditEvent(params: AuditLogParams & { inStore?: AdminDataStore }): AuditLog {
  const store = params.inStore || loadStore()
  // ... unshift sanitized log ...
  if (!params.inStore) {
    saveStore(store)
  }
  return log
}
```
When called inside `mutateStore((store) => { ... logAuditEvent({ ..., inStore: store }) })`, the audit log is appended directly to the active transaction and saved in the **same single atomic write**, completely eliminating the double-mutation race condition!

---

## 5. Shared State & Multi-Process Limitations (Crucial Transparency)

### 5.1 In-Process Scope
The `mutateStore` queue is an in-memory data structure within the running Node.js process. It guarantees **100% serialized, race-free mutations across all concurrent asynchronous requests handled by that specific Node.js process**.

### 5.2 Multi-Process Limitation
If the Next.js application is executed across multiple separate OS processes:
- Node.js Cluster mode (`cluster.fork()`)
- Multiple PM2 cluster instances
- Multi-container Kubernetes pods or separate serverless lambdas

Each process maintains its own distinct `mutationQueue` in its own private heap memory. Process A cannot coordinate with Process B via JavaScript promises. If Process A and Process B attempt simultaneous writes, the OS filesystem will atomically swap files, but read-modify-write race conditions can still occur between the two processes.

### 5.3 Long-Term Roadmap for Multi-Process Concurrency
For multi-process or distributed scalability, the application must transition to:
1. **OS-Level File Locking (`flock` / `fcntl`):** Advisory locking on `data/admin_data.json.lock`.
2. **ACID Embedded Database:** SQLite with Write-Ahead Logging (`WAL` mode) via `better-sqlite3`.
3. **Dedicated Client-Server Database:** PostgreSQL or Supabase with row-level locking.

---

## 6. Task C: Backup Resilience & Operator Runbook

### 6.1 Vulnerability of Co-Located Android Backups
- Currently, backups are stored in `data/backups/` under `/storage/emulated/0/Download/Cpl Crm/choutuppal-franchise-crm/data/backups/`.
- **Risks:**
  - Other apps on Android with `READ_EXTERNAL_STORAGE` can read business data.
  - File cleaner utilities (e.g. Google Files, Samsung Device Care) frequently clean the `Download/` directory.
  - A device crash, accidental directory deletion, or storage unmount destroys both primary data and backups.

### 6.2 Solution: Private Isolated Storage on Termux
Termux provides private, sandbox-isolated internal storage at `/data/user/0/com.termux/files/home/` (accessible via `$HOME`).
- Files in `$HOME` are on Linux ext4 with native POSIX permissions (`drwx------` owned by `u0_a242`).
- Other Android applications and automated file cleaners cannot access or delete files in `$HOME`.

### 6.3 Safe Operator Runbook: Copy & Verify Utility
Add a safe, non-destructive `copy` command to `scripts/backup-manager.mjs`:
```bash
node scripts/backup-manager.mjs copy <backup-file> --dest=<private-directory>
```
1. Verifies source backup SHA-256 and companion manifest.
2. Checks destination path safety. Refuses to overwrite unless specified.
3. Copies backup and companion manifest using atomic temp files.
4. Verifies destination SHA-256 against source SHA-256.
5. Leaves existing backups intact (zero pruning, zero deletion).

---

## 7. Implementation Plan

1. **Step 1:** Implement `mutateStore<T>` and `inStore` parameter support in `src/lib/store.ts`.
2. **Step 2:** Implement `copyBackup` in `scripts/backup-manager.mjs`.
3. **Step 3:** Create comprehensive synthetic concurrency test suite `test_phase8_concurrency.py` using isolated temporary directories. Test:
   - Concurrent updates to different records
   - Concurrent updates to the same record
   - Failed mutation followed by successful mutation
   - Queue recovery and error propagation
   - Verification of zero disk writes on mutation failure
   - Invariance of live `data/admin_data.json`
4. **Step 4:** Execute test suites, TypeScript compilation, and production build in ext4 workspace.
5. **Step 5:** Record all results and produce `project-discovery/phase-8-implementation-report.md`.
