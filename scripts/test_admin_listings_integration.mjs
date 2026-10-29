/**
 * ============================================================================
 * CHOUTUPPAL CRM — TASK 8: GET /api/admin/listings INTEGRATION & AUDIT
 * ============================================================================
 * Tests:
 * 1. Public unauthenticated users cannot retrieve unpublished listings (DRAFT, REJECTED).
 * 2. Authenticated admin responses are not truncated (full dataset returned, not capped at 20).
 * 3. Territory scoping isolates Franchise Admins to their territory while Super Admin accesses all.
 * 4. getListingsDAO parity with route-level security invariants in both local and remote modes.
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { GET } from '@/app/api/admin/listings/route.ts';
import { getListingsDAO, upsertListingDAO, deleteListingDAO } from '@/lib/supabase-dao.ts';
import { createSignedSessionToken } from '@/lib/auth-server.ts';
import { loadStore, saveStore, isListingPublished, FLAGSHIP_TERRITORY_ID } from '@/lib/store.ts';

const STORE_PATH = path.resolve(process.cwd(), 'data/admin_data.json');
const BACKUP_PATH = path.resolve(process.cwd(), 'data/admin_data.json.bak_task8');

function backupStore() {
  if (fs.existsSync(STORE_PATH)) {
    fs.copyFileSync(STORE_PATH, BACKUP_PATH);
  }
}

function restoreStore() {
  if (fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(BACKUP_PATH, STORE_PATH);
    fs.unlinkSync(BACKUP_PATH);
  }
}

let passCount = 0;
let failCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✔ PASS: ${testName} ${details ? '(' + details + ')' : ''}`);
    passCount++;
  } else {
    console.error(`  ✖ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`);
    failCount++;
  }
}

async function runTests() {
  console.log('======================================================================');
  console.log('CHOUTUPPAL CRM — TASK 8: GET /api/admin/listings INTEGRATION & AUDIT');
  console.log('======================================================================\n');

  backupStore();

  const draftListing = {
    id: 'lst_test_draft_9999',
    title: 'Secret Draft Business (Unpublished)',
    status: 'DRAFT',
    territoryId: FLAGSHIP_TERRITORY_ID,
    categoryId: 'cat-automobile',
    categoryName: 'Automobile',
    villageId: 'v-choutuppal',
    villageName: 'చౌటుప్పల్ (Choutuppal)',
    phone: '9848012345',
    address: 'Main Road, Choutuppal',
    coverImage: 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=800',
    slug: 'secret-draft-business-choutuppal-9999',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const rejectedListing = {
    id: 'lst_test_rejected_9999',
    title: 'Rejected Spa (Unpublished)',
    status: 'REJECTED',
    territoryId: FLAGSHIP_TERRITORY_ID,
    categoryId: 'cat-health',
    categoryName: 'Health & Medical',
    villageId: 'v-choutuppal',
    villageName: 'చౌటుప్పల్ (Choutuppal)',
    phone: '9848012346',
    address: 'Bus Stand Road, Choutuppal',
    coverImage: 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=800',
    slug: 'rejected-spa-choutuppal-9999',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const initialStore = loadStore();
    const baselineCount = (initialStore.listings || []).length;
    console.log(`[*] Initial Baseline Listings: ${baselineCount}`);

    // Insert into dual storage (local + remote if configured)
    await upsertListingDAO(draftListing);
    await upsertListingDAO(rejectedListing);

    console.log('  ✔ PASS: Test listings staged via upsertListingDAO');

    // ------------------------------------------------------------------------
    // CHECK 1: Public Unauthenticated Access Protection
    // ------------------------------------------------------------------------
    console.log('\n--- CHECK 1: Public Unauthenticated Caller Protection ---');
    const publicReq = new Request('https://choutuppal.in/api/admin/listings', {
      method: 'GET',
    });

    const publicRes = await GET(publicReq);
    const publicData = await publicRes.json();

    assert(publicRes.status === 200, 'Public request returns HTTP 200');
    assert(publicData.success === true, 'Public response has success: true');
    assert(publicData.isPublic === true, 'Public response is marked with isPublic: true');

    const leakedUnpublished = (publicData.listings || []).filter(
      (l) => l.id === draftListing.id || l.id === rejectedListing.id || !isListingPublished(l)
    );
    assert(leakedUnpublished.length === 0, 'Zero unpublished listings leaked to public caller', `Leaked=${leakedUnpublished.length}`);

    const allPublished = (publicData.listings || []).every((l) => isListingPublished(l));
    assert(allPublished, '100% of listings returned to public caller are verified published/approved');

    // ------------------------------------------------------------------------
    // CHECK 2: Admin Response Truncation Protection & Completeness
    // ------------------------------------------------------------------------
    console.log('\n--- CHECK 2: Admin Response Truncation Protection ---');
    const superAdminToken = createSignedSessionToken({
      phone: '9441348175',
      role: 'SUPER_ADMIN',
    });

    const adminReq = new Request('https://choutuppal.in/api/admin/listings?territoryId=all', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
      },
    });

    const adminRes = await GET(adminReq);
    const adminData = await adminRes.json();

    assert(adminRes.status === 200, 'Admin request returns HTTP 200');
    assert(adminData.success === true, 'Admin response has success: true');
    assert(!adminData.isPublic, 'Admin response is NOT marked as public');

    // Verify admin CAN see draft and rejected listings
    const adminDraft = (adminData.listings || []).find((l) => l.id === draftListing.id);
    const adminRejected = (adminData.listings || []).find((l) => l.id === rejectedListing.id);
    assert(!!adminDraft && !!adminRejected, 'Admin successfully retrieves DRAFT and REJECTED listings for moderation review');

    // Anti-truncation verification
    assert(adminData.listings.length >= 214, 'Admin response is NOT truncated (all listings returned in full array for client-side tabs)', `Returned=${adminData.listings.length}`);
    assert(adminData.listings.length > 20, 'Anti-truncation check: Count significantly exceeds default pagination size 20', `Count=${adminData.listings.length}`);
    assert(adminData.listings.length > 100, 'Anti-truncation check: Count exceeds max standard pagination size 100', `Count=${adminData.listings.length}`);

    // ------------------------------------------------------------------------
    // CHECK 3: Multi-Tenant Territory Scoping
    // ------------------------------------------------------------------------
    console.log('\n--- CHECK 3: Multi-Tenant Territory Scoping ---');
    const nalgondaAdminToken = createSignedSessionToken({
      phone: '9888877777',
      role: 'FRANCHISE_ADMIN',
      territoryId: 'territory_nalgonda',
    });

    const nalgondaReq = new Request('https://choutuppal.in/api/admin/listings', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${nalgondaAdminToken}`,
      },
    });

    const nalgondaRes = await GET(nalgondaReq);
    const nalgondaData = await nalgondaRes.json();

    assert(nalgondaRes.status === 200, 'Franchise Admin request returns HTTP 200');
    const foreignLeakage = (nalgondaData.listings || []).filter(
      (l) => (l.territoryId || FLAGSHIP_TERRITORY_ID) !== 'territory_nalgonda'
    );
    assert(foreignLeakage.length === 0, 'Zero cross-territory leakage for Franchise Admin', `Leakage=${foreignLeakage.length}`);

    // ------------------------------------------------------------------------
    // CHECK 4: getListingsDAO Parity Verification
    // ------------------------------------------------------------------------
    console.log('\n--- CHECK 4: getListingsDAO Invariant Parity ---');
    // Public DAO call: publishedOnly = true
    const daoPublic = await getListingsDAO({
      territoryId: 'all',
      publishedOnly: true,
    });

    assert(typeof daoPublic.isRemote === 'boolean', `DAO reports execution mode correctly (isRemote=${daoPublic.isRemote})`);
    assert(daoPublic.pageSize === 1000, 'DAO pageSize defaults to 1000 to prevent client UI truncation', `pageSize=${daoPublic.pageSize}`);
    assert(daoPublic.data.length >= 212, 'DAO publishedOnly returns complete published catalog', `Count=${daoPublic.data.length}`);

    const daoUnpublishedLeak = daoPublic.data.filter((l) => !isListingPublished(l));
    assert(daoUnpublishedLeak.length === 0, 'DAO publishedOnly returns ZERO unpublished listings');

    // Admin DAO call: publishedOnly = false
    const daoAdmin = await getListingsDAO({
      territoryId: 'all',
      publishedOnly: false,
    });
    assert(daoAdmin.data.length >= 214, 'DAO admin call returns full dataset including draft and rejected listings', `Count=${daoAdmin.data.length}`);

  } finally {
    await deleteListingDAO(draftListing.id, draftListing.territoryId);
    await deleteListingDAO(rejectedListing.id, rejectedListing.territoryId);
    restoreStore();
    const finalStore = loadStore();
    console.log(`\n[*] Cleaned up test data. Restored local listing count: ${(finalStore.listings || []).length}`);
  }

  console.log('\n======================================================================');
  console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('======================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('[FATAL ERROR]:', err);
  restoreStore();
  process.exit(1);
});
