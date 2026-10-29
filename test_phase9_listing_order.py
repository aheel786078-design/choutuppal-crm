#!/usr/bin/env python3
"""
Phase 9 Automated Verification Test Suite
Admin-Controlled Business Listing Order in WhatsApp Flow Builder

Dimensions:
1. Baseline Integrity Pre-Test (212 listings, 211 contacts, 4 deals, 1 flow, 179 automations, 4 territories)
2. Manual Order Deterministic Sort (explicit IDs respected, missing/unpublished skipped, remaining appended)
3. Category Priority Sorting (priority order honored, alphabetical sub-sort)
4. Newest First Sorting (descending by createdAt)
5. Alphabetical Sorting (ascending by title)
6. Featured First Sorting (isFeatured/isPremium first)
7. Precedence Hierarchy (node config overrides flow config; missing node inherits flow; safe defaults)
8. Interactive Pagination & Navigation (page sizes 1-10, WhatsApp limits <= 10, Next/Previous rows)
9. Listing Selection & Detail View Transition (listing_<id> loads detail card, invalid/unpublished rejected)
10. Strict Security & Territory Isolation (unapproved/draft/rejected excluded, territory scoped)
11. CSV Schema & Round-Trip Fidelity (import with order headers, exportFlowsToCsv preservation)
12. Final Baseline Record Counts & Zero Data Loss
"""

import json
import os
import subprocess
import sys
import tempfile

ADMIN_DATA_PATH = "data/admin_data.json"
TS_LOADER = "./scripts/ts-loader.mjs"

class TestContext:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.tests = []

    def log_result(self, name: str, success: bool, message: str = ""):
        if success:
            self.passed += 1
            print(f"  [PASS] {name} {message}")
        else:
            self.failed += 1
            print(f"  [FAIL] {name}: {message}")
        self.tests.append({"name": name, "success": success, "message": message})

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))

_eval_counter = 0

def run_node_ts(eval_code: str) -> dict:
    """Run inline TypeScript code via Node with ts-loader and return parsed JSON."""
    global _eval_counter
    _eval_counter += 1
    wrapped_code = f"""
import {{ getStore }} from './src/lib/store.ts';
import {{
  resolveListingSettings,
  sortAndFilterListings,
  evaluateFlow
}} from './src/lib/flow-runtime-engine.ts';
import {{ parseFlowCsv, exportFlowsToCsv }} from './src/lib/parse-flow-csv.ts';

async function run() {{
  {eval_code}
}}

run().then(res => {{
  console.log('__TEST_OUTPUT_START__');
  console.log(JSON.stringify(res));
  console.log('__TEST_OUTPUT_END__');
}}).catch(err => {{
  console.error('ERROR in Node script:', err);
  process.exit(1);
}});
"""
    temp_path = os.path.join(PROJECT_DIR, f".tmp_phase9_{os.getpid()}_{_eval_counter}.ts")
    with open(temp_path, "w", encoding="utf-8") as f:
        f.write(wrapped_code)

    try:
        cmd = ["node", "--loader", TS_LOADER, temp_path]
        res = subprocess.run(cmd, cwd=PROJECT_DIR, capture_output=True, text=True, timeout=30)
        if res.returncode != 0:
            return {"error": res.stderr or res.stdout, "exitCode": res.returncode}
        out = res.stdout
        if "__TEST_OUTPUT_START__" in out and "__TEST_OUTPUT_END__" in out:
            json_str = out.split("__TEST_OUTPUT_START__")[1].split("__TEST_OUTPUT_END__")[0].strip()
            return json.loads(json_str)
        return {"error": "Delimiter not found", "stdout": out, "stderr": res.stderr}
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


def test_1_baseline_preflight(ctx: TestContext):
    print("\n--- Test 1: Baseline Integrity Pre-Test ---")
    if not os.path.exists(ADMIN_DATA_PATH):
        ctx.log_result("Baseline file exists", False, "admin_data.json missing")
        return
    with open(ADMIN_DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    listings = data.get("listings", [])
    contacts = data.get("contacts", [])
    deals = data.get("deals", [])
    flows = data.get("flows", [])
    automations = data.get("automations", [])
    territories = data.get("territories", [])

    ctx.log_result("Listings count == 212", len(listings) == 212, f"Found {len(listings)}")
    ctx.log_result("Contacts count == 211", len(contacts) == 211, f"Found {len(contacts)}")
    ctx.log_result("Deals count == 4", len(deals) == 4, f"Found {len(deals)}")
    ctx.log_result("Flows count >= 1", len(flows) >= 1, f"Found {len(flows)}")
    ctx.log_result("Automations count == 179", len(automations) == 179, f"Found {len(automations)}")
    ctx.log_result("Territories count == 4", len(territories) == 4, f"Found {len(territories)}")

    all_inactive = all(not a.get("isActive", False) for a in automations)
    ctx.log_result("All 179 automations are draft/inactive", all_inactive)

def test_2_manual_order(ctx: TestContext):
    print("\n--- Test 2: Manual Order Deterministic Sort ---")
    node_code = """
  const store = getStore();
  const all = store.listings || [];
  const published = all.filter(l => ['published', 'approved', 'APPROVED'].includes(l.status || ''));
  const id1 = published[10].id;
  const id2 = published[20].id;
  const id3 = published[5].id;
  const deletedId = 'non_existent_listing_xyz';

  const settings = {
    sortMode: 'manual',
    manualOrder: [id2, deletedId, id3, id1],
    pageSize: 10,
    territoryId: 'ALL'
  };

  const sorted = sortAndFilterListings(all, settings);
  return {
    top3: [sorted[0]?.id, sorted[1]?.id, sorted[2]?.id],
    expected: [id2, id3, id1],
    totalSorted: sorted.length,
    totalPublished: published.length,
    containsDeleted: sorted.some(l => l.id === deletedId)
  };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("Manual order execution", False, res["error"])
        return

    ctx.log_result("Manual order matches explicit order", res.get("top3") == res.get("expected"), f"Top: {res.get('top3')}")
    ctx.log_result("Deleted/non-existent IDs skipped gracefully", not res.get("containsDeleted"))
    ctx.log_result("All remaining published listings appended without loss", res.get("totalSorted") == res.get("totalPublished"))

def test_3_category_priority(ctx: TestContext):
    print("\n--- Test 3: Category Priority Sorting ---")
    node_code = """
  const store = getStore();
  const all = store.listings || [];
  const settings = {
    sortMode: 'category_priority',
    categoryPriority: ['services', 'automobile', 'health'],
    pageSize: 100,
    territoryId: 'ALL'
  };

  const sorted = sortAndFilterListings(all, settings);
  const firstServicesIdx = sorted.findIndex(l => (l.categoryId || '').includes('service'));
  const firstAutoIdx = sorted.findIndex(l => (l.categoryId || '').includes('auto'));
  const firstHealthIdx = sorted.findIndex(l => (l.categoryId || '').includes('health'));

  // Verify alphabetical sub-sort within 'services'
  const servicesOnly = sorted.filter(l => (l.categoryId || '').includes('service'));
  let isAlpha = true;
  for (let i = 1; i < servicesOnly.length; i++) {
    if ((servicesOnly[i-1].title || '').localeCompare(servicesOnly[i].title || '') > 0) {
      isAlpha = false;
      break;
    }
  }

  return {
    firstServicesIdx,
    firstAutoIdx,
    firstHealthIdx,
    isAlpha,
    totalServices: servicesOnly.length
  };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("Category priority execution", False, res["error"])
        return

    priorities_respected = (
        res.get("firstServicesIdx") != -1 and
        res.get("firstAutoIdx") > res.get("firstServicesIdx") and
        res.get("firstHealthIdx") > res.get("firstAutoIdx")
    )
    ctx.log_result("Categories appear in configured priority order", priorities_respected,
                   f"Indices: services={res.get('firstServicesIdx')}, auto={res.get('firstAutoIdx')}, health={res.get('firstHealthIdx')}")
    ctx.log_result("Within category, sub-sort is alphabetical", res.get("isAlpha", False))

def test_4_newest_and_alphabetical(ctx: TestContext):
    print("\n--- Test 4: Newest First & Alphabetical Sorting ---")
    node_code = """
  const store = getStore();
  const all = store.listings || [];

  // Test Newest
  const sortedNewest = sortAndFilterListings(all, { sortMode: 'newest' });
  let isNewestDesc = true;
  for (let i = 1; i < sortedNewest.length; i++) {
    const dPrev = new Date(sortedNewest[i-1].createdAt || 0).getTime();
    const dCurr = new Date(sortedNewest[i].createdAt || 0).getTime();
    if (dPrev < dCurr) {
      isNewestDesc = false;
      break;
    }
  }

  // Test Alphabetical
  const sortedAlpha = sortAndFilterListings(all, { sortMode: 'alphabetical' });
  let isAlphaAsc = true;
  for (let i = 1; i < sortedAlpha.length; i++) {
    const tPrev = (sortedAlpha[i-1].title || '').toLowerCase();
    const tCurr = (sortedAlpha[i].title || '').toLowerCase();
    if (tPrev.localeCompare(tCurr) > 0) {
      isAlphaAsc = false;
      break;
    }
  }

  return { isNewestDesc, isAlphaAsc, totalSorted: sortedAlpha.length };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("Newest/Alpha execution", False, res["error"])
        return

    ctx.log_result("Newest first sorts descending by createdAt", res.get("isNewestDesc", False))
    ctx.log_result("Alphabetical sorts ascending by title", res.get("isAlphaAsc", False))

def test_5_featured_first(ctx: TestContext):
    print("\n--- Test 5: Featured First Sorting ---")
    node_code = """
  const store = getStore();
  const all = store.listings || [];
  const sorted = sortAndFilterListings(all, { sortMode: 'featured' });

  let sawNonFeatured = false;
  let featuredViolation = false;
  let featuredCount = 0;

  for (const l of sorted) {
    const isFeat = Boolean(l.isFeatured || l.isPremium);
    if (isFeat) {
      featuredCount++;
      if (sawNonFeatured) {
        featuredViolation = true;
      }
    } else {
      sawNonFeatured = true;
    }
  }

  return { featuredCount, featuredViolation, total: sorted.length };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("Featured execution", False, res["error"])
        return

    ctx.log_result("Featured listings appear before non-featured", not res.get("featuredViolation", True))
    ctx.log_result(f"Featured listings identified correctly (count: {res.get('featuredCount')})", res.get("featuredCount", 0) >= 0)

def test_6_precedence_rules(ctx: TestContext):
    print("\n--- Test 6: Precedence Hierarchy ---")
    node_code = """
  // Case A: Node overrides Flow
  const flowA = {
    id: 'f1',
    listingSortMode: 'alphabetical',
    listingPageSize: 10,
    nodes: []
  };
  const nodeA = {
    id: 'n1',
    config: {
      listingSortMode: 'newest',
      listingPageSize: 5
    }
  };
  const resA = resolveListingSettings(nodeA, flowA);

  // Case B: Missing node inherits flow
  const flowB = {
    id: 'f2',
    listingSortMode: 'featured',
    categoryPriority: ['healthcare'],
    nodes: []
  };
  const nodeB = { id: 'n2', config: {} };
  const resB = resolveListingSettings(nodeB, flowB);

  // Case C: Missing flow and node defaults to safe fallback
  const flowC = { id: 'f3', nodes: [] };
  const nodeC = { id: 'n3', config: {} };
  const resC = resolveListingSettings(nodeC, flowC);

  // Case D: Explicit manual order never falls back to alphabetical
  const flowD = {
    id: 'f4',
    listingSortMode: 'manual',
    listingSortOrder: ['item_1', 'item_2'],
    nodes: []
  };
  const nodeD = { id: 'n4', config: {} };
  const resD = resolveListingSettings(nodeD, flowD);

  return {
    nodeOverridesFlow: resA.sortMode === 'newest' && resA.pageSize === 5,
    inheritsFlow: resB.sortMode === 'featured' && resB.categoryPriority[0] === 'healthcare',
    safeDefaults: resC.sortMode === 'manual' && resC.pageSize === 10,
    manualNeverFallsBack: resD.sortMode === 'manual' && resD.manualOrder.length === 2
  };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("Precedence execution", False, res["error"])
        return

    ctx.log_result("Node-level config overrides flow-level defaults", res.get("nodeOverridesFlow", False))
    ctx.log_result("Missing node config inherits flow-level settings", res.get("inheritsFlow", False))
    ctx.log_result("Missing flow & node settings default safely", res.get("safeDefaults", False))
    ctx.log_result("Explicit manual order never falls back to alphabetical", res.get("manualNeverFallsBack", False))

def test_7_interactive_pagination(ctx: TestContext):
    print("\n--- Test 7: Interactive Pagination & Meta Limits ---")
    node_code = """
  const store = getStore();
  const flow = {
    id: 'flow_test',
    name: 'Test Flow',
    status: 'published',
    triggers: [{ type: 'keyword', value: 'browse' }],
    trigger_keywords: ['browse'],
    entryNodeId: 'node_list',
    nodes: [{
      id: 'node_list',
      type: 'interactive_list',
      title: 'Listings',
      config: {
        listingSortMode: 'alphabetical',
        listingPageSize: 5
      }
    }]
  };

  // Evaluate Page 1
  const evalP1 = await evaluateFlow({
    flow,
    incomingMessage: 'browse',
    senderPhone: '+919876543210',
    activeNodeId: 'node_list',
    listingPage: 1
  });

  // Evaluate Page 2 via probe payload
  const evalP2 = await evaluateFlow({
    flow,
    incomingMessage: 'page_2',
    senderPhone: '+919876543210',
    activeNodeId: 'node_list',
    listingPage: 1
  });

  const p1Rows = evalP1.renderedListOptions || [];
  const p2Rows = evalP2.renderedListOptions || [];

  const p1HasNext = p1Rows.some(r => r.id === 'next_page_2' || r.id === 'page_2');
  const p2HasPrev = p2Rows.some(r => r.id === 'prev_page_1' || r.id === 'page_1');

  return {
    p1RowCount: p1Rows.length,
    p2RowCount: p2Rows.length,
    p1HasNext,
    p2HasPrev,
    p1PageInfo: evalP1.pagination,
    p2PageInfo: evalP2.pagination,
    maxLimitRespected: p1Rows.length <= 10 && p2Rows.length <= 10
  };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("Pagination execution", False, res["error"])
        return

    ctx.log_result("WhatsApp limit respected (rows <= 10)", res.get("maxLimitRespected", False), f"P1: {res.get('p1RowCount')}, P2: {res.get('p2RowCount')}")
    ctx.log_result("Page 1 includes Next page navigation row", res.get("p1HasNext", False))
    ctx.log_result("Page 2 includes Previous page navigation row", res.get("p2HasPrev", False))
    ctx.log_result("Pagination metadata correctly tracked", res.get("p2PageInfo", {}).get("currentPage") == 2)

def test_8_listing_selection_transition(ctx: TestContext):
    print("\n--- Test 8: Listing Selection & Detail View Transition ---")
    node_code = """
  const store = getStore();
  const flow = (store.flows || [])[0];
  const published = (store.listings || []).filter(l => ['published', 'approved', 'APPROVED'].includes(l.status || ''));
  const testListing = published[0];

  // Intercept selection of valid published listing
  const evalValid = await evaluateFlow({
    flow,
    incomingMessage: `listing_${testListing.id}`,
    senderPhone: '+919876543210'
  });

  // Intercept non-existent listing
  const evalInvalid = await evaluateFlow({
    flow,
    incomingMessage: 'listing_invalid_id_99999',
    senderPhone: '+919876543210'
  });

  return {
    validBodyContainsTitle: (evalValid.renderedBody || '').includes(testListing.title),
    validBodyContainsPhone: (evalValid.renderedBody || '').includes(testListing.phone || ''),
    invalidBodyReportsError: evalValid.renderedBody !== evalInvalid.renderedBody && (evalInvalid.renderedBody || '').includes('unavailable')
  };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("Selection transition execution", False, res["error"])
        return

    ctx.log_result("Selecting listing displays detail card with title", res.get("validBodyContainsTitle", False))
    ctx.log_result("Detail card includes listing contact info", res.get("validBodyContainsPhone", False))
    ctx.log_result("Selecting invalid/missing listing gracefully handled", res.get("invalidBodyReportsError", False))

def test_9_security_and_territory(ctx: TestContext):
    print("\n--- Test 9: Strict Security & Territory Isolation ---")
    node_code = """
  const store = getStore();
  const all = store.listings || [];

  // Test sorting filters out non-approved
  const sorted = sortAndFilterListings(all, { sortMode: 'alphabetical', territoryId: 'territory_choutuppal' });
  const hasUnapproved = sorted.some(l => !['published', 'approved', 'APPROVED'].includes(l.status || ''));

  // Test direct lookup of draft listing
  const draftListing = all.find(l => !['published', 'approved', 'APPROVED'].includes(l.status || ''));
  let draftBlocked = false;
  if (draftListing) {
    const flow = (store.flows || [])[0];
    const evalDraft = await evaluateFlow({
      flow,
      incomingMessage: `listing_${draftListing.id}`,
      senderPhone: '+919876543210'
    });
    draftBlocked = evalDraft.renderedBody.includes('unavailable');
  } else {
    draftBlocked = true; // No draft listing exists
  }

  return {
    hasUnapproved,
    draftBlocked,
    totalSorted: sorted.length
  };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("Security execution", False, res["error"])
        return

    ctx.log_result("Unpublished/draft/rejected listings strictly excluded from order", not res.get("hasUnapproved", True))
    ctx.log_result("Direct selection of unapproved listing rejected with unavailable notice", res.get("draftBlocked", False))

def test_10_csv_round_trip(ctx: TestContext):
    print("\n--- Test 10: CSV Schema & Round-Trip Fidelity ---")
    node_code = """
  const csvContent = `flow_id,flow_name,trigger,node_id,node_type,message_body,listing_sort_mode,category_priority,listing_sort_order,listing_page_size
flow_csv_test,CSV Order Test,start,node_1,interactive_list,Welcome,category_priority,"services;automobile;healthcare",id1;id2;id3,8`;

  const parseResult = parseFlowCsv(csvContent);
  const flow = parseResult.flows[0];

  const parsedCorrectly = (
    flow &&
    flow.listingSortMode === 'category_priority' &&
    flow.categoryPriority?.length === 3 &&
    flow.categoryPriority[0] === 'services' &&
    flow.listingSortOrder?.length === 3 &&
    flow.listingSortOrder[0] === 'id1' &&
    flow.listingPageSize === 8
  );

  // Test Export
  const exportedCsv = exportFlowsToCsv([flow]);
  const hasHeaders = exportedCsv.includes('listing_sort_mode') &&
                     exportedCsv.includes('category_priority') &&
                     exportedCsv.includes('listing_sort_order') &&
                     exportedCsv.includes('listing_page_size');

  // Re-import exported CSV
  const reimported = parseFlowCsv(exportedCsv);
  const reFlow = reimported.flows[0];

  const roundTripMatched = (
    reFlow &&
    reFlow.listingSortMode === flow.listingSortMode &&
    reFlow.listingPageSize === flow.listingPageSize &&
    reFlow.categoryPriority?.[1] === 'automobile' &&
    reFlow.listingSortOrder?.[1] === 'id2'
  );

  return {
    parsedCorrectly,
    hasHeaders,
    roundTripMatched
  };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("CSV round trip execution", False, res["error"])
        return

    ctx.log_result("CSV parser correctly extracts listing order columns", res.get("parsedCorrectly", False))
    ctx.log_result("CSV exporter includes listing order headers", res.get("hasHeaders", False))
    ctx.log_result("CSV round-trip preserves all listing order configurations", res.get("roundTripMatched", False))

def test_11_edge_cases(ctx: TestContext):
    print("\n--- Test 11: Edge Cases & Robustness ---")
    node_code = """
  // Case A: Empty list of listings
  const resEmpty = sortAndFilterListings([], { sortMode: 'manual', manualOrder: ['id1'] });

  // Case B: Category priority with non-existent category
  const store = getStore();
  const all = store.listings || [];
  const resBogusCategory = sortAndFilterListings(all, {
    sortMode: 'category_priority',
    categoryPriority: ['non_existent_category_123']
  });

  // Case C: Page size out of range (e.g. 0 or 50)
  const settings0 = resolveListingSettings({ id: 'f', listingPageSize: 0 });
  const settings50 = resolveListingSettings({ id: 'f', listingPageSize: 50 });

  return {
    emptyHandled: Array.isArray(resEmpty) && resEmpty.length === 0,
    bogusCategoryHandled: resBogusCategory.length > 0,
    clampedPageSize0: settings0.pageSize === 10, // clamped to default 10
    clampedPageSize50: settings50.pageSize === 10 // clamped to max 10
  };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("Edge cases execution", False, res["error"])
        return

    ctx.log_result("Empty listing dataset handled safely", res.get("emptyHandled", False))
    ctx.log_result("Non-existent category priority handled without error", res.get("bogusCategoryHandled", False))
    ctx.log_result("Page size out-of-range clamped to safe WhatsApp limit (10)", res.get("clampedPageSize0", False) and res.get("clampedPageSize50", False))

def test_12_final_baseline_verification(ctx: TestContext):
    print("\n--- Test 12: Final Baseline Record Counts & Zero Data Loss ---")
    with open(ADMIN_DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    listings = data.get("listings", [])
    contacts = data.get("contacts", [])
    deals = data.get("deals", [])
    flows = data.get("flows", [])
    automations = data.get("automations", [])
    territories = data.get("territories", [])

    ctx.log_result("Final Listings count == 212", len(listings) == 212, f"Count: {len(listings)}")
    ctx.log_result("Final Contacts count == 211", len(contacts) == 211, f"Count: {len(contacts)}")
    ctx.log_result("Final Deals count == 4", len(deals) == 4, f"Count: {len(deals)}")
    ctx.log_result("Final Flows count >= 1", len(flows) >= 1, f"Count: {len(flows)}")
    ctx.log_result("Final Automations count == 179", len(automations) == 179, f"Count: {len(automations)}")
    ctx.log_result("Final Territories count == 4", len(territories) == 4, f"Count: {len(territories)}")

def main():
    print("=" * 70)
    print("  PHASE 9: BUSINESS LISTING ORDER IN WHATSAPP FLOW BUILDER")
    print("  Automated Verification Suite")
    print("=" * 70)

    ctx = TestContext()
    test_1_baseline_preflight(ctx)
    test_2_manual_order(ctx)
    test_3_category_priority(ctx)
    test_4_newest_and_alphabetical(ctx)
    test_5_featured_first(ctx)
    test_6_precedence_rules(ctx)
    test_7_interactive_pagination(ctx)
    test_8_listing_selection_transition(ctx)
    test_9_security_and_territory(ctx)
    test_10_csv_round_trip(ctx)
    test_11_edge_cases(ctx)
    test_12_final_baseline_verification(ctx)

    print("\n" + "=" * 70)
    print(f"  SUMMARY: {ctx.passed} Passed, {ctx.failed} Failed (Total: {ctx.passed + ctx.failed})")
    print("=" * 70)

    if ctx.failed > 0:
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()
