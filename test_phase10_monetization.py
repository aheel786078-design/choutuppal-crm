#!/usr/bin/env python3
"""
Phase 10 Automated Verification Test Suite
Premium & Featured Listings + Payment Gateway + Website + WhatsApp CRM

Dimensions:
1. Baseline Integrity Pre-Test (212 listings, 211 contacts, 4 deals, 1 flow, 179 automations, 4 territories)
2. Data Model & Compatibility Defaults (plans, subscriptions, featuredPromotions, orders, payments, webhookEvents)
3. Authoritative Plan Price Validation & Checkout Idempotency
4. Payment Gateway Adapter & HMAC-SHA256 Signature Verification
5. Webhook Replay Protection & Amount/Currency Validation
6. Entitlement Resolver Lifecycle (Active, Expiring, Expired, Decoupled, Unpublished Safety)
7. Website Integration & Authoritative Ranking
8. WhatsApp CRM Flow Integration & Dynamic Badging
9. Admin Offline Payment Auditable Verification ('manually_verified')
10. Expiry Window Detection & Renewal Handling
11. Multi-Tenant Territory Scoping
12. Final Baseline Record Counts & Zero Data Loss
"""

import json
import os
import shutil
import subprocess
import sys

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
import {{ getStore, saveStore, getDefaultListingPlans }} from './src/lib/store.ts';
import {{
  resolveListingEntitlements,
  getListingEntitlementsMap,
  isListingPremium,
  isListingFeatured,
  getExpiringEntitlements
}} from './src/lib/entitlement-resolver.ts';
import {{
  MockPaymentGatewayAdapter,
  RazorpayGatewayAdapter,
  getPaymentGatewayAdapter,
  generateTestWebhookSignature,
  generateTestPaymentSignature,
  getAuthoritativePlan,
  activateEntitlementsFromOrder,
  DEFAULT_MOCK_SECRET
}} from './src/lib/payment-gateway.ts';
import {{
  resolveListingSettings,
  sortAndFilterListings,
  evaluateFlow
}} from './src/lib/flow-runtime-engine.ts';

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
    temp_path = os.path.join(PROJECT_DIR, f".tmp_phase10_{os.getpid()}_{_eval_counter}.ts")
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
        d = json.load(f)

    listings = d.get("listings", [])
    contacts = d.get("contacts", [])
    deals = d.get("deals", [])
    flows = d.get("flows", [])
    automations = d.get("automations", [])
    territories = d.get("territories", [])

    ctx.log_result("Listings count == 212", len(listings) == 212, f"Found {len(listings)}")
    ctx.log_result("Contacts count == 211", len(contacts) == 211, f"Found {len(contacts)}")
    ctx.log_result("Deals count == 4", len(deals) == 4, f"Found {len(deals)}")
    ctx.log_result("Flows count >= 1", len(flows) >= 1, f"Found {len(flows)}")
    ctx.log_result("Automations count == 179", len(automations) == 179, f"Found {len(automations)}")
    ctx.log_result("Territories count == 4", len(territories) == 4, f"Found {len(territories)}")

    all_inactive = all(a.get("isActive") is False or a.get("status") in ("draft", "paused") for a in automations)
    ctx.log_result("All 179 automations are draft/inactive", all_inactive)


def test_2_model_and_compatibility_defaults(ctx: TestContext):
    print("\n--- Test 2: Data Model & Compatibility Defaults ---")
    node_code = """
  const store = getStore();
  const plans = store.plans || [];
  const premiumPlan = plans.find(p => p.id === 'plan_premium_monthly');
  const featuredPlan = plans.find(p => p.id === 'plan_featured_monthly');
  const bundlePlan = plans.find(p => p.id === 'plan_bundle_monthly');

  return {
    plansCount: plans.length,
    hasPremium: Boolean(premiumPlan && premiumPlan.price === 499),
    hasFeatured: Boolean(featuredPlan && featuredPlan.price === 199),
    hasBundle: Boolean(bundlePlan && bundlePlan.price === 599),
    hasSubscriptionsArray: Array.isArray(store.subscriptions),
    hasPromotionsArray: Array.isArray(store.featuredPromotions),
    hasOrdersArray: Array.isArray(store.orders),
    hasPaymentsArray: Array.isArray(store.payments),
    hasWebhookEventsArray: Array.isArray(store.webhookEvents)
  };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("Model defaults execution", False, res["error"])
        return

    ctx.log_result("Default plans initialized (>= 3 plans)", res.get("plansCount", 0) >= 3, f"Count: {res.get('plansCount')}")
    ctx.log_result("Premium plan configured at ₹499/mo", res.get("hasPremium", False))
    ctx.log_result("Featured plan configured at ₹199/mo", res.get("hasFeatured", False))
    ctx.log_result("Bundle plan configured at ₹599/mo", res.get("hasBundle", False))
    ctx.log_result("All normalized monetization arrays present in store",
                   res.get("hasSubscriptionsArray") and res.get("hasPromotionsArray") and
                   res.get("hasOrdersArray") and res.get("hasPaymentsArray") and res.get("hasWebhookEventsArray"))


def test_3_authoritative_plan_price(ctx: TestContext):
    print("\n--- Test 3: Authoritative Plan Price & Lookup ---")
    node_code = """
  const store = getStore();
  const authoritative = getAuthoritativePlan('plan_premium_monthly', store);
  const invalidPlan = getAuthoritativePlan('plan_non_existent_hacker', store);

  return {
    validPlanFound: Boolean(authoritative),
    price: authoritative?.price,
    currency: authoritative?.currency,
    invalidPlanIsNull: invalidPlan === null
  };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("Authoritative plan lookup execution", False, res["error"])
        return

    ctx.log_result("Authoritative plan successfully resolved", res.get("validPlanFound", False))
    ctx.log_result("Authoritative price is ₹499 INR", res.get("price") == 499 and res.get("currency") == "INR")
    ctx.log_result("Non-existent/tampered plan returns null", res.get("invalidPlanIsNull", False))


def test_4_payment_adapter_and_signatures(ctx: TestContext):
    print("\n--- Test 4: Payment Adapter & HMAC-SHA256 Signature Verification ---")
    node_code = """
  const adapter = new MockPaymentGatewayAdapter();
  const orderRes = await adapter.createOrder({
    orderId: 'ord_test_100',
    amount: 499,
    currency: 'INR',
    receipt: 'rcpt_100'
  });

  const secret = DEFAULT_MOCK_SECRET;
  const rawBody = JSON.stringify({ event: 'payment.captured', orderId: orderRes.gatewayOrderId, amount: 499 });
  const validWebhookSig = generateTestWebhookSignature(rawBody, secret);
  const invalidWebhookSig = 'invalid_tampered_signature_hex_1234567890abcdef';

  const isWebhookValid = adapter.verifyWebhookSignature({ rawBody, signature: validWebhookSig, secret });
  const isWebhookRejected = adapter.verifyWebhookSignature({ rawBody, signature: invalidWebhookSig, secret });

  const validPaymentSig = generateTestPaymentSignature('ord_test_100', 'pay_12345', secret);
  const isPaymentValid = adapter.verifyPaymentSignature({
    orderId: 'ord_test_100',
    paymentId: 'pay_12345',
    signature: validPaymentSig,
    secret
  });
  const isPaymentRejected = adapter.verifyPaymentSignature({
    orderId: 'ord_test_100',
    paymentId: 'pay_12345',
    signature: 'wrong_sig',
    secret
  });

  return {
    gatewayOrderIdGenerated: Boolean(orderRes.gatewayOrderId.startsWith('order_mock_')),
    isWebhookValid,
    isWebhookRejected,
    isPaymentValid,
    isPaymentRejected
  };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("Adapter signature execution", False, res["error"])
        return

    ctx.log_result("Gateway adapter creates mock order ID", res.get("gatewayOrderIdGenerated", False))
    ctx.log_result("Valid HMAC-SHA256 webhook signature verified", res.get("isWebhookValid", False))
    ctx.log_result("Invalid/tampered webhook signature rejected", not res.get("isWebhookRejected", True))
    ctx.log_result("Valid payment signature verified", res.get("isPaymentValid", False))
    ctx.log_result("Invalid payment signature rejected", not res.get("isPaymentRejected", True))


def test_5_webhook_replay_and_idempotency(ctx: TestContext):
    print("\n--- Test 5: Webhook Replay Protection & Idempotency ---")
    node_code = """
  const store = JSON.parse(JSON.stringify(getStore())); // Isolated in-memory copy
  const orderId = 'ord_fixture_test_5';
  const listingId = 'lst_1';
  const planId = 'plan_premium_monthly';

  store.orders.push({
    id: orderId,
    listingId,
    planId,
    amount: 499,
    currency: 'INR',
    status: 'pending',
    gateway: 'mock_gateway',
    gatewayOrderId: 'order_mock_fixture_5',
    idempotencyKey: 'idem_test_5',
    territoryId: 'territory_choutuppal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // First activation
  const activation1 = activateEntitlementsFromOrder(
    orderId,
    {
      paymentId: 'pay_mock_1',
      amount: 499,
      currency: 'INR',
      method: 'upi',
      status: 'verified',
      notes: 'Initial test activation',
      persist: false
    },
    store
  );

  const subCountAfter1 = (store.subscriptions || []).filter(s => s.orderId === orderId).length;

  // Duplicate replay activation
  const activation2 = activateEntitlementsFromOrder(
    orderId,
    {
      paymentId: 'pay_mock_1',
      amount: 499,
      currency: 'INR',
      method: 'upi',
      status: 'verified',
      notes: 'Duplicate replay test activation',
      persist: false
    },
    store
  );

  const subCountAfter2 = (store.subscriptions || []).filter(s => s.orderId === orderId).length;

  // Mismatched amount test
  let amountMismatchThrew = false;
  try {
    store.orders.push({
      id: 'ord_fixture_amount_mismatch',
      listingId,
      planId,
      amount: 499,
      currency: 'INR',
      status: 'pending',
      gateway: 'mock_gateway',
      idempotencyKey: 'idem_mismatch',
      territoryId: 'territory_choutuppal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    activateEntitlementsFromOrder(
      'ord_fixture_amount_mismatch',
      { paymentId: 'pay_bad', amount: 100, currency: 'INR', persist: false },
      store
    );
  } catch (err) {
    amountMismatchThrew = true;
  }

  return {
    activation1Success: activation1.success,
    subCountAfter1,
    activation2Success: activation2.success,
    subCountAfter2,
    idempotentMessage: activation2.message.includes('idempotent'),
    amountMismatchThrew
  };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("Webhook replay execution", False, res["error"])
        return

    ctx.log_result("First activation succeeds and creates subscription", res.get("activation1Success") and res.get("subCountAfter1") == 1)
    ctx.log_result("Duplicate activation does NOT duplicate subscription records", res.get("subCountAfter2") == 1)
    ctx.log_result("Duplicate activation returns idempotent response", res.get("idempotentMessage", False))
    ctx.log_result("Mismatched payment amount strictly rejected with error", res.get("amountMismatchThrew", False))


def test_6_entitlement_resolver_lifecycle(ctx: TestContext):
    print("\n--- Test 6: Entitlement Resolver Lifecycle & Decoupling ---")
    node_code = """
  const store = JSON.parse(JSON.stringify(getStore()));
  const now = new Date('2026-06-15T12:00:00.000Z');

  // Case A: Listing with active Premium subscription
  const listingA = store.listings[0]; // published
  store.subscriptions.push({
    id: 'sub_a',
    listingId: listingA.id,
    territoryId: listingA.territoryId,
    planId: 'plan_premium_monthly',
    status: 'active',
    startsAt: '2026-06-01T00:00:00.000Z',
    expiresAt: '2026-07-01T00:00:00.000Z',
    autoRenew: false,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  });
  const entA = resolveListingEntitlements(listingA.id, store, now);

  // Case B: Listing with EXPIRED Premium subscription
  const listingB = store.listings[1];
  store.subscriptions.push({
    id: 'sub_b',
    listingId: listingB.id,
    territoryId: listingB.territoryId,
    planId: 'plan_premium_monthly',
    status: 'expired',
    startsAt: '2026-05-01T00:00:00.000Z',
    expiresAt: '2026-06-01T00:00:00.000Z', // In past
    autoRenew: false,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  });
  const entB = resolveListingEntitlements(listingB.id, store, now);

  // Case C: Listing with active Featured promotion (Decoupling test: MUST NOT be premium!)
  const listingC = store.listings[2];
  listingC.isPremium = false;
  store.featuredPromotions.push({
    id: 'promo_c',
    listingId: listingC.id,
    territoryId: listingC.territoryId,
    status: 'active',
    startsAt: '2026-06-01T00:00:00.000Z',
    expiresAt: '2026-07-01T00:00:00.000Z',
    priority: 150,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  });
  const entC = resolveListingEntitlements(listingC.id, store, now);

  // Case D: Unpublished listing with active paid subscription (Safety test: MUST NOT be eligible!)
  const listingD = JSON.parse(JSON.stringify(store.listings[3]));
  listingD.id = 'lst_unpub_paid';
  listingD.status = 'rejected';
  store.listings.push(listingD);
  store.subscriptions.push({
    id: 'sub_d',
    listingId: 'lst_unpub_paid',
    territoryId: listingD.territoryId,
    planId: 'plan_premium_monthly',
    status: 'active',
    startsAt: '2026-06-01T00:00:00.000Z',
    expiresAt: '2026-07-01T00:00:00.000Z',
    autoRenew: false,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  });
  const entD = resolveListingEntitlements('lst_unpub_paid', store, now);

  return {
    entA_isPremium: entA.isPremium,
    entA_eligible: entA.eligibleForWebsite,
    entB_isPremium: entB.isPremium, // Must be FALSE because expired
    entC_isFeatured: entC.isFeatured,
    entC_isPremium: entC.isPremium,   // Must be FALSE because only featured was purchased!
    entC_priority: entC.featuredPriority,
    entD_eligibleWebsite: entD.eligibleForWebsite, // Must be FALSE
    entD_eligibleWhatsApp: entD.eligibleForWhatsApp, // Must be FALSE
    entD_isPremium: entD.isPremium // Must be FALSE because unpublished
  };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("Resolver lifecycle execution", False, res["error"])
        return

    ctx.log_result("Active subscription grants isPremium: true", res.get("entA_isPremium", False))
    ctx.log_result("Expired subscription immediately loses isPremium (false)", not res.get("entB_isPremium", True))
    ctx.log_result("Active promotion grants isFeatured: true with priority 150", res.get("entC_isFeatured", False) and res.get("entC_priority") == 150)
    ctx.log_result("Entitlement decoupling strictly enforced (Featured does NOT become Premium)", not res.get("entC_isPremium", True))
    ctx.log_result("Unpublished listing with paid subscription withheld from Website & WhatsApp",
                   not res.get("entD_eligibleWebsite", True) and not res.get("entD_eligibleWhatsApp", True) and not res.get("entD_isPremium", True))


def test_7_featured_sorting_with_live_promotions(ctx: TestContext):
    print("\n--- Test 7: Authoritative Ranking with Live Promotions ---")
    node_code = """
  const store = JSON.parse(JSON.stringify(getStore()));
  const now = new Date('2026-06-15T12:00:00.000Z');

  // Clear baseline featured flags to test pure live promotion precedence
  store.listings.forEach(l => {
    l.isFeatured = false;
    l.isPremium = false;
  });

  const targetId = 'lst_dir_25'; // A normal business
  const targetListing = store.listings.find(l => l.id === targetId);

  // Grant active featured promotion to target listing with high priority
  store.featuredPromotions.push({
    id: 'promo_target',
    listingId: targetId,
    territoryId: targetListing.territoryId,
    status: 'active',
    startsAt: '2026-06-01T00:00:00.000Z',
    expiresAt: '2026-07-01T00:00:00.000Z',
    priority: 500,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  });

  const sortedActive = sortAndFilterListings(store.listings, {
    sortMode: 'featured',
    store,
    asOf: now
  });

  // Now test after expiry date
  const futureDate = new Date('2026-08-01T00:00:00.000Z'); // After July 1
  const sortedExpired = sortAndFilterListings(store.listings, {
    sortMode: 'featured',
    store,
    asOf: futureDate
  });

  return {
    topActiveId: sortedActive[0]?.id,
    isTargetFirstWhenActive: sortedActive[0]?.id === targetId,
    isTargetFirstWhenExpired: sortedExpired[0]?.id === targetId
  };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("Authoritative ranking execution", False, res["error"])
        return

    ctx.log_result("Listing with active promotion ranks #1 in featured sort", res.get("isTargetFirstWhenActive", False), f"Top ID: {res.get('topActiveId')}")
    ctx.log_result("Expired promotion immediately loses #1 rank without background daemon", not res.get("isTargetFirstWhenExpired", True))


def test_8_whatsapp_crm_flow_integration(ctx: TestContext):
    print("\n--- Test 8: WhatsApp CRM Flow Integration & Badging ---")
    node_code = """
  const store = JSON.parse(JSON.stringify(getStore()));
  const now = new Date('2026-06-15T12:00:00.000Z');

  // Clear baseline flags to test pure live promotion dynamic badging
  store.listings.forEach(l => {
    l.isFeatured = false;
    l.isPremium = false;
  });

  // Grant featured to lst_1
  store.featuredPromotions.push({
    id: 'promo_flow_test',
    listingId: 'lst_1',
    territoryId: 'territory_choutuppal',
    status: 'active',
    startsAt: '2026-06-01T00:00:00.000Z',
    expiresAt: '2026-07-01T00:00:00.000Z',
    priority: 500,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  });

  const flow = {
    id: 'flow_featured_test',
    name: 'Featured Test Flow',
    status: 'published',
    triggers: [{ type: 'keyword', value: 'featured' }],
    entryNodeId: 'node_list',
    nodes: [{
      id: 'node_list',
      type: 'send_list',
      title: 'Featured Businesses',
      config: {
        listingSortMode: 'featured',
        listingPageSize: 5
      }
    }]
  };

  const evalResult = await evaluateFlow({
    flow,
    incomingText: 'featured',
    territory: store.territories[0],
    storeListings: store.listings,
    inStore: store,
    asOf: now,
    allowDraft: true
  });

  const listRows = evalResult.listSections?.[0]?.rows || [];
  const firstRow = listRows[0];
  const hasStarBadge = Boolean(firstRow && firstRow.title.includes('⭐'));

  return {
    matched: evalResult.matched,
    flowId: evalResult.flowId,
    hasListSections: Boolean(evalResult.listSections?.length),
    firstRowTitle: firstRow?.title,
    hasStarBadge
  };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("WhatsApp flow evaluation execution", False, res["error"])
        return

    ctx.log_result("WhatsApp flow evaluation matches successfully", res.get("matched", False), f"Flow: {res.get('flowId')}")
    ctx.log_result("Dynamic listing rows generated with interactive list", res.get("hasListSections", False))
    ctx.log_result("Active featured listing rendered with ⭐ badge in list row", res.get("hasStarBadge", False), f"Row: {res.get('firstRowTitle')}")


def test_9_admin_offline_payment_verification(ctx: TestContext):
    print("\n--- Test 9: Admin Offline Payment Verification ('manually_verified') ---")
    node_code = """
  const store = JSON.parse(JSON.stringify(getStore()));
  const orderId = 'ord_offline_test_9';
  const listingId = 'lst_5';

  store.orders.push({
    id: orderId,
    listingId,
    planId: 'plan_bundle_monthly',
    amount: 599,
    currency: 'INR',
    status: 'pending',
    gateway: 'mock_gateway',
    idempotencyKey: 'idem_offline_9',
    territoryId: 'territory_choutuppal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Verify offline
  const result = activateEntitlementsFromOrder(
    orderId,
    {
      paymentId: 'upi_ref_1234567890',
      amount: 599,
      currency: 'INR',
      method: 'offline_cash_upi',
      status: 'manually_verified',
      notes: 'Received cash at office counter. Verified by Finance Admin.',
      actorId: 'ADMIN_FINANCE',
      actorName: 'Lead Accountant',
      persist: false
    },
    store
  );

  const sub = (store.subscriptions || []).find(s => s.orderId === orderId);
  const promo = (store.featuredPromotions || []).find(p => p.orderId === orderId);
  const payment = (store.payments || []).find(p => p.orderId === orderId);
  const audit = (store.auditLogs || []).find(a => a.action === 'PAYMENT_MANUALLY_VERIFIED');

  return {
    orderStatus: result.order.status,
    paymentStatus: payment?.status,
    paymentMethod: payment?.paymentMethod,
    subCreated: Boolean(sub && sub.status === 'active'),
    promoCreated: Boolean(promo && promo.status === 'active'),
    auditLogged: Boolean(audit && audit.actorId === 'ADMIN_FINANCE')
  };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("Offline verification execution", False, res["error"])
        return

    ctx.log_result("Order status updated to paid", res.get("orderStatus") == "paid")
    ctx.log_result("Payment recorded with status manually_verified", res.get("paymentStatus") == "manually_verified")
    ctx.log_result("Bundle activation creates both active subscription and promotion", res.get("subCreated") and res.get("promoCreated"))
    ctx.log_result("Audit log records manual verification with responsible actor", res.get("auditLogged", False))


def test_10_expiry_window_detection(ctx: TestContext):
    print("\n--- Test 10: Expiry Window Detection (7-Day Warning) ---")
    node_code = """
  const store = JSON.parse(JSON.stringify(getStore()));
  const now = new Date('2026-06-15T12:00:00.000Z');

  // Sub 1: Expires in 3 days (Within 7-day window)
  store.subscriptions.push({
    id: 'sub_expiring_soon',
    listingId: 'lst_10',
    territoryId: 'territory_choutuppal',
    planId: 'plan_premium_monthly',
    status: 'active',
    startsAt: '2026-05-18T00:00:00.000Z',
    expiresAt: '2026-06-18T12:00:00.000Z', // 3 days from now
    autoRenew: false,
    createdAt: '2026-05-18T00:00:00.000Z',
    updatedAt: '2026-05-18T00:00:00.000Z',
  });

  // Sub 2: Expires in 20 days (Outside 7-day window)
  store.subscriptions.push({
    id: 'sub_not_expiring',
    listingId: 'lst_11',
    territoryId: 'territory_choutuppal',
    planId: 'plan_premium_monthly',
    status: 'active',
    startsAt: '2026-06-05T00:00:00.000Z',
    expiresAt: '2026-07-05T12:00:00.000Z', // 20 days from now
    autoRenew: false,
    createdAt: '2026-06-05T00:00:00.000Z',
    updatedAt: '2026-06-05T00:00:00.000Z',
  });

  const expiring = getExpiringEntitlements(store, 7, now);

  return {
    expiringSubsCount: expiring.expiringSubscriptions.length,
    foundExpiringId: expiring.expiringSubscriptions[0]?.id
  };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("Expiry window execution", False, res["error"])
        return

    ctx.log_result("Correctly identifies subscription expiring within 7 days",
                   res.get("expiringSubsCount") == 1 and res.get("foundExpiringId") == "sub_expiring_soon")


def test_11_territory_scoping(ctx: TestContext):
    print("\n--- Test 11: Multi-Tenant Territory Scoping ---")
    node_code = """
  const store = getStore();
  const choutuppalListings = sortAndFilterListings(store.listings, { territoryId: 'territory_choutuppal' });
  const nalgondaListings = sortAndFilterListings(store.listings, { territoryId: 'territory_nalgonda' });

  const hasLeakInChoutuppal = choutuppalListings.some(l => l.territoryId === 'territory_nalgonda');
  const hasLeakInNalgonda = nalgondaListings.some(l => l.territoryId === 'territory_choutuppal');

  return {
    choutuppalCount: choutuppalListings.length,
    nalgondaCount: nalgondaListings.length,
    hasLeakInChoutuppal,
    hasLeakInNalgonda
  };
"""
    res = run_node_ts(node_code)
    if "error" in res:
        ctx.log_result("Territory scoping execution", False, res["error"])
        return

    ctx.log_result("Choutuppal territory scoped correctly", res.get("choutuppalCount", 0) > 0 and not res.get("hasLeakInChoutuppal", True))
    ctx.log_result("Nalgonda territory scoped correctly without cross-tenant leak", not res.get("hasLeakInNalgonda", True))


def test_12_final_baseline_counts(ctx: TestContext):
    print("\n--- Test 12: Final Baseline Record Counts & Zero Data Loss ---")
    with open(ADMIN_DATA_PATH, "r", encoding="utf-8") as f:
        d = json.load(f)

    listings = d.get("listings", [])
    contacts = d.get("contacts", [])
    deals = d.get("deals", [])
    flows = d.get("flows", [])
    automations = d.get("automations", [])
    territories = d.get("territories", [])
    subscriptions = d.get("subscriptions", [])
    orders = d.get("orders", [])
    payments = d.get("payments", [])
    promotions = d.get("featuredPromotions", [])

    ctx.log_result("Final Listings count == 212", len(listings) == 212, f"Count: {len(listings)}")
    ctx.log_result("Final Contacts count == 211", len(contacts) == 211, f"Count: {len(contacts)}")
    ctx.log_result("Final Deals count == 4", len(deals) == 4, f"Count: {len(deals)}")
    ctx.log_result("Final Flows count >= 1", len(flows) >= 1, f"Count: {len(flows)}")
    ctx.log_result("Final Automations count == 179", len(automations) == 179, f"Count: {len(automations)}")
    ctx.log_result("Final Territories count == 4", len(territories) == 4, f"Count: {len(territories)}")
    ctx.log_result("Zero lingering test subscriptions in disk store", len(subscriptions) == 0, f"Count: {len(subscriptions)}")
    ctx.log_result("Zero lingering test orders in disk store", len(orders) == 0, f"Count: {len(orders)}")
    ctx.log_result("Zero lingering test payments in disk store", len(payments) == 0, f"Count: {len(payments)}")
    ctx.log_result("Zero lingering test promotions in disk store", len(promotions) == 0, f"Count: {len(promotions)}")


def main():
    print("=" * 70)
    print("  PHASE 10: PREMIUM & FEATURED LISTINGS + PAYMENT SYSTEM")
    print("  Automated Verification Suite")
    print("=" * 70)

    # Automated pre-test snapshot
    backup_file = ADMIN_DATA_PATH + ".bak_phase10_test_tmp"
    shutil.copyfile(ADMIN_DATA_PATH, backup_file)

    ctx = TestContext()

    try:
        test_1_baseline_preflight(ctx)
        test_2_model_and_compatibility_defaults(ctx)
        test_3_authoritative_plan_price(ctx)
        test_4_payment_adapter_and_signatures(ctx)
        test_5_webhook_replay_and_idempotency(ctx)
        test_6_entitlement_resolver_lifecycle(ctx)
        test_7_featured_sorting_with_live_promotions(ctx)
        test_8_whatsapp_crm_flow_integration(ctx)
        test_9_admin_offline_payment_verification(ctx)
        test_10_expiry_window_detection(ctx)
        test_11_territory_scoping(ctx)
        test_12_final_baseline_counts(ctx)
    finally:
        # Check if disk file was modified
        if os.path.exists(backup_file):
            with open(ADMIN_DATA_PATH, "r", encoding="utf-8") as f:
                cur_d = json.load(f)
            # If any test records leaked to disk, restore from snapshot
            if len(cur_d.get("orders", [])) > 0 or len(cur_d.get("subscriptions", [])) > 0:
                print("  [CLEANUP] Restoring baseline data from pre-test snapshot...")
                shutil.copyfile(backup_file, ADMIN_DATA_PATH)
            os.remove(backup_file)

    print("\n" + "=" * 70)
    print(f"  SUMMARY: {ctx.passed} Passed, {ctx.failed} Failed (Total: {ctx.passed + ctx.failed})")
    print("=" * 70 + "\n")

    if ctx.failed > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
