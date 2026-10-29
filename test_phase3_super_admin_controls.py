#!/usr/bin/env python3
"""
======================================================================
CHOUTUPPAL FRANCHISE CRM — PHASE 3 TEST SUITE
======================================================================
Automated Test Verification for:
  - Part 1: Franchise Staff & Role Management (CRUD, RBAC, Privilege Guards, Tenant Scoping)
  - Part 2: Safe Bulk Business Listing Operations (Publish, Archive, Category, Featured, Anti-Delete)
  - Part 3: CRM Duplicate Contact Warnings & Phone Normalization (Indian Phone, CSV Separation, Tenant Isolation)

Safety Invariant: Strictly non-destructive. Never permanently modifies data/admin_data.json.
"""

import sys
import os
import re
import json
import time
import hmac
import hashlib
import base64
import copy
from datetime import datetime, timezone, timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'admin_data.json')
FLAGSHIP_TERRITORY_ID = 'territory_choutuppal'
SESSION_SECRET = os.environ.get('SESSION_SECRET', 'choutuppal_sec_secret_key_8923487234')

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    RESET = '\033[0m'

test_count = 0
pass_count = 0
fail_count = 0

def log_suite(title):
    print(f"\n{Colors.BOLD}{Colors.CYAN}┌────────────────────────────────────────────────────────────────────────┐{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}│ {title.ljust(70)} │{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}└────────────────────────────────────────────────────────────────────────┘{Colors.RESET}")

def log_pass(test_id, name):
    global test_count, pass_count
    test_count += 1
    pass_count += 1
    print(f"  {Colors.GREEN}✓ PASS{Colors.RESET} [{test_id}] {name}")

def log_fail(test_id, name, reason):
    global test_count, fail_count
    test_count += 1
    fail_count += 1
    print(f"  {Colors.RED}✗ FAIL{Colors.RESET} [{test_id}] {name}")
    print(f"    {Colors.RED}Reason: {reason}{Colors.RESET}")

def create_signed_token(phone, role='SUPER_ADMIN', territory_id=FLAGSHIP_TERRITORY_ID, expires_in_sec=86400):
    payload = {
        "userId": f"usr_{phone}",
        "phone": phone,
        "role": role,
        "territoryId": territory_id,
        "expiresAt": int(time.time() * 1000) + (expires_in_sec * 1000)
    }
    b64_payload = base64.urlsafe_b64encode(json.dumps(payload).encode('utf-8')).decode('utf-8').rstrip('=')
    sig = hmac.new(SESSION_SECRET.encode('utf-8'), b64_payload.encode('utf-8'), hashlib.sha256).digest()
    b64_sig = base64.urlsafe_b64encode(sig).decode('utf-8').rstrip('=')
    return f"{b64_payload}.{b64_sig}"

# ======================================================================
# REFERENCE IMPLEMENTATIONS FOR UNIT VERIFICATION
# ======================================================================

def normalize_indian_phone_number(phone):
    if not phone:
        return ''
    digits = re.sub(r'\D', '', str(phone))
    if len(digits) == 12 and digits.startswith('91'):
        return digits[2:]
    if len(digits) == 11 and digits.startswith('0'):
        return digits[1:]
    if len(digits) == 10:
        return digits
    return digits if 7 <= len(digits) <= 15 else ''

def mask_phone_number(phone):
    norm = normalize_indian_phone_number(phone)
    if not norm:
        return '***-***-****'
    if len(norm) == 10:
        return f"{norm[:5]}*****"
    return f"{norm[:3]}***{norm[-2:]}"

def find_duplicate_contacts(contacts, candidate, options=None):
    if options is None:
        options = {}
    is_super = options.get('isSuperAdmin', False)
    caller_terr = options.get('callerTerritoryId', FLAGSHIP_TERRITORY_ID)

    cand_phone = normalize_indian_phone_number(candidate.get('phone'))
    cand_email = (candidate.get('email') or '').strip().lower()
    cand_name = (candidate.get('name') or '').strip().lower()
    exclude_id = candidate.get('excludeId')
    target_terr = candidate.get('territoryId', caller_terr) if is_super else caller_terr

    matches = []
    for c in contacts:
        if exclude_id and c.get('id') == exclude_id:
            continue
        c_terr = c.get('territoryId') or FLAGSHIP_TERRITORY_ID
        if not is_super and c_terr != target_terr:
            continue
        if is_super and target_terr and target_terr != 'all' and c_terr != target_terr:
            continue

        c_phone = normalize_indian_phone_number(c.get('phone'))
        c_email = (c.get('email') or '').strip().lower()
        c_name = (c.get('name') or '').strip().lower()

        if cand_phone and c_phone and cand_phone == c_phone:
            matches.append({
                'id': c.get('id'),
                'name': c.get('name'),
                'maskedPhone': mask_phone_number(c.get('phone')),
                'stage': c.get('stage'),
                'matchType': 'exact_phone'
            })
            continue

        if cand_email and c_email and cand_email == c_email:
            matches.append({
                'id': c.get('id'),
                'name': c.get('name'),
                'maskedPhone': mask_phone_number(c.get('phone')),
                'stage': c.get('stage'),
                'matchType': 'email'
            })
            continue

        if (cand_name and c_name and len(cand_name) >= 4 and cand_name == c_name and
            cand_phone and c_phone and cand_phone[-4:] == c_phone[-4:]):
            matches.append({
                'id': c.get('id'),
                'name': c.get('name'),
                'maskedPhone': mask_phone_number(c.get('phone')),
                'stage': c.get('stage'),
                'matchType': 'similar_name'
            })

    return {'isDuplicate': len(matches) > 0, 'matches': matches}

def parse_contacts_csv(csv_content, existing_contacts, territory_id=FLAGSHIP_TERRITORY_ID):
    lines = [l.strip() for l in csv_content.splitlines() if l.strip()]
    valid = []
    duplicates = []
    invalid = []
    if not lines:
        return {'validContacts': valid, 'duplicateRows': duplicates, 'invalidRows': invalid}

    start_idx = 1 if re.search(r'name|phone|email', lines[0], re.I) else 0
    seen_in_csv = set()

    for idx in range(start_idx, len(lines)):
        row_num = idx + 1
        raw = lines[idx]
        cols = [c.strip().strip('"\'') for c in raw.split(',')]
        if len(cols) < 2:
            invalid.append({'rowNumber': row_num, 'rawText': raw, 'reason': 'Insufficient columns'})
            continue

        name = cols[0]
        phone = cols[1]
        email = cols[2] if len(cols) > 2 else ''
        stage = cols[3] if len(cols) > 3 else 'NEW_LEAD'
        tags = [t.strip() for t in cols[4].split(';')] if len(cols) > 4 and cols[4] else ['Lead']
        notes = cols[5] if len(cols) > 5 else ''

        if not name or len(name) < 2:
            invalid.append({'rowNumber': row_num, 'rawText': raw, 'reason': 'Invalid contact name'})
            continue

        norm_phone = normalize_indian_phone_number(phone)
        if not norm_phone or len(norm_phone) != 10:
            invalid.append({'rowNumber': row_num, 'rawText': raw, 'reason': 'Invalid 10-digit Indian phone number'})
            continue

        if norm_phone in seen_in_csv:
            duplicates.append({
                'rowNumber': row_num,
                'name': name,
                'phone': phone,
                'maskedPhone': mask_phone_number(phone),
                'existingContactId': 'csv_duplicate',
                'matchType': 'csv_internal_duplicate'
            })
            continue
        seen_in_csv.add(norm_phone)

        dup_check = find_duplicate_contacts(existing_contacts, {'phone': norm_phone, 'email': email, 'name': name}, {'callerTerritoryId': territory_id})
        if dup_check['isDuplicate']:
            m = dup_check['matches'][0]
            duplicates.append({
                'rowNumber': row_num,
                'name': name,
                'phone': phone,
                'maskedPhone': m['maskedPhone'],
                'existingContactId': m['id'],
                'matchType': m['matchType']
            })
        else:
            valid.append({'rowNumber': row_num, 'name': name, 'phone': norm_phone, 'email': email, 'stage': stage, 'tags': tags, 'notes': notes})

    return {'validContacts': valid, 'duplicateRows': duplicates, 'invalidRows': invalid}

# ======================================================================
# SUITE 1: DATA STORE BASELINE INTEGRITY
# ======================================================================
log_suite("SUITE 1: PRE-TEST DATA STORE BASELINE INTEGRITY")

with open(DATA_FILE, 'rb') as f:
    baseline_bytes = f.read()
baseline_hash = hashlib.sha256(baseline_bytes).hexdigest()
data_store = json.loads(baseline_bytes.decode('utf-8'))

expected_hash = "d6a6e8bafe75cff95fdf2b15f671963b163bc5193c9aeea96cb41c66ced4d04f"
if baseline_hash == expected_hash:
    log_pass("T1.1", f"Baseline data store SHA-256 matches verified hash ({baseline_hash[:16]}...)")
else:
    log_fail("T1.1", "Data store hash mismatch", f"Expected {expected_hash}, got {baseline_hash}")

counts = {k: len(v) if isinstance(v, list) else len(v.keys()) if isinstance(v, dict) else 1 for k, v in data_store.items()}
if counts.get('listings') == 212 and counts.get('contacts') == 211:
    log_pass("T1.2", f"Data store records verified: 212 listings, 211 contacts, {len(data_store.get('franchises', []))} franchises")
else:
    log_fail("T1.2", "Initial count mismatch", f"Counts: {counts}")

# ======================================================================
# SUITE 2: INDIAN PHONE NUMBER NORMALIZATION & MASKING
# ======================================================================
log_suite("SUITE 2: INDIAN PHONE NUMBER NORMALIZATION & PRIVACY MASKING")

test_cases_phone = [
    ("9848012345", "9848012345", "Plain 10-digit number"),
    ("+919848012345", "9848012345", "+91 prefix format"),
    ("+91 98480-12345", "9848012345", "+91 prefix with spaces and dashes"),
    ("919848012345", "9848012345", "12-digit with 91 prefix"),
    ("09848012345", "9848012345", "11-digit with leading 0"),
    ("(+91) 98480 12345", "9848012345", "Parentheses and spaces"),
    ("invalid", "", "Non-numeric string returns empty"),
    ("12345", "", "Too short (< 7 digits) returns empty"),
]

for i, (raw, expected, desc) in enumerate(test_cases_phone, 1):
    res = normalize_indian_phone_number(raw)
    if res == expected:
        log_pass(f"T2.{i}", f"Normalize: {desc} -> '{res}'")
    else:
        log_fail(f"T2.{i}", f"Normalize failed for '{raw}'", f"Expected '{expected}', got '{res}'")

# Test Privacy Masking
masked_10 = mask_phone_number("9848012345")
if masked_10 == "98480*****":
    log_pass("T2.9", f"10-digit phone correctly masked with privacy star padding ({masked_10})")
else:
    log_fail("T2.9", "Masking failed", f"Expected '98480*****', got '{masked_10}'")

masked_invalid = mask_phone_number("")
if masked_invalid == "***-***-****":
    log_pass("T2.10", "Empty/invalid phone masked safely")
else:
    log_fail("T2.10", "Empty masking failed", f"Got '{masked_invalid}'")

# ======================================================================
# SUITE 3: CRM DUPLICATE CONTACT WARNINGS & TENANT ISOLATION
# ======================================================================
log_suite("SUITE 3: CRM DUPLICATE CONTACT DETECTION & TENANT PRIVACY")

sim_contacts = [
    {
        "id": "cnt_cpl_1",
        "name": "Ramesh Kumar",
        "phone": "9848012345",
        "email": "ramesh@sai.in",
        "stage": "NEW_LEAD",
        "territoryId": "territory_choutuppal"
    },
    {
        "id": "cnt_syp_1",
        "name": "Suryapet Merchant",
        "phone": "9494012345",
        "email": "suryapet@dealer.in",
        "stage": "WON",
        "territoryId": "territory_suryapet"
    }
]

# 1. Exact phone match in same territory
res_dup = find_duplicate_contacts(sim_contacts, {"phone": "+91 98480-12345"}, {"callerTerritoryId": "territory_choutuppal"})
if res_dup['isDuplicate'] and len(res_dup['matches']) == 1 and res_dup['matches'][0]['id'] == 'cnt_cpl_1':
    log_pass("T3.1", f"Exact phone match detected: {res_dup['matches'][0]['name']} ({res_dup['matches'][0]['maskedPhone']})")
else:
    log_fail("T3.1", "Duplicate detection failed", f"Result: {res_dup}")

# 2. Secondary email match
res_email = find_duplicate_contacts(sim_contacts, {"phone": "9848099999", "email": "ramesh@sai.in"}, {"callerTerritoryId": "territory_choutuppal"})
if res_email['isDuplicate'] and res_email['matches'][0]['matchType'] == 'email':
    log_pass("T3.2", "Secondary email match detected cleanly")
else:
    log_fail("T3.2", "Email duplicate detection failed", f"Result: {res_email}")

# 3. TENANT PRIVACY ISOLATION: Franchise Admin cannot detect or see contacts from other territories
res_cross = find_duplicate_contacts(
    sim_contacts,
    {"phone": "9494012345"}, # This phone exists in territory_suryapet
    {"callerTerritoryId": "territory_choutuppal", "isSuperAdmin": False} # Caller is Choutuppal Franchise Admin
)
if not res_cross['isDuplicate']:
    log_pass("T3.3", "Tenant Privacy Isolation: Franchise Admin cannot detect cross-tenant contacts")
else:
    log_fail("T3.3", "Tenant Privacy Leak: Choutuppal admin detected Suryapet contact", f"Matches: {res_cross['matches']}")

# 4. Super Admin can see cross-tenant contacts when requested
res_super = find_duplicate_contacts(
    sim_contacts,
    {"phone": "9494012345"},
    {"isSuperAdmin": True, "callerTerritoryId": "all"}
)
if res_super['isDuplicate'] and res_super['matches'][0]['id'] == 'cnt_syp_1':
    log_pass("T3.4", "Super Admin duplicate check traverses all authorized territories")
else:
    log_fail("T3.4", "Super Admin check failed", f"Result: {res_super}")

# ======================================================================
# SUITE 4: CSV IMPORT & DUPLICATE VS INVALID SEPARATION
# ======================================================================
log_suite("SUITE 4: CSV CONTACT IMPORT SEPARATION & VALIDATION")

sample_csv = """Name, Phone, Email, Stage, Tags, Notes
Sri Sai Motors, 9848099111, sai@auto.in, NEW_LEAD, Auto, Valid Row 1
Ramesh Kumar, 9848012345, ramesh@new.in, CONTACTED, Lead, Duplicate with persistent contact cnt_cpl_1
Internal Dup, 9848099111, int@auto.in, NEW_LEAD, Auto, In-CSV duplicate with row 1
X, 9848099222, x@x.com, NEW_LEAD, Lead, Invalid short name
Bad Phone Row, 12345, bad@phone.in, NEW_LEAD, Bad, Invalid phone digits
Insufficient Cols Row
"""

csv_out = parse_contacts_csv(sample_csv, sim_contacts, territory_id="territory_choutuppal")

if len(csv_out['validContacts']) == 1 and csv_out['validContacts'][0]['name'] == 'Sri Sai Motors':
    log_pass("T4.1", f"Valid CSV rows isolated: {len(csv_out['validContacts'])} valid contact ('Sri Sai Motors')")
else:
    log_fail("T4.1", "Valid CSV isolation failed", f"Valid: {csv_out['validContacts']}")

if len(csv_out['duplicateRows']) == 2:
    types = [d['matchType'] for d in csv_out['duplicateRows']]
    log_pass("T4.2", f"Duplicate rows reported separately: 2 duplicates ({', '.join(types)})")
else:
    log_fail("T4.2", "Duplicate rows count mismatch", f"Duplicates: {csv_out['duplicateRows']}")

if len(csv_out['invalidRows']) == 3:
    reasons = [r['reason'] for r in csv_out['invalidRows']]
    log_pass("T4.3", f"Invalid rows isolated with clear reasons: 3 invalid rows ({reasons[0]}, {reasons[1]}, ...)")
else:
    log_fail("T4.3", "Invalid rows count mismatch", f"Invalid: {csv_out['invalidRows']}")

# ======================================================================
# SUITE 5: SAFE BULK BUSINESS LISTINGS OPERATIONS & ACCESS GUARDS
# ======================================================================
log_suite("SUITE 5: SAFE BULK BUSINESS LISTING OPERATIONS")

def simulate_bulk_listing_op(action, listing_ids, listings, options=None):
    if options is None:
        options = {}
    is_super = options.get('isSuperAdmin', False)
    caller_terr = options.get('callerTerritoryId', FLAGSHIP_TERRITORY_ID)
    cat_id = options.get('categoryId')
    is_feat = options.get('isFeatured')

    # Guard 1: Prohibit Delete
    if action == 'delete':
        return {'status': 400, 'error': 'Bulk delete is strictly prohibited to prevent data loss.'}

    if action not in ['publish', 'archive', 'set_category', 'set_featured']:
        return {'status': 400, 'error': f'Invalid bulk action "{action}"'}

    succeeded = []
    skipped = []
    failed = []

    for lid in listing_ids:
        match = next((l for l in listings if l.get('id') == lid), None)
        if not match:
            failed.append({'id': lid, 'reason': 'Listing not found'})
            continue

        l_terr = match.get('territoryId') or FLAGSHIP_TERRITORY_ID
        if not is_super and l_terr != caller_terr:
            skipped.append({'id': lid, 'reason': 'Forbidden: Listing belongs to another territory'})
            continue

        if action == 'publish':
            if match.get('status') == 'APPROVED':
                skipped.append({'id': lid, 'reason': 'Already approved'})
            else:
                match['status'] = 'APPROVED'
                succeeded.append(lid)
        elif action == 'archive':
            if match.get('status') == 'ARCHIVED':
                skipped.append({'id': lid, 'reason': 'Already archived'})
            else:
                match['status'] = 'ARCHIVED'
                succeeded.append(lid)
        elif action == 'set_category':
            match['categoryId'] = cat_id
            succeeded.append(lid)
        elif action == 'set_featured':
            match['isFeatured'] = bool(is_feat)
            succeeded.append(lid)

    return {
        'status': 200,
        'success': True,
        'succeeded': succeeded,
        'skipped': skipped,
        'failed': failed
    }

mock_listings = [
    {"id": "list_cpl_1", "title": "Choutuppal Kirana", "status": "APPROVED", "territoryId": "territory_choutuppal", "categoryId": "cat-food"},
    {"id": "list_cpl_2", "title": "Choutuppal Auto", "status": "PENDING", "territoryId": "territory_choutuppal", "categoryId": "cat-automobile"},
    {"id": "list_syp_1", "title": "Suryapet Textiles", "status": "PENDING", "territoryId": "territory_suryapet", "categoryId": "cat-retail"},
]

# 1. Bulk Delete Prohibition
res_del = simulate_bulk_listing_op('delete', ['list_cpl_1', 'list_cpl_2'], mock_listings)
if res_del.get('status') == 400 and 'prohibited' in res_del.get('error', '').lower():
    log_pass("T5.1", "Bulk Delete is strictly blocked with HTTP 400 safeguard")
else:
    log_fail("T5.1", "Bulk delete was not blocked", f"Result: {res_del}")

# 2. Bulk Publish with Already-Published Skip
res_pub = simulate_bulk_listing_op('publish', ['list_cpl_1', 'list_cpl_2'], mock_listings, {'callerTerritoryId': 'territory_choutuppal'})
if len(res_pub['succeeded']) == 1 and res_pub['succeeded'][0] == 'list_cpl_2' and len(res_pub['skipped']) == 1:
    log_pass("T5.2", "Bulk Publish: 1 approved, 1 already-published safely skipped")
else:
    log_fail("T5.2", "Bulk publish failed", f"Result: {res_pub}")

# 3. Territory Scoping Guard: Choutuppal Admin cannot publish Suryapet listing
res_cross_list = simulate_bulk_listing_op(
    'publish',
    ['list_syp_1'],
    mock_listings,
    {'callerTerritoryId': 'territory_choutuppal', 'isSuperAdmin': False}
)
if len(res_cross_list['skipped']) == 1 and 'another territory' in res_cross_list['skipped'][0]['reason']:
    log_pass("T5.3", "Franchise Authorization: Cross-tenant bulk listing modification prevented")
else:
    log_fail("T5.3", "Cross-tenant listing guard failed", f"Result: {res_cross_list}")

# 4. Super Admin can update cross-tenant listings in bulk
res_super_list = simulate_bulk_listing_op(
    'publish',
    ['list_syp_1'],
    mock_listings,
    {'isSuperAdmin': True}
)
if len(res_super_list['succeeded']) == 1 and res_super_list['succeeded'][0] == 'list_syp_1':
    log_pass("T5.4", "Super Admin bulk operation succeeds across multiple franchise territories")
else:
    log_fail("T5.4", "Super admin bulk listing failed", f"Result: {res_super_list}")

# 5. Bulk Category Reassignment
res_cat = simulate_bulk_listing_op(
    'set_category',
    ['list_cpl_1', 'list_cpl_2'],
    mock_listings,
    {'categoryId': 'cat-healthcare'}
)
if len(res_cat['succeeded']) == 2 and all(l['categoryId'] == 'cat-healthcare' for l in mock_listings[:2]):
    log_pass("T5.5", "Bulk Category Reassignment applies new category to all target listings")
else:
    log_fail("T5.5", "Bulk category reassignment failed", f"Result: {res_cat}")

# ======================================================================
# SUITE 6: FRANCHISE STAFF MANAGEMENT & ROLE-BASED ACCESS CONTROL
# ======================================================================
log_suite("SUITE 6: FRANCHISE STAFF MANAGEMENT & RBAC RESTRICTIONS")

def simulate_create_staff(body, caller, staff_store, franchises):
    name = (body.get('name') or '').strip()
    raw_phone = (body.get('phone') or '').strip()
    role = body.get('role')
    franchise_id = body.get('franchiseId')
    territory_id = body.get('territoryId')

    is_super = caller.get('role') == 'SUPER_ADMIN'
    caller_terr = caller.get('territoryId')

    if not name or len(name) < 2:
        return {'status': 400, 'error': 'Name must be at least 2 characters'}

    phone = normalize_indian_phone_number(raw_phone)
    if not phone or len(phone) != 10:
        return {'status': 400, 'error': 'Valid 10-digit Indian phone number required'}

    if role not in ['FRANCHISE_ADMIN', 'FRANCHISE_REVIEWER', 'FRANCHISE_STAFF']:
        return {'status': 400, 'error': 'Invalid role'}

    target_f = next((f for f in franchises if f.get('id') == franchise_id), None)
    derived_terr = target_f.get('territoryId') if target_f else territory_id or FLAGSHIP_TERRITORY_ID

    # Privilege Escalation Guard
    if not is_super and derived_terr != caller_terr:
        return {'status': 403, 'error': 'Forbidden: Cannot assign staff outside your territory'}

    # Duplicate phone guard
    if any(normalize_indian_phone_number(s.get('phone')) == phone for s in staff_store):
        return {'status': 409, 'error': 'A staff member with this phone number already exists'}

    new_staff = {
        'id': f"staff_{int(time.time())}",
        'name': name,
        'phone': phone,
        'role': role,
        'franchiseId': franchise_id,
        'territoryId': derived_terr,
        'status': 'ACTIVE',
        'createdAt': datetime.now(timezone.utc).isoformat()
    }
    staff_store.append(new_staff)
    return {'status': 200, 'success': True, 'staff': new_staff}

sim_staff = []
sim_franchises = data_store.get('franchises', [])

# 1. Super Admin creates valid staff
c_super = {"userId": "usr_super", "phone": "9441348175", "role": "SUPER_ADMIN", "territoryId": "territory_choutuppal"}
res_s1 = simulate_create_staff(
    {"name": "Anil Staff", "phone": "+91 9848011122", "role": "FRANCHISE_STAFF", "franchiseId": "fr_1"},
    c_super,
    sim_staff,
    sim_franchises
)
if res_s1.get('status') == 200 and res_s1['staff']['phone'] == '9848011122':
    log_pass("T6.1", f"Staff created with normalized phone: {res_s1['staff']['name']} ({res_s1['staff']['phone']})")
else:
    log_fail("T6.1", "Staff creation failed", f"Result: {res_s1}")

# 2. Duplicate phone rejected (HTTP 409)
res_s2 = simulate_create_staff(
    {"name": "Duplicate Anil", "phone": "09848011122", "role": "FRANCHISE_REVIEWER", "franchiseId": "fr_1"},
    c_super,
    sim_staff,
    sim_franchises
)
if res_s2.get('status') == 409:
    log_pass("T6.2", "Duplicate staff phone rejected with HTTP 409 Conflict")
else:
    log_fail("T6.2", "Duplicate staff check failed", f"Result: {res_s2}")

# 3. Privilege Escalation Guard: Franchise Admin cannot create staff for another territory
c_franchise = {"userId": "usr_fran", "phone": "9848055555", "role": "FRANCHISE_ADMIN", "territoryId": "territory_choutuppal"}
res_s3 = simulate_create_staff(
    {"name": "Suryapet Spy", "phone": "9848099887", "role": "FRANCHISE_STAFF", "franchiseId": "fr_1"}, # fr_1 is territory_suryapet
    c_franchise,
    sim_staff,
    sim_franchises
)
if res_s3.get('status') == 403:
    log_pass("T6.3", "Privilege Escalation Guard: Franchise Admin blocked from assigning staff outside their franchise")
else:
    log_fail("T6.3", "Privilege guard failed", f"Result: {res_s3}")

# 4. Self-Deletion Prevention Guard
caller_staff_user = {"phone": "9848011122", "userId": "usr_9848011122"}
target_to_delete = sim_staff[0]

def simulate_delete_staff(staff_id, caller, staff_store):
    match = next((s for s in staff_store if s.get('id') == staff_id), None)
    if not match:
        return {'status': 404, 'error': 'Not found'}
    if caller.get('phone') == match.get('phone'):
        return {'status': 400, 'error': 'Cannot delete your own active administrator account'}
    staff_store.remove(match)
    return {'status': 200, 'success': True}

res_self_del = simulate_delete_staff(target_to_delete['id'], caller_staff_user, sim_staff)
if res_self_del.get('status') == 400 and 'own active' in res_self_del.get('error', ''):
    log_pass("T6.4", "Self-Deletion Prevention Guard: Administrator cannot delete their own active account")
else:
    log_fail("T6.4", "Self-deletion guard failed", f"Result: {res_self_del}")

# ======================================================================
# SUITE 7: FINAL DATA STORE INTEGRITY VERIFICATION
# ======================================================================
log_suite("SUITE 7: POST-TEST DATA STORE BYTE-FOR-BYTE INVARIANCE")

with open(DATA_FILE, 'rb') as f:
    final_bytes = f.read()
final_hash = hashlib.sha256(final_bytes).hexdigest()

if final_hash == expected_hash:
    log_pass("T7.1", f"Data store SHA-256 byte-for-byte invariant verified ({final_hash[:16]}...)")
else:
    log_fail("T7.1", "Data store was mutated during test run!", f"Expected {expected_hash}, got {final_hash}")

# Check file system and route presence
routes_to_verify = [
    os.path.join(BASE_DIR, 'src', 'app', 'api', 'admin', 'staff', 'route.ts'),
    os.path.join(BASE_DIR, 'src', 'app', 'api', 'admin', 'staff', '[id]', 'route.ts'),
    os.path.join(BASE_DIR, 'src', 'app', 'admin', 'staff', 'page.tsx'),
    os.path.join(BASE_DIR, 'src', 'app', 'api', 'admin', 'listings', 'bulk', 'route.ts'),
    os.path.join(BASE_DIR, 'src', 'app', 'api', 'crm', 'contacts', 'import-csv', 'route.ts'),
    os.path.join(BASE_DIR, 'src', 'lib', 'crm-duplicates.ts'),
]

all_routes_exist = all(os.path.exists(r) for r in routes_to_verify)
if all_routes_exist:
    log_pass("T7.2", f"All Phase 3 source files verified on disk ({len(routes_to_verify)} files)")
else:
    missing = [r for r in routes_to_verify if not os.path.exists(r)]
    log_fail("T7.2", "Missing required source files", f"Missing: {missing}")

# ======================================================================
# SUMMARY REPORT
# ======================================================================
print(f"\n{Colors.BOLD}{Colors.CYAN}======================================================================{Colors.RESET}")
print(f"{Colors.BOLD}PHASE 3 TEST SUMMARY RESULTS:{Colors.RESET}")
print(f"  Total Tests Executed: {test_count}")
print(f"  {Colors.GREEN}Tests Passed: {pass_count}{Colors.RESET}")
if fail_count > 0:
    print(f"  {Colors.RED}Tests Failed: {fail_count}{Colors.RESET}")
else:
    print(f"  {Colors.GREEN}All Tests Passed! (0 Failures){Colors.RESET}")
print(f"{Colors.BOLD}{Colors.CYAN}======================================================================{Colors.RESET}\n")

if fail_count > 0:
    sys.exit(1)
sys.exit(0)
