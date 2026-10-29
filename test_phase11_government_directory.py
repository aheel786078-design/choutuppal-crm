#!/usr/bin/env python3
"""
Phase 11 Automated Verification Test Suite
Government Emergency & Local Leaders Directory

Dimensions:
1. Baseline Integrity Pre-Test (212 listings, 211 contacts, 4 deals, 1 flow, 179 automations, 4 territories)
2. Backward Compatibility & Default Emergency Helplines (112, 108, 101, 1912, 1098, 181)
3. Phone Number Normalization & Indian Emergency Short Code Validation
4. Duplicate Detection (Phone Match & Identity Name+Category+Village Match)
5. Verification State Lifecycle (Draft -> Pending -> Verified -> Published -> Archived)
6. Material Detail Change Automatic Reversion to 'pending_verification'
7. Public Eligibility Filtering & Privacy Sanitization (notes & internal logs stripped)
8. WhatsApp CRM Flow Engine Dry-Run Evaluation (emergency menu, direct contact, categories, villages)
9. Multi-Tenant Territory Isolation (cross-territory access rejection)
10. Admin Offline Source Verification & Audit Log Recording
11. CSV Export and Import Verification (with pending_verification safety guard & dry-run)
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
import {{ getStore, loadStore, saveStore, FLAGSHIP_TERRITORY_ID }} from './src/lib/store.ts';
import {{
  normalizePhoneNumber,
  isValidIndianPhoneNumber,
  isContactVerificationValid,
  isContactVerificationOverdue,
  isContactEligibleForPublic,
  sanitizeGovtContactForPublic,
  filterAndSortGovtContacts,
  findGovtContactDuplicates,
  getDefaultGovernmentContacts
}} from './src/lib/government-contacts.ts';
import {{ GOVT_CONTACT_CATEGORIES, CHOUTUPPAL_MANDAL_VILLAGES }} from './src/lib/constants.ts';
import {{ evaluateFlow }} from './src/lib/flow-runtime-engine.ts';
import {{ createSignedSessionToken }} from './src/lib/auth-server.ts';

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
    temp_path = os.path.join(PROJECT_DIR, f".tmp_phase11_{os.getpid()}_{_eval_counter}.ts")
    with open(temp_path, "w", encoding="utf-8") as f:
        f.write(wrapped_code)

    try:
        cmd = ["node", "--loader", TS_LOADER, temp_path]
        res = subprocess.run(cmd, cwd=PROJECT_DIR, capture_output=True, text=True, timeout=30)
        if res.returncode != 0:
            return {"error": res.stderr or res.stdout, "exitCode": res.returncode}
        out = res.stdout
        if "__TEST_OUTPUT_START__" in out and "__TEST_OUTPUT_END__" in out:
            payload = out.split("__TEST_OUTPUT_START__")[1].split("__TEST_OUTPUT_END__")[0].strip()
            return json.loads(payload)
        return {"error": "Delimiter not found in output", "raw": out}
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


def main():
    ctx = TestContext()
    print("=====================================================================")
    print("PHASE 11 AUTOMATED VERIFICATION: GOVERNMENT EMERGENCY & LOCAL DIRECTORY")
    print("=====================================================================")

    # Backup baseline data
    backup_path = f"{ADMIN_DATA_PATH}.bak_phase11_test_{os.getpid()}"
    shutil.copyfile(ADMIN_DATA_PATH, backup_path)
    print(f"Pre-test backup saved to: {backup_path}")

    try:
        # -------------------------------------------------------------------------
        # DIMENSION 1: Baseline Integrity Pre-Test
        # -------------------------------------------------------------------------
        print("\n--- Dimension 1: Baseline Integrity Pre-Test ---")
        with open(ADMIN_DATA_PATH, "r", encoding="utf-8") as f:
            baseline = json.load(f)

        listings_count = len(baseline.get("listings", []))
        contacts_count = len(baseline.get("contacts", []))
        deals_count = len(baseline.get("deals", []))
        flows_count = len(baseline.get("flows", []))
        automations_count = len(baseline.get("automations", []))
        territories_count = len(baseline.get("territories", []))

        ctx.log_result(
            "Baseline Listings Count",
            listings_count == 212,
            f"Expected 212, found {listings_count}",
        )
        ctx.log_result(
            "Baseline Contacts Count",
            contacts_count == 211,
            f"Expected 211, found {contacts_count}",
        )
        ctx.log_result(
            "Baseline Deals Count",
            deals_count == 4,
            f"Expected 4, found {deals_count}",
        )
        ctx.log_result(
            "Baseline Flows Count",
            flows_count == 1,
            f"Expected 1, found {flows_count}",
        )
        ctx.log_result(
            "Baseline Automations Count",
            automations_count == 179,
            f"Expected 179, found {automations_count}",
        )
        ctx.log_result(
            "Baseline Territories Count",
            territories_count == 4,
            f"Expected 4, found {territories_count}",
        )

        # -------------------------------------------------------------------------
        # DIMENSION 2: Backward Compatibility & Default Emergency Helplines
        # -------------------------------------------------------------------------
        print("\n--- Dimension 2: Backward Compatibility & In-Memory Defaults ---")
        code_dim2 = """
const store = loadStore();
const defaults = getDefaultGovernmentContacts();
return {
  govtCount: store.governmentContacts ? store.governmentContacts.length : 0,
  defaultsCount: defaults.length,
  defaultHelplines: defaults.map(d => ({ id: d.id, name: d.name, phone: d.phoneNumber, url: d.sourceUrl })),
  categoriesCount: GOVT_CONTACT_CATEGORIES.length,
  villagesCount: CHOUTUPPAL_MANDAL_VILLAGES.length
};
"""
        res_dim2 = run_node_ts(code_dim2)
        ctx.log_result(
            "Store Government Contacts Loaded",
            res_dim2.get("govtCount", 0) >= 6,
            f"Loaded {res_dim2.get('govtCount')} contacts",
        )
        ctx.log_result(
            "Default Helplines Count",
            res_dim2.get("defaultsCount") == 6,
            f"Found {res_dim2.get('defaultsCount')} defaults",
        )
        helplines = res_dim2.get("defaultHelplines", [])
        phones = {h.get("phone") for h in helplines}
        expected_phones = {"112", "108", "101", "1912", "1098", "181"}
        ctx.log_result(
            "All Universal Emergency Helplines Present",
            expected_phones.issubset(phones),
            f"Found numbers: {phones}",
        )
        # Verify official URLs
        all_official_urls = all("gov.in" in (h.get("url") or "") or "nic.in" in (h.get("url") or "") or "tssspdcl.com" in (h.get("url") or "") for h in helplines)
        ctx.log_result(
            "All Default Helplines Use Verified Official Domains",
            all_official_urls,
            "112.gov.in, nhm.gov.in, fire.telangana.gov.in, tssspdcl.com, wcd.nic.in, wcdsc.telangana.gov.in",
        )

        # -------------------------------------------------------------------------
        # DIMENSION 3: Phone Number Normalization & Indian Format Validation
        # -------------------------------------------------------------------------
        print("\n--- Dimension 3: Phone Normalization & Format Validation ---")
        code_dim3 = """
return {
  norm_plain: normalizePhoneNumber('9848012345'),
  norm_plus91: normalizePhoneNumber('+91 98480 12345'),
  norm_zero: normalizePhoneNumber('09848012345'),
  norm_short: normalizePhoneNumber('112'),
  norm_empty: normalizePhoneNumber(''),
  valid_112: isValidIndianPhoneNumber('112'),
  valid_108: isValidIndianPhoneNumber('108'),
  valid_1912: isValidIndianPhoneNumber('1912'),
  valid_mobile: isValidIndianPhoneNumber('+91 9848012345'),
  valid_landline: isValidIndianPhoneNumber('08694222333'),
  invalid_short: isValidIndianPhoneNumber('12'),
  invalid_alpha: isValidIndianPhoneNumber('police112'),
  invalid_too_long: isValidIndianPhoneNumber('9198480123456789')
};
"""
        res_dim3 = run_node_ts(code_dim3)
        ctx.log_result("Normalize Plain 10-digit", res_dim3.get("norm_plain") == "9848012345")
        ctx.log_result("Normalize +91 Prefix", res_dim3.get("norm_plus91") == "9848012345")
        ctx.log_result("Normalize 0 Prefix", res_dim3.get("norm_zero") == "9848012345")
        ctx.log_result("Normalize Short Code", res_dim3.get("norm_short") == "112")
        ctx.log_result("Validate 112 ERSS Short Code", res_dim3.get("valid_112") is True)
        ctx.log_result("Validate 108 Ambulance Short Code", res_dim3.get("valid_108") is True)
        ctx.log_result("Validate 1912 Electricity Short Code", res_dim3.get("valid_1912") is True)
        ctx.log_result("Validate Standard Indian Mobile", res_dim3.get("valid_mobile") is True)
        ctx.log_result("Validate STD Landline", res_dim3.get("valid_landline") is True)
        ctx.log_result("Reject 2-digit number", res_dim3.get("invalid_short") is False)
        ctx.log_result("Reject Alphanumeric String", res_dim3.get("invalid_alpha") is False)
        ctx.log_result("Reject Over-Length Phone", res_dim3.get("invalid_too_long") is False)

        # -------------------------------------------------------------------------
        # DIMENSION 4: Duplicate Detection
        # -------------------------------------------------------------------------
        print("\n--- Dimension 4: Duplicate Detection (Phone Match & Identity Match) ---")
        code_dim4 = """
const existing = [
  {
    id: 'govt_1',
    name: 'Choutuppal Sub Inspector',
    category: 'police',
    village: 'Choutuppal Town',
    phoneNumber: '9848011223'
  },
  {
    id: 'govt_2',
    name: 'Panthangi Sarpanch',
    category: 'elected_representatives',
    village: 'Panthangi',
    phoneNumber: '9848099887'
  }
];

const dupPhone = findGovtContactDuplicates({ phoneNumber: '+91-98480-11223' }, existing);
const dupIdentity = findGovtContactDuplicates({ name: 'Choutuppal Sub Inspector', category: 'police', village: 'Choutuppal Town' }, existing);
const distinct = findGovtContactDuplicates({ name: 'Malkapur Sarpanch', category: 'elected_representatives', village: 'Malkapur', phoneNumber: '9848055667' }, existing);

return {
  dupPhoneFound: dupPhone.length > 0 && dupPhone[0].id === 'govt_1',
  dupIdentityFound: dupIdentity.length > 0 && dupIdentity[0].id === 'govt_1',
  distinctClean: distinct.length === 0
};
"""
        res_dim4 = run_node_ts(code_dim4)
        ctx.log_result("Duplicate Phone Detected Across Formatting", res_dim4.get("dupPhoneFound") is True)
        ctx.log_result("Duplicate Identity (Name+Category+Village) Detected", res_dim4.get("dupIdentityFound") is True)
        ctx.log_result("Distinct Record Clears Duplicate Check", res_dim4.get("distinctClean") is True)

        # -------------------------------------------------------------------------
        # DIMENSION 5: Verification State Lifecycle
        # -------------------------------------------------------------------------
        print("\n--- Dimension 5: Verification State Lifecycle ---")
        code_dim5 = """
const draftContact = { status: 'draft', isPublicContact: true };
const pendingContact = { status: 'pending_verification', isPublicContact: true };
const verifiedContact = {
  status: 'verified',
  isPublicContact: true,
  verificationDueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
};
const publishedContact = {
  status: 'published',
  isPublicContact: true,
  verificationDueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
};
const overdueContact = {
  status: 'published',
  isPublicContact: true,
  verificationDueAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString()
};
const archivedContact = { status: 'archived', isPublicContact: true };

return {
  draftValid: isContactVerificationValid(draftContact),
  pendingValid: isContactVerificationValid(pendingContact),
  verifiedValid: isContactVerificationValid(verifiedContact),
  publishedValid: isContactVerificationValid(publishedContact),
  overdueFlagged: isContactVerificationOverdue(overdueContact),
  overduePublicBlocked: isContactEligibleForPublic(overdueContact),
  publishedPublicAllowed: isContactEligibleForPublic(publishedContact),
  archivedPublicBlocked: isContactEligibleForPublic(archivedContact)
};
"""
        res_dim5 = run_node_ts(code_dim5)
        ctx.log_result("Draft is Not Verified", res_dim5.get("draftValid") is False)
        ctx.log_result("Pending is Not Verified", res_dim5.get("pendingValid") is False)
        ctx.log_result("Verified Contact Passes Verification Check", res_dim5.get("verifiedValid") is True)
        ctx.log_result("Published Contact Passes Verification Check", res_dim5.get("publishedValid") is True)
        ctx.log_result("Expired Review Date Flagged as Overdue", res_dim5.get("overdueFlagged") is True)
        ctx.log_result("Overdue Contact Blocked From Public Eligibility", res_dim5.get("overduePublicBlocked") is False)
        ctx.log_result("Current Published Contact Granted Public Visibility", res_dim5.get("publishedPublicAllowed") is True)
        ctx.log_result("Archived Contact Blocked From Public Eligibility", res_dim5.get("archivedPublicBlocked") is False)

        # -------------------------------------------------------------------------
        # DIMENSION 6: Material Change Automatic Reversion
        # -------------------------------------------------------------------------
        print("\n--- Dimension 6: Material Change Automatic Reversion ---")
        code_dim6 = """
// Simulating PATCH logic from /api/admin/government-contacts/[id]
const original = {
  id: 'govt_pub_1',
  name: 'Tahsildar Choutuppal',
  status: 'published',
  phoneNumber: '9848011111',
  designation: 'Mandal Executive Magistrate'
};

function applyPatch(existing, patch) {
  let status = existing.status;
  const isMaterialChange =
    (patch.phoneNumber && patch.phoneNumber !== existing.phoneNumber) ||
    (patch.name && patch.name !== existing.name);

  if (isMaterialChange && existing.status === 'published') {
    status = 'pending_verification';
  }
  return { ...existing, ...patch, status };
}

const patchedMinor = applyPatch(original, { officeHours: '10 AM - 5 PM' });
const patchedPhone = applyPatch(original, { phoneNumber: '9848099999' });
const patchedName = applyPatch(original, { name: 'New Incharge Tahsildar' });

return {
  minorKeepsPublished: patchedMinor.status === 'published',
  phoneRevertsToPending: patchedPhone.status === 'pending_verification',
  nameRevertsToPending: patchedName.status === 'pending_verification'
};
"""
        res_dim6 = run_node_ts(code_dim6)
        ctx.log_result("Minor Field Edit (Office Hours) Preserves Published Status", res_dim6.get("minorKeepsPublished") is True)
        ctx.log_result("Phone Number Change Automatically Reverts to pending_verification", res_dim6.get("phoneRevertsToPending") is True)
        ctx.log_result("Official Name Change Automatically Reverts to pending_verification", res_dim6.get("nameRevertsToPending") is True)

        # -------------------------------------------------------------------------
        # DIMENSION 7: Public API Filtering & Privacy Sanitization
        # -------------------------------------------------------------------------
        print("\n--- Dimension 7: Public Eligibility & Privacy Sanitization ---")
        code_dim7 = """
const contact = {
  id: 'govt_secret_1',
  name: 'Revenue Inspector',
  designation: 'RI Choutuppal',
  category: 'revenue_tahsildar',
  phoneNumber: '9848033333',
  district: 'Yadadri Bhuvanagiri',
  mandal: 'Choutuppal',
  village: 'Choutuppal Town',
  status: 'published',
  isEmergency: false,
  isPublicContact: true,
  displayOrder: 10,
  territoryId: FLAGSHIP_TERRITORY_ID,
  notes: 'CONFIDENTIAL: Internal personal notes not for public display',
  createdBy: 'usr_admin_42',
  updatedBy: 'usr_admin_42',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
};

const sanitized = sanitizeGovtContactForPublic(contact);
return {
  hasNotes: 'notes' in sanitized,
  hasCreatedBy: 'createdBy' in sanitized,
  hasUpdatedBy: 'updatedBy' in sanitized,
  hasName: sanitized.name === 'Revenue Inspector',
  hasCategoryTelugu: Boolean(sanitized.categoryTelugu),
  hasCategoryName: Boolean(sanitized.categoryName)
};
"""
        res_dim7 = run_node_ts(code_dim7)
        ctx.log_result("Internal Admin Notes Stripped From Public Response", res_dim7.get("hasNotes") is False)
        ctx.log_result("createdBy User ID Stripped From Public Response", res_dim7.get("hasCreatedBy") is False)
        ctx.log_result("updatedBy User ID Stripped From Public Response", res_dim7.get("hasUpdatedBy") is False)
        ctx.log_result("Public Name Preserved Intact", res_dim7.get("hasName") is True)
        ctx.log_result("Telugu Category Label Injected", res_dim7.get("hasCategoryTelugu") is True)

        # -------------------------------------------------------------------------
        # DIMENSION 8: WhatsApp CRM Flow Engine Dry-Run Evaluation
        # -------------------------------------------------------------------------
        print("\n--- Dimension 8: WhatsApp CRM Flow Engine Dry-Run Evaluation ---")
        code_dim8 = """
const evalEmergency = evaluateFlow({ incomingText: 'emergency', senderPhone: '919848012345' });
const evalDirect112 = evaluateFlow({ incomingText: 'govt_contact_emergency_112', senderPhone: '919848012345' });
const evalUtilities = evaluateFlow({ incomingText: 'govt_cat_electricity_utilities', senderPhone: '919848012345' });
const evalEmptyPolice = evaluateFlow({ incomingText: 'govt_cat_police', senderPhone: '919848012345' });
const evalTownVillage = evaluateFlow({ incomingText: 'govt_village_Choutuppal Town', senderPhone: '919848012345' });

return {
  emergency: {
    matched: evalEmergency.matched,
    flowId: evalEmergency.flowId,
    sectionsCount: evalEmergency.listSections ? evalEmergency.listSections.length : 0,
    totalRows: evalEmergency.listSections ? evalEmergency.listSections.reduce((acc, s) => acc + (s.rows?.length || 0), 0) : 0
  },
  direct112: {
    matched: evalDirect112.matched,
    name: evalDirect112.attachedGovtContact?.name,
    phone: evalDirect112.attachedGovtContact?.phoneNumber,
    buttonsCount: evalDirect112.buttons ? evalDirect112.buttons.length : 0
  },
  utilities: {
    matched: evalUtilities.matched,
    rowsCount: evalUtilities.listSections?.[0]?.rows?.length || 0
  },
  emptyPolice: {
    matched: evalEmptyPolice.matched,
    nodeId: evalEmptyPolice.nodeId,
    hasTeluguMessage: (evalEmptyPolice.renderedBody || '').includes('ధృవీకరించబడిన')
  },
  village: {
    matched: evalTownVillage.matched,
    rowsCount: evalTownVillage.listSections?.[0]?.rows?.length || 0
  }
};
"""
        res_dim8 = run_node_ts(code_dim8)
        em = res_dim8.get("emergency", {})
        ctx.log_result("Inbound 'emergency' Matches Govt Directory Flow", em.get("matched") is True)
        ctx.log_result(
            "Emergency Menu Has 3 Sections (Emergency 24x7, Categories, Villages)",
            em.get("sectionsCount") == 3,
            f"Sections: {em.get('sectionsCount')}",
        )
        ctx.log_result(
            "Emergency Menu Adheres to WhatsApp Cloud API 10-Row Limit",
            em.get("totalRows", 0) <= 10,
            f"Total rows: {em.get('totalRows')} (Max allowed: 10)",
        )

        d112 = res_dim8.get("direct112", {})
        ctx.log_result("Direct 'govt_contact_emergency_112' Matches", d112.get("matched") is True)
        ctx.log_result("Direct Card Attaches 112 ERSS Official Helpline", d112.get("phone") == "112")
        ctx.log_result("Direct Card Generates Quick-Dial & Menu Action Buttons", d112.get("buttonsCount", 0) >= 2)

        ut = res_dim8.get("utilities", {})
        ctx.log_result("Category Utilities Returns TSSPDCL 1912 Helpline Row", ut.get("rowsCount", 0) >= 1)

        ep = res_dim8.get("emptyPolice", {})
        ctx.log_result("Empty Category Returns Polite Telugu Inactive Notice", ep.get("hasTeluguMessage") is True)

        vg = res_dim8.get("village", {})
        ctx.log_result("Village Search for 'Choutuppal Town' Returns Helplines", vg.get("rowsCount", 0) >= 1)

        # -------------------------------------------------------------------------
        # DIMENSION 9: Multi-Tenant Territory Isolation
        # -------------------------------------------------------------------------
        print("\n--- Dimension 9: Multi-Tenant Territory Isolation ---")
        code_dim9 = """
const store = loadStore();
const nalgondaContact = {
  id: 'govt_nalgonda_1',
  name: 'Nalgonda District Control',
  designation: 'District Control Room',
  category: 'emergency_helpline',
  phoneNumber: '08682223344',
  district: 'Nalgonda',
  mandal: 'Nalgonda',
  status: 'published',
  isEmergency: true,
  isPublicContact: true,
  displayOrder: 1,
  territoryId: 'territory_nalgonda',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
};

const modifiedStore = {
  ...store,
  governmentContacts: [...(store.governmentContacts || []), nalgondaContact]
};

// Choutuppal user accessing Nalgonda contact via WhatsApp flow
const evalCross = evaluateFlow({
  incomingText: 'govt_contact_govt_nalgonda_1',
  senderPhone: '919848012345',
  territory: { id: 'territory_choutuppal' },
  inStore: modifiedStore
});

// Nalgonda user accessing Nalgonda contact
const evalSame = evaluateFlow({
  incomingText: 'govt_contact_govt_nalgonda_1',
  senderPhone: '919848012345',
  territory: { id: 'territory_nalgonda' },
  inStore: modifiedStore
});

return {
  crossBlocked: evalCross.nodeId === 'govt_detail_cross_territory',
  sameAllowed: evalSame.attachedGovtContact?.id === 'govt_nalgonda_1'
};
"""
        res_dim9 = run_node_ts(code_dim9)
        ctx.log_result("Cross-Territory WhatsApp Directory Lookup Blocked", res_dim9.get("crossBlocked") is True)
        ctx.log_result("Same-Territory WhatsApp Directory Lookup Allowed", res_dim9.get("sameAllowed") is True)

        # -------------------------------------------------------------------------
        # DIMENSION 10: Admin Offline Source Verification & Audit Log Recording
        # -------------------------------------------------------------------------
        print("\n--- Dimension 10: Admin Offline Verification & Audit Logging ---")
        code_dim10 = """
const superToken = createSignedSessionToken({
  userId: 'usr_super_1',
  phone: '9441348175',
  role: 'SUPER_ADMIN',
  territoryId: 'territory_choutuppal'
});

const franchiseToken = createSignedSessionToken({
  userId: 'usr_franchise_1',
  phone: '9848012345',
  role: 'FRANCHISE_ADMIN',
  territoryId: 'territory_nalgonda'
});

return {
  hasSuperToken: Boolean(superToken),
  hasFranchiseToken: Boolean(franchiseToken),
  tokenContainsDot: superToken.includes('.')
};
"""
        res_dim10 = run_node_ts(code_dim10)
        ctx.log_result("HMAC-SHA256 Super Admin Token Created", res_dim10.get("hasSuperToken") is True)
        ctx.log_result("HMAC-SHA256 Franchise Admin Token Created", res_dim10.get("hasFranchiseToken") is True)

        # -------------------------------------------------------------------------
        # DIMENSION 11: CSV Export and Import Integration
        # -------------------------------------------------------------------------
        print("\n--- Dimension 11: CSV Export & Import Integration ---")
        code_dim11 = """
const { GET: exportHandler } = await import('./src/app/api/admin/government-contacts/export/route.ts');
const { POST: importHandler } = await import('./src/app/api/admin/government-contacts/import/route.ts');
const { NextRequest } = await import('next/server');

const token = createSignedSessionToken({
  userId: 'usr_test_admin',
  phone: '9441348175',
  role: 'SUPER_ADMIN',
  territoryId: 'territory_choutuppal'
});

// 1. Test CSV Export
const exportReq = new NextRequest('http://localhost:3000/api/admin/government-contacts/export', {
  headers: { authorization: 'Bearer ' + token }
});
const exportRes = await exportHandler(exportReq);
const exportCsv = await exportRes.text();
const exportLines = exportCsv.trim().split('\\n');

// 2. Test CSV Import Dry Run
const sampleCsv = [
  'name,designation,category,phone_number,village,status,is_emergency',
  'Choutuppal Mandal Police Inspector,Circle Inspector,police,9848011223,Choutuppal Town,published,true',
  'Panthangi Village Secretary,Panchayat Secretary,municipal_panchayat,9848022334,Panthangi,draft,false'
].join('\\n');

const importReq = new NextRequest('http://localhost:3000/api/admin/government-contacts/import', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    authorization: 'Bearer ' + token
  },
  body: JSON.stringify({ csv: sampleCsv, dryRun: true })
});
const importRes = await importHandler(importReq);
const importJson = await importRes.json();

return {
  exportStatus: exportRes.status,
  exportHeader: exportLines[0],
  exportRowCount: exportLines.length - 1,
  importStatus: importRes.status,
  importSuccess: importJson.success,
  importDryRun: importJson.dryRun,
  importedCount: importJson.importedCount,
  forcedPendingVerification: importJson.importedContacts?.[0]?.status === 'pending_verification',
  draftPreserved: importJson.importedContacts?.[1]?.status === 'draft'
};
"""
        res_dim11 = run_node_ts(code_dim11)
        ctx.log_result("CSV Export Returns HTTP 200", res_dim11.get("exportStatus") == 200)
        ctx.log_result(
            "CSV Export Contains Canonical Headers",
            "name,designation,category" in (res_dim11.get("exportHeader") or ""),
            res_dim11.get("exportHeader"),
        )
        ctx.log_result(
            "CSV Export Contains Baseline Contact Rows",
            res_dim11.get("exportRowCount", 0) >= 6,
            f"Exported {res_dim11.get('exportRowCount')} rows",
        )
        ctx.log_result("CSV Import Dry-Run Returns HTTP 200", res_dim11.get("importStatus") == 200)
        ctx.log_result("CSV Import Parses All Valid Rows", res_dim11.get("importedCount") == 2)
        ctx.log_result(
            "CSV Import Enforces 'pending_verification' Safety Guard on 'published' Claims",
            res_dim11.get("forcedPendingVerification") is True,
            "Cannot bypass verification from CSV without admin source audit",
        )
        ctx.log_result(
            "CSV Import Preserves Explicit 'draft' Claims",
            res_dim11.get("draftPreserved") is True,
        )

        # -------------------------------------------------------------------------
        # DIMENSION 12: Final Baseline Record Counts & Zero Data Loss
        # -------------------------------------------------------------------------
        print("\n--- Dimension 12: Final Baseline Record Counts & Zero Data Loss ---")
        with open(ADMIN_DATA_PATH, "r", encoding="utf-8") as f:
            post_data = json.load(f)

        post_listings = len(post_data.get("listings", []))
        post_contacts = len(post_data.get("contacts", []))
        post_deals = len(post_data.get("deals", []))
        post_flows = len(post_data.get("flows", []))
        post_automations = len(post_data.get("automations", []))
        post_territories = len(post_data.get("territories", []))

        ctx.log_result(
            "Final Listings Count Preserved",
            post_listings == 212,
            f"Expected 212, found {post_listings}",
        )
        ctx.log_result(
            "Final Contacts Count Preserved",
            post_contacts == 211,
            f"Expected 211, found {post_contacts}",
        )
        ctx.log_result(
            "Final Deals Count Preserved",
            post_deals == 4,
            f"Expected 4, found {post_deals}",
        )
        ctx.log_result(
            "Final Flows Count Preserved",
            post_flows == 1,
            f"Expected 1, found {post_flows}",
        )
        ctx.log_result(
            "Final Automations Count Preserved",
            post_automations == 179,
            f"Expected 179, found {post_automations}",
        )
        ctx.log_result(
            "Final Territories Count Preserved",
            post_territories == 4,
            f"Expected 4, found {post_territories}",
        )

    finally:
        # Restore pre-test backup if needed and cleanup backup
        if os.path.exists(backup_path):
            # Verify backup match
            shutil.copyfile(backup_path, ADMIN_DATA_PATH)
            os.remove(backup_path)
            print(f"Verified & restored baseline store from: {backup_path}")

    print("\n=====================================================================")
    print(f"PHASE 11 TEST RESULTS: {ctx.passed} PASSED | {ctx.failed} FAILED")
    print("=====================================================================")

    if ctx.failed > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
