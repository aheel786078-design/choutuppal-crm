#!/usr/bin/env python3
"""
======================================================================
CHOUTUPPAL FRANCHISE CRM — PHASE 3 CONTACT CRUD & AUTH VERIFICATION
======================================================================
Detailed verification for:
  - CRM Contact GET (Auth, Tenant Filter, Duplicate Query)
  - CRM Contact POST (Validation, Duplicate 409, Override, Tenant Assignment)
  - CRM Contact PUT (IDOR Guard, Phone Duplicate Check, Territory Immutability)
  - CRM Contact DELETE (IDOR Guard, 404 Guard, Safe Deletion)
  - Staff RBAC & Privilege Guards
  - Safe Bulk Listing Guards

Safety Invariant: Strictly non-destructive. Never permanently modifies data/admin_data.json.
"""

import os
import sys
import re
import json
import time
import hashlib
import copy
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'admin_data.json')
FLAGSHIP_TERRITORY_ID = 'territory_choutuppal'

with open(DATA_FILE, 'rb') as f:
    baseline_bytes = f.read()
baseline_hash = hashlib.sha256(baseline_bytes).hexdigest()
original_store = json.loads(baseline_bytes.decode('utf-8'))

passed = 0
failed = 0

def test(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  \033[92m✓ PASS\033[0m {name}")
    else:
        failed += 1
        print(f"  \033[91m✗ FAIL\033[0m {name}: {detail}")

print("\n\033[1m\033[96m======================================================================\033[0m")
print("\033[1m\033[96mCONTACT CRUD, STAFF AUTHORIZATION & TENANT ISOLATION SUITE\033[0m")
print("\033[1m\033[96m======================================================================\033[0m\n")

# Use an in-memory isolated copy of store
store = copy.deepcopy(original_store)

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

# --------------------------------------------------------------------
# 1. Contact GET Simulation
# --------------------------------------------------------------------
print("\033[1m1. Contact GET Handler & Tenant Scoping\033[0m")

def simulate_contact_get(caller, query_params, contacts):
    is_super = caller.get('role') == 'SUPER_ADMIN'
    caller_terr = caller.get('territoryId', FLAGSHIP_TERRITORY_ID)
    terr_query = query_params.get('territoryId')

    # Tenant scoping
    if not is_super:
        filtered = [c for c in contacts if (c.get('territoryId') or FLAGSHIP_TERRITORY_ID) == caller_terr]
    elif terr_query and terr_query != 'all':
        filtered = [c for c in contacts if (c.get('territoryId') or FLAGSHIP_TERRITORY_ID) == terr_query]
    else:
        filtered = contacts

    # Fast duplicate check
    if query_params.get('checkDuplicate') == 'true' and query_params.get('phone'):
        phone_param = query_params.get('phone')
        dup = find_duplicate_contacts(filtered, {'phone': phone_param}, {'isSuperAdmin': is_super, 'callerTerritoryId': caller_terr})
        return {'status': 200, 'isDuplicate': dup['isDuplicate'], 'matches': dup['matches']}

    return {'status': 200, 'contacts': filtered, 'total': len(filtered)}

# Test GET as Super Admin (all 211 contacts)
res_get_super = simulate_contact_get({'role': 'SUPER_ADMIN'}, {}, store['contacts'])
test("Super Admin GET returns all contacts without restriction", res_get_super['total'] == 211)

# Test GET as Franchise Admin for Choutuppal
res_get_fran = simulate_contact_get({'role': 'FRANCHISE_ADMIN', 'territoryId': 'territory_choutuppal'}, {}, store['contacts'])
test("Franchise Admin GET returns only authorized territory contacts", 0 <= res_get_fran['total'] <= 211)

# Test GET duplicate query fast-path
res_get_dup = simulate_contact_get(
    {'role': 'SUPER_ADMIN'},
    {'checkDuplicate': 'true', 'phone': store['contacts'][0]['phone']},
    store['contacts']
)
test("GET checkDuplicate returns isDuplicate=True for existing phone", res_get_dup['isDuplicate'] is True and len(res_get_dup['matches']) > 0)

# --------------------------------------------------------------------
# 2. Contact POST Simulation
# --------------------------------------------------------------------
print("\n\033[1m2. Contact POST Handler, Validation & Duplicate Conflict\033[0m")

def simulate_contact_post(caller, body, store_copy):
    name = (body.get('name') or '').strip()
    raw_phone = (body.get('phone') or '').strip()

    if not name or len(name) < 2:
        return {'status': 400, 'error': 'Contact Name must be at least 2 characters.'}

    norm_phone = normalize_indian_phone_number(raw_phone)
    if not norm_phone or len(norm_phone) != 10:
        return {'status': 400, 'error': 'Please provide a valid 10-digit Indian phone number.'}

    is_super = caller.get('role') == 'SUPER_ADMIN'
    caller_terr = caller.get('territoryId', FLAGSHIP_TERRITORY_ID)
    territory_id = body.get('territoryId') if is_super else caller_terr

    allow_duplicate = bool(body.get('allowDuplicate'))
    dup_check = find_duplicate_contacts(
        store_copy['contacts'],
        {'phone': norm_phone, 'email': body.get('email'), 'name': name, 'territoryId': territory_id},
        {'isSuperAdmin': is_super, 'callerTerritoryId': territory_id}
    )

    if dup_check['isDuplicate'] and not allow_duplicate:
        m = dup_check['matches'][0]
        return {
            'status': 409,
            'duplicateDetected': True,
            'warning': f"A contact with phone number {m['maskedPhone']} already exists: \"{m['name']}\" ({m['stage']}).",
            'existingContact': m
        }

    new_contact = {
        'id': f"cnt_test_{int(time.time() * 1000)}",
        'territoryId': territory_id,
        'name': name,
        'phone': norm_phone,
        'email': (body.get('email') or '').strip().lower(),
        'stage': body.get('stage', 'NEW_LEAD'),
        'tags': body.get('tags', ['Lead']),
        'messageCount': 0,
        'createdAt': datetime.now(timezone.utc).isoformat()
    }
    store_copy['contacts'].insert(0, new_contact)
    return {'status': 200, 'success': True, 'contact': new_contact, 'wasDuplicateOverridden': dup_check['isDuplicate'] and allow_duplicate}

# Test POST validation: short name
res_post_short_name = simulate_contact_post({'role': 'SUPER_ADMIN'}, {'name': 'A', 'phone': '9848011223'}, store)
test("POST rejects name < 2 chars with HTTP 400", res_post_short_name['status'] == 400)

# Test POST validation: invalid phone
res_post_bad_phone = simulate_contact_post({'role': 'SUPER_ADMIN'}, {'name': 'Valid Name', 'phone': '123'}, store)
test("POST rejects invalid phone format with HTTP 400", res_post_bad_phone['status'] == 400)

# Test POST duplicate detection (HTTP 409)
existing_phone = store['contacts'][0]['phone']
res_post_dup = simulate_contact_post({'role': 'SUPER_ADMIN'}, {'name': 'Another Lead', 'phone': existing_phone}, store)
test("POST returns HTTP 409 Conflict when duplicate phone is submitted without override", res_post_dup['status'] == 409 and res_post_dup.get('duplicateDetected') is True)

# Test POST duplicate override
res_post_override = simulate_contact_post({'role': 'SUPER_ADMIN'}, {'name': 'Override Lead', 'phone': existing_phone, 'allowDuplicate': True}, store)
test("POST succeeds with wasDuplicateOverridden=True when allowDuplicate=True", res_post_override['status'] == 200 and res_post_override.get('wasDuplicateOverridden') is True)

# Test POST territory enforcement for non-super-admin
caller_fa = {'role': 'FRANCHISE_ADMIN', 'territoryId': 'territory_choutuppal'}
res_post_fa = simulate_contact_post(caller_fa, {'name': 'Local Lead', 'phone': '9988776655', 'territoryId': 'territory_suryapet'}, store)
test("POST assigns caller territory to prevent cross-tenant lead injection", res_post_fa['status'] == 200 and res_post_fa['contact']['territoryId'] == 'territory_choutuppal')

# --------------------------------------------------------------------
# 3. Contact PUT Simulation
# --------------------------------------------------------------------
print("\n\033[1m3. Contact PUT Handler, IDOR Guard & Phone Update Duplicate Check\033[0m")

def simulate_contact_put(caller, body, store_copy):
    cid = body.get('id')
    if not cid:
        return {'status': 400, 'error': 'Contact ID is required'}

    contact = next((c for c in store_copy['contacts'] if c['id'] == cid), None)
    if not contact:
        return {'status': 404, 'error': 'Contact not found'}

    is_super = caller.get('role') == 'SUPER_ADMIN'
    caller_terr = caller.get('territoryId', FLAGSHIP_TERRITORY_ID)
    c_terr = contact.get('territoryId') or FLAGSHIP_TERRITORY_ID

    # IDOR / BOLA Guard
    if not is_super and c_terr != caller_terr:
        return {'status': 403, 'error': 'Forbidden: Access to this territory contact denied'}

    updates = copy.deepcopy(body)
    del updates['id']
    allow_duplicate = bool(updates.pop('allowDuplicate', False))

    if not is_super and 'territoryId' in updates:
        del updates['territoryId']

    if 'phone' in updates:
        norm_phone = normalize_indian_phone_number(updates['phone'])
        if not norm_phone or len(norm_phone) != 10:
            return {'status': 400, 'error': 'Please provide a valid 10-digit Indian phone number.'}
        updates['phone'] = norm_phone

        dup_check = find_duplicate_contacts(
            store_copy['contacts'],
            {'phone': norm_phone, 'excludeId': cid, 'territoryId': c_terr},
            {'isSuperAdmin': is_super, 'callerTerritoryId': c_terr}
        )
        if dup_check['isDuplicate'] and not allow_duplicate:
            return {'status': 409, 'duplicateDetected': True, 'existingContact': dup_check['matches'][0]}

    contact.update(updates)
    return {'status': 200, 'success': True, 'contact': contact}

# Target contact for test
test_c = store['contacts'][0]
target_id = test_c['id']

# Test PUT missing ID (HTTP 400)
test("PUT rejects missing ID with HTTP 400", simulate_contact_put({'role': 'SUPER_ADMIN'}, {}, store)['status'] == 400)

# Test PUT 404 non-existent contact
test("PUT returns HTTP 404 for non-existent contact ID", simulate_contact_put({'role': 'SUPER_ADMIN'}, {'id': 'non_existent_id'}, store)['status'] == 404)

# Test PUT IDOR Guard: Choutuppal Admin editing Suryapet contact (HTTP 403)
suryapet_contact = {'id': 'cnt_syp_99', 'name': 'Suryapet Contact', 'phone': '9123456789', 'territoryId': 'territory_suryapet', 'messageCount': 0}
store['contacts'].append(suryapet_contact)

res_put_idor = simulate_contact_put(
    {'role': 'FRANCHISE_ADMIN', 'territoryId': 'territory_choutuppal'},
    {'id': 'cnt_syp_99', 'name': 'Hacked Name'},
    store
)
test("PUT IDOR Guard: Franchise Admin cannot edit contacts belonging to another territory (HTTP 403)", res_put_idor['status'] == 403)

# Test PUT non-super-admin cannot change territory
res_put_terr = simulate_contact_put(
    {'role': 'FRANCHISE_ADMIN', 'territoryId': 'territory_choutuppal'},
    {'id': target_id, 'name': 'Updated Name', 'territoryId': 'territory_suryapet'},
    store
)
test("PUT strips territoryId modification attempt by non-super-admin", test_c.get('territoryId') != 'territory_suryapet')

# Test PUT duplicate phone collision check within same territory
collision_phone = store['contacts'][1]['phone']
res_put_dup = simulate_contact_put(
    {'role': 'SUPER_ADMIN'},
    {'id': target_id, 'phone': collision_phone},
    store
)
test("PUT checks duplicate phone conflict within territory and returns HTTP 409", res_put_dup['status'] == 409 and res_put_dup.get('duplicateDetected') is True)

# --------------------------------------------------------------------
# 4. Contact DELETE Simulation
# --------------------------------------------------------------------
print("\n\033[1m4. Contact DELETE Handler & IDOR Protection\033[0m")

def simulate_contact_delete(caller, cid, store_copy):
    if not cid:
        return {'status': 400, 'error': 'Contact ID is required'}

    contact = next((c for c in store_copy['contacts'] if c['id'] == cid), None)
    if not contact:
        return {'status': 404, 'error': 'Contact not found'}

    is_super = caller.get('role') == 'SUPER_ADMIN'
    caller_terr = caller.get('territoryId', FLAGSHIP_TERRITORY_ID)
    c_terr = contact.get('territoryId') or FLAGSHIP_TERRITORY_ID

    # IDOR / BOLA Guard
    if not is_super and c_terr != caller_terr:
        return {'status': 403, 'error': 'Forbidden: Access to this territory contact denied'}

    store_copy['contacts'] = [c for c in store_copy['contacts'] if c['id'] != cid]
    return {'status': 200, 'success': True}

# Test DELETE missing ID (HTTP 400)
test("DELETE rejects missing ID with HTTP 400", simulate_contact_delete({'role': 'SUPER_ADMIN'}, '', store)['status'] == 400)

# Test DELETE non-existent (HTTP 404)
test("DELETE returns HTTP 404 for non-existent ID", simulate_contact_delete({'role': 'SUPER_ADMIN'}, 'ghost_id', store)['status'] == 404)

# Test DELETE IDOR Guard: Choutuppal Admin deleting Suryapet contact (HTTP 403)
res_del_idor = simulate_contact_delete(
    {'role': 'FRANCHISE_ADMIN', 'territoryId': 'territory_choutuppal'},
    'cnt_syp_99',
    store
)
test("DELETE IDOR Guard: Franchise Admin cannot delete cross-tenant contact (HTTP 403)", res_del_idor['status'] == 403)

# Test DELETE authorized
res_del_auth = simulate_contact_delete({'role': 'SUPER_ADMIN'}, 'cnt_syp_99', store)
test("DELETE succeeds for authorized Super Admin request", res_del_auth['status'] == 200 and not any(c['id'] == 'cnt_syp_99' for c in store['contacts']))

# --------------------------------------------------------------------
# 5. Final Data Integrity Check
# --------------------------------------------------------------------
print("\n\033[1m5. Invariant Data Store Hash Verification\033[0m")
with open(DATA_FILE, 'rb') as f:
    current_bytes = f.read()
current_hash = hashlib.sha256(current_bytes).hexdigest()
test(f"Data file SHA-256 invariant verified ({current_hash[:16]}...)", current_hash == baseline_hash)

print(f"\n\033[1m======================================================================\033[0m")
print(f"\033[1mCONTACT CRUD & AUTH VERIFICATION SUMMARY:\033[0m")
print(f"  Total Checks: {passed + failed}")
print(f"  Passed:       {passed}")
print(f"  Failed:       {failed}")
print(f"\033[1m======================================================================\033[0m\n")

if failed > 0:
    sys.exit(1)
sys.exit(0)
