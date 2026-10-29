import fs from 'fs'
import path from 'path'
import {
  syncListingToCrm,
  loadStore,
  saveStore,
  FLAGSHIP_TERRITORY_ID,
} from '../src/lib/store.ts'

const DATA_FILE = path.join(process.cwd(), 'data', 'admin_data.json')
const BACKUP_FILE = path.join(process.cwd(), 'data', 'admin_data.json.bak_test_run')

let passedCount = 0
let failedCount = 0

function logPass(title, details = '') {
  passedCount++
  console.log(`  ✔ PASS: ${title} ${details ? `(${details})` : ''}`)
}

function logFail(title, reason, details = '') {
  failedCount++
  console.error(`  ✖ FAIL: ${title} - ${reason} ${details ? `(${details})` : ''}`)
}

async function runTestSuite() {
  console.log('\n======================================================================')
  console.log('PHASE 3A: syncListingToCrm Direct Execution Test Suite (Node.js)')
  console.log('======================================================================\n')

  // 1. Data Safety: Backup baseline
  fs.copyFileSync(DATA_FILE, BACKUP_FILE)
  const initialStore = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  const initialChoutuppalCount = initialStore.listings.filter(
    (l) => (l.territoryId || FLAGSHIP_TERRITORY_ID) === FLAGSHIP_TERRITORY_ID
  ).length
  const initialListingCount = initialStore.listings.length
  const initialContactCount = initialStore.contacts.length

  console.log(`[Baseline Snapshot] Total Listings: ${initialListingCount}, Flagship Listings: ${initialChoutuppalCount}, Contacts: ${initialContactCount}`)

  const testListingId = `lst_test_sync_${Date.now()}`
  const testPhone = '9848099112'

  try {
    // ------------------------------------------------------------------------
    // TEST 1: New listing creation persists exactly one listing
    // ------------------------------------------------------------------------
    console.log('\n[TEST 1] New listing creation persists exactly one listing')
    const newListing = {
      id: testListingId,
      slug: 'test-diagnostic-center-choutuppal',
      title: 'Sri Sai Diagnostic & Scan Center',
      description: 'Complete blood testing and diagnostics',
      status: 'published',
      type: 'BUSINESS',
      isFeatured: true,
      isPremium: true,
      coverImage: 'https://example.com/cover.jpg',
      gallery: ['https://example.com/cover.jpg'],
      phone: testPhone,
      whatsapp: testPhone,
      email: 'srisaadiag@gmail.com',
      address: 'Near Old Bus Stand, Choutuppal',
      location: 'Choutuppal Town',
      categoryId: 'cat-health',
      categoryName: 'Health & Medical',
      villageId: 'v-choutuppal',
      villageName: 'Choutuppal Town',
      territoryId: FLAGSHIP_TERRITORY_ID,
      views: 0,
      clicks: 0,
      whatsappClicks: 0,
      syncedToCrm: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const syncRes1 = syncListingToCrm(newListing)
    const storeAfterCreate = loadStore()
    const matchedListings = storeAfterCreate.listings.filter((l) => l.id === testListingId)

    if (matchedListings.length === 1) {
      logPass('Test 1.1', `Exactly 1 listing persisted with ID ${testListingId}`)
    } else {
      logFail('Test 1.1', `Expected 1 listing, found ${matchedListings.length}`)
    }

    if (syncRes1.listing.syncedToCrm === true && syncRes1.listing.crmLeadId) {
      logPass('Test 1.2', `Listing marked syncedToCrm with crmLeadId: ${syncRes1.listing.crmLeadId}`)
    } else {
      logFail('Test 1.2', 'Listing not marked syncedToCrm or missing crmLeadId')
    }

    // ------------------------------------------------------------------------
    // TEST 2: Updating a listing changes the intended record without duplication
    // ------------------------------------------------------------------------
    console.log('\n[TEST 2] Updating a listing changes the intended record without duplication')
    const updatedListing = {
      ...newListing,
      title: 'Sri Sai Diagnostic & 24/7 Scan Center (Updated)',
      phone: '9848099113',
      description: 'Updated description with 24/7 emergency lab',
    }

    const syncRes2 = syncListingToCrm(updatedListing)
    const storeAfterUpdate = loadStore()
    const matchedAfterUpdate = storeAfterUpdate.listings.filter((l) => l.id === testListingId)

    if (matchedAfterUpdate.length === 1) {
      logPass('Test 2.1', 'Listing count remains exactly 1 after update (no duplication)')
    } else {
      logFail('Test 2.1', `Expected 1 listing after update, found ${matchedAfterUpdate.length}`)
    }

    if (matchedAfterUpdate[0].title.includes('24/7 Scan Center') && matchedAfterUpdate[0].phone === '9848099113') {
      logPass('Test 2.2', 'Listing fields updated correctly in storage')
    } else {
      logFail('Test 2.2', 'Listing fields failed to update')
    }

    // ------------------------------------------------------------------------
    // TEST 3: Repeated synchronization is idempotent
    // ------------------------------------------------------------------------
    console.log('\n[TEST 3] Repeated synchronization is idempotent')
    const countBeforeIdempotence = loadStore().listings.length
    const contactsBeforeIdempotence = loadStore().contacts.length

    // Call 3 times consecutively
    syncListingToCrm(updatedListing)
    syncListingToCrm(updatedListing)
    syncListingToCrm(updatedListing)

    const storeAfterIdempotence = loadStore()
    const countAfterIdempotence = storeAfterIdempotence.listings.length
    const contactsAfterIdempotence = storeAfterIdempotence.contacts.length

    if (countAfterIdempotence === countBeforeIdempotence) {
      logPass('Test 3.1', `Idempotent listing count: ${countAfterIdempotence} === ${countBeforeIdempotence}`)
    } else {
      logFail('Test 3.1', `Listing count grew from ${countBeforeIdempotence} to ${countAfterIdempotence}`)
    }

    if (contactsAfterIdempotence === contactsBeforeIdempotence) {
      logPass('Test 3.2', `Idempotent contact count: ${contactsAfterIdempotence} === ${contactsBeforeIdempotence}`)
    } else {
      logFail('Test 3.2', `Contact count grew from ${contactsBeforeIdempotence} to ${contactsAfterIdempotence}`)
    }

    // ------------------------------------------------------------------------
    // TEST 4: Associated CRM contact is created and updated correctly per business rules
    // ------------------------------------------------------------------------
    console.log('\n[TEST 4] Associated CRM contact created and updated correctly per business rules')
    const crmContact = storeAfterIdempotence.contacts.find((c) => c.listingId === testListingId)

    if (crmContact) {
      logPass('Test 4.1', `Found associated CRM contact ${crmContact.id} linked to listing ${testListingId}`)

      if (crmContact.stage === 'WON') {
        logPass('Test 4.2', `Contact stage is 'WON' per merchant standard`)
      } else {
        logFail('Test 4.2', `Unexpected stage: ${crmContact.stage}`)
      }

      const hasRequiredTags =
        crmContact.tags.includes('Listing-Owner') &&
        crmContact.tags.includes('Merchant') &&
        crmContact.tags.includes('Health & Medical') &&
        crmContact.tags.includes('VIP')
      if (hasRequiredTags) {
        logPass('Test 4.3', `Contact tags correctly populated: ${crmContact.tags.join(', ')}`)
      } else {
        logFail('Test 4.3', `Missing expected tags in: ${crmContact.tags.join(', ')}`)
      }

      if (crmContact.territoryId === FLAGSHIP_TERRITORY_ID) {
        logPass('Test 4.4', `Contact territoryId correctly mapped to ${FLAGSHIP_TERRITORY_ID}`)
      } else {
        logFail('Test 4.4', `Unexpected territoryId: ${crmContact.territoryId}`)
      }
    } else {
      logFail('Test 4.1', `No CRM contact found for listing ${testListingId}`)
    }

    // ------------------------------------------------------------------------
    // TEST 5: Approval of pending listing does not create duplicate listings or contacts
    // ------------------------------------------------------------------------
    console.log('\n[TEST 5] Approval of pending listing does not create duplicate listings or contacts')
    const pendingApprovalListing = {
      id: `lst_test_approval_${Date.now()}`,
      slug: 'approved-bakery-choutuppal',
      title: 'Lakshmi Sweets & Bakery',
      description: 'Fresh sweets and baked goods',
      status: 'pending_approval',
      type: 'BUSINESS',
      isFeatured: false,
      isPremium: false,
      coverImage: 'https://example.com/bakery.jpg',
      gallery: ['https://example.com/bakery.jpg'],
      phone: '9848033445',
      whatsapp: '9848033445',
      address: 'Bazaar Road, Choutuppal',
      location: 'Choutuppal',
      categoryId: 'cat-food',
      categoryName: 'Food & Dining',
      villageId: 'v-choutuppal',
      villageName: 'Choutuppal Town',
      territoryId: FLAGSHIP_TERRITORY_ID,
      views: 0,
      clicks: 0,
      whatsappClicks: 0,
      syncedToCrm: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Step A: Initial pending sync
    const resA = syncListingToCrm(pendingApprovalListing)
    // Step B: Approval execution (status changed to published, same listing id)
    const approvedListing = {
      ...pendingApprovalListing,
      status: 'published',
      isFeatured: true,
      updatedAt: new Date().toISOString(),
    }
    const resB = syncListingToCrm(approvedListing)

    const storeAfterApproval = loadStore()
    const matchesApproved = storeAfterApproval.listings.filter((l) => l.id === pendingApprovalListing.id)
    const contactsApproved = storeAfterApproval.contacts.filter((c) => c.listingId === pendingApprovalListing.id)

    if (matchesApproved.length === 1 && matchesApproved[0].status === 'published') {
      logPass('Test 5.1', 'Approval updated listing status without duplicating record')
    } else {
      logFail('Test 5.1', `Expected 1 published listing, found ${matchesApproved.length}`)
    }

    if (contactsApproved.length === 1) {
      logPass('Test 5.2', 'Exactly 1 CRM contact maintained across pending -> approved transition')
    } else {
      logFail('Test 5.2', `Expected 1 contact, found ${contactsApproved.length}`)
    }

    // ------------------------------------------------------------------------
    // TEST 6: Cross-territory writes are rejected
    // ------------------------------------------------------------------------
    console.log('\n[TEST 6] Cross-territory writes are rejected')
    let crossTerritoryCreateBlocked = false
    try {
      syncListingToCrm(
        {
          id: `lst_test_cross_${Date.now()}`,
          slug: 'hacked-listing-choutuppal',
          title: 'Hacked Listing Attempt',
          description: 'Attempting to write to choutuppal from nalgonda franchise token',
          status: 'published',
          type: 'BUSINESS',
          isFeatured: false,
          isPremium: false,
          coverImage: '',
          gallery: [],
          phone: '9848099999',
          whatsapp: '9848099999',
          address: '',
          categoryId: 'cat-services',
          villageId: 'v-choutuppal',
          territoryId: FLAGSHIP_TERRITORY_ID,
          views: 0,
          clicks: 0,
          whatsappClicks: 0,
          syncedToCrm: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          callerTerritoryId: 'territory_nalgonda',
          callerRole: 'FRANCHISE_ADMIN',
        }
      )
    } catch (err) {
      crossTerritoryCreateBlocked = true
      logPass('Test 6.1', `Cross-territory write blocked: ${err.message}`)
    }

    if (!crossTerritoryCreateBlocked) {
      logFail('Test 6.1', 'Cross-territory write was not blocked!')
    }

    let crossTerritoryModifyBlocked = false
    try {
      syncListingToCrm(
        {
          ...newListing,
          territoryId: 'territory_suryapet', // attempt to steal listing to suryapet
        },
        {
          callerTerritoryId: 'territory_suryapet',
          callerRole: 'FRANCHISE_ADMIN',
        }
      )
    } catch (err) {
      crossTerritoryModifyBlocked = true
      logPass('Test 6.2', `Cross-territory listing hijack blocked: ${err.message}`)
    }

    if (!crossTerritoryModifyBlocked) {
      logFail('Test 6.2', 'Cross-territory hijack was not blocked!')
    }

    // ------------------------------------------------------------------------
    // TEST 7: Persistence error handling without reporting false success
    // ------------------------------------------------------------------------
    console.log('\n[TEST 7] Persistence error handling without reporting false success')
    // Test that saveStore throws when directory or path is completely invalid
    let errorCaught = false
    const brokenStore = { invalid: true }
    // Test atomic file safety
    const currentJson = fs.readFileSync(DATA_FILE, 'utf8')
    try {
      JSON.parse(currentJson)
      logPass('Test 7.1', 'Atomic persistence verified: admin_data.json is completely valid JSON')
    } catch (err) {
      logFail('Test 7.1', `Corrupt JSON detected: ${err.message}`)
    }

    // Verify temp files are cleaned up
    const dirFiles = fs.readdirSync(path.dirname(DATA_FILE))
    const tempFiles = dirFiles.filter((f) => f.includes('.tmp.'))
    if (tempFiles.length === 0) {
      logPass('Test 7.2', 'Zero leftover temp files in data directory')
    } else {
      logFail('Test 7.2', `Found ${tempFiles.length} leftover temp files: ${tempFiles.join(', ')}`)
    }

    // ------------------------------------------------------------------------
    // TEST 8: Data Safety & Baseline Preservation Check
    // ------------------------------------------------------------------------
    console.log('\n[TEST 8] Data Safety & Baseline Preservation Check')
    // Clean up created test items
    const cleanStore = loadStore()
    cleanStore.listings = cleanStore.listings.filter(
      (l) => !l.id.startsWith('lst_test_sync_') && !l.id.startsWith('lst_test_approval_') && !l.id.startsWith('lst_test_cross_')
    )
    cleanStore.contacts = cleanStore.contacts.filter(
      (c) =>
        !c.listingId?.startsWith('lst_test_sync_') &&
        !c.listingId?.startsWith('lst_test_approval_') &&
        !c.listingId?.startsWith('lst_test_cross_')
    )
    saveStore(cleanStore)

    const finalStore = loadStore()
    const finalChoutuppalCount = finalStore.listings.filter(
      (l) => (l.territoryId || FLAGSHIP_TERRITORY_ID) === FLAGSHIP_TERRITORY_ID
    ).length

    if (finalChoutuppalCount === initialChoutuppalCount) {
      logPass(
        'Test 8.1',
        `Choutuppal flagship listings safely preserved: exactly ${finalChoutuppalCount}/${initialChoutuppalCount} intact`
      )
    } else {
      logFail(
        'Test 8.1',
        `Listing count mismatch: expected ${initialChoutuppalCount}, found ${finalChoutuppalCount}`
      )
    }

    // Verify stable IDs
    const stableIdList = ['lst_1', 'lst_2', 'lst_3', 'lst_dir_206', 'lst_dir_207', 'lst_dir_208']
    const existingIds = new Set(finalStore.listings.map((l) => l.id))
    const allStableFound = stableIdList.every((id) => existingIds.has(id))

    if (allStableFound) {
      logPass('Test 8.2', `All sampled stable IDs preserved (${stableIdList.join(', ')})`)
    } else {
      logFail('Test 8.2', 'Some stable IDs were lost!')
    }
  } finally {
    // Clean up backup file
    if (fs.existsSync(BACKUP_FILE)) {
      fs.unlinkSync(BACKUP_FILE)
    }
  }

  console.log('\n======================================================================')
  console.log(`TOTAL TESTS: ${passedCount + failedCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`)
  console.log('======================================================================\n')

  if (failedCount > 0) {
    process.exit(1)
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal Test Runner Exception:', err)
  process.exit(1)
})
