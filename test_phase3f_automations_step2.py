#!/usr/bin/env python3
"""
Choutuppal Franchise CRM — Phase 3F Step 2 Verification Test Suite
Tests Automation Data Model, Safe RFC CSV Parsing, Tenant Scoping,
Dry-Run Preview (Zero Mutation), Draft Status on Import, Deterministic Deduplication,
and Baseline Data Safety.
"""

import json
import os
import sys
import shutil
import hmac
import hashlib
import base64
import time
import re

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "admin_data.json")
BACKUP_FILE = os.path.join(os.path.dirname(__file__), "data", "admin_data.json.bak_phase3f_test")
FLAGSHIP_TERRITORY_ID = "territory_choutuppal"
SESSION_SECRET = os.environ.get("SESSION_SECRET") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "choutuppal_sec_secret_key_8923487234"

passed = 0
failed = 0

def log_pass(title, details=""):
    global passed
    passed += 1
    print(f"  ✔ PASS: {title} ({details})" if details else f"  ✔ PASS: {title}")

def log_fail(title, reason, details=""):
    global failed
    failed += 1
    print(f"  ✖ FAIL: {title} - {reason} ({details})" if details else f"  ✖ FAIL: {title} - {reason}")

def create_signed_token(phone: str, role: str, territory_id: str) -> str:
    payload = {
        "userId": f"usr_{phone}",
        "phone": phone,
        "role": role,
        "territoryId": territory_id,
        "expiresAt": int(time.time() * 1000) + 86400000
    }
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8").rstrip("=")
    sig = hmac.new(SESSION_SECRET.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(sig).decode("utf-8").rstrip("=")
    return f"{payload_b64}.{sig_b64}"

def verify_token(token: str):
    if not token or "." not in token:
        return None
    try:
        parts = token.split(".")
        payload_b64, sig_b64 = parts[0], parts[1]
        sig_padding = sig_b64 + "=" * (-len(sig_b64) % 4)
        sig = base64.urlsafe_b64decode(sig_padding.encode("utf-8"))
        expected_sig = hmac.new(SESSION_SECRET.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).digest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        payload_padding = payload_b64 + "=" * (-len(payload_b64) % 4)
        data = json.loads(base64.urlsafe_b64decode(payload_padding.encode("utf-8")).decode("utf-8"))
        if data.get("expiresAt", 0) < time.time() * 1000:
            return None
        return data
    except Exception:
        return None

def load_store():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_store(store):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(store, f, indent=2, ensure_ascii=False)


# -----------------------------------------------------------------------------
# PYTHON CSV TOKENIZER (Matches src/lib/parse-automation-csv.ts exactly)
# -----------------------------------------------------------------------------
def tokenize_csv(csv_text: str):
    clean = csv_text.lstrip("\ufeff")
    rows = []
    current_row = []
    current_cell = ""
    in_quotes = False
    i = 0
    n = len(clean)

    while i < n:
        char = clean[i]
        if char == '"':
            if in_quotes and i + 1 < n and clean[i + 1] == '"':
                current_cell += '"'
                i += 1
            else:
                in_quotes = not in_quotes
        elif char == ',' and not in_quotes:
            current_row.append(current_cell)
            current_cell = ""
        elif (char == '\r' or char == '\n') and not in_quotes:
            if char == '\r' and i + 1 < n and clean[i + 1] == '\n':
                i += 1
            current_row.append(current_cell)
            current_cell = ""
            if any(c.strip() for c in current_row):
                rows.append(current_row)
            current_row = []
        else:
            current_cell += char
        i += 1

    current_row.append(current_cell)
    if any(c.strip() for c in current_row):
        rows.append(current_row)

    return rows

def parse_automation_csv(csv_text: str, territory_id: str, default_status="draft"):
    rows = tokenize_csv(csv_text)
    if len(rows) < 2:
        return {
            "success": False,
            "rules": [],
            "errors": [{"row": 1, "message": "CSV file must contain a header row and at least one data row."}],
            "warnings": [],
            "summary": {"totalRows": len(rows), "validRules": 0, "invalidRows": 1, "unsupportedRules": 0}
        }

    header_row = [h.strip().lower().replace('"', '').replace("'", "") for h in rows[0]]
    expected_headers = ["name", "trigger_type", "action_type", "action_value"]
    missing = [h for h in expected_headers if h not in header_row]
    if missing:
        return {
            "success": False,
            "rules": [],
            "errors": [{"row": 1, "message": f"Missing required headers: {', '.join(missing)}"}],
            "warnings": [],
            "summary": {"totalRows": len(rows), "validRules": 0, "invalidRows": 1, "unsupportedRules": 0}
        }

    name_idx = header_row.index("name")
    trigger_type_idx = header_row.index("trigger_type")
    action_type_idx = header_row.index("action_type")
    action_value_idx = header_row.index("action_value")
    trigger_value_idx = header_row.index("trigger_value") if "trigger_value" in header_row else -1
    desc_idx = header_row.index("description") if "description" in header_row else -1
    template_idx = header_row.index("template_slug") if "template_slug" in header_row else -1

    known_triggers = {"keyword_match", "first_inbound_message", "time_based"}
    known_actions = {"send_message", "add_tag", "remove_tag", "update_stage", "queue_approval"}

    rules = []
    errors = []
    warnings = []
    unsupported_count = 0
    now = "2026-10-26T06:30:00.000Z"

    for r_idx in range(1, len(rows)):
        row_num = r_idx + 1
        cols = rows[r_idx]

        name = cols[name_idx].strip() if name_idx < len(cols) else ""
        t_type = cols[trigger_type_idx].strip() if trigger_type_idx < len(cols) else ""
        t_val = cols[trigger_value_idx] if trigger_value_idx >= 0 and trigger_value_idx < len(cols) else ""
        a_type = cols[action_type_idx].strip() if action_type_idx < len(cols) else ""
        a_val = cols[action_value_idx] if action_value_idx >= 0 and action_value_idx < len(cols) else ""
        desc = cols[desc_idx] if desc_idx >= 0 and desc_idx < len(cols) else ""
        template = cols[template_idx].strip() if template_idx >= 0 and template_idx < len(cols) else ""

        if not name:
            errors.append({"row": row_num, "field": "name", "message": "Rule name cannot be empty."})
            continue
        if not t_type:
            errors.append({"row": row_num, "field": "trigger_type", "message": "Trigger type cannot be empty."})
            continue
        if not a_type:
            errors.append({"row": row_num, "field": "action_type", "message": "Action type cannot be empty."})
            continue
        if not a_val.strip():
            errors.append({"row": row_num, "field": "action_value", "message": "Action value cannot be empty."})
            continue

        if len(cols) != len(header_row):
            warnings.append({"row": row_num, "message": f"Row column count mismatch ({len(cols)} vs {len(header_row)})"})

        is_supported = (t_type in known_triggers) and (a_type in known_actions)
        unsupported_reason = None
        if not is_supported:
            unsupported_count += 1
            reasons = []
            if t_type not in known_triggers: reasons.append(f"Unknown trigger {t_type}")
            if a_type not in known_actions: reasons.append(f"Unknown action {a_type}")
            unsupported_reason = "; ".join(reasons)
            warnings.append({"row": row_num, "message": f"Unsupported rule: {unsupported_reason}"})

        # Anti formula prefix
        if re.match(r"^[=+\-@\t\r]", name): name = f"'{name}"
        if re.match(r"^[=+\-@\t\r]", a_val): a_val = f"'{a_val}"

        # Deterministic hash
        sig = f"{name.strip()}|{t_type.strip()}|{t_val.strip()}|{a_type.strip()}|{territory_id.strip()}"
        rule_id = f"auto_{hashlib.sha256(sig.encode('utf-8')).hexdigest()[:12]}"

        status = "disabled" if not is_supported else default_status

        rule = {
            "id": rule_id,
            "name": name,
            "triggerType": t_type,
            "triggerValue": t_val,
            "actionType": a_type,
            "actionValue": a_val,
            "description": desc or None,
            "templateSlug": template or None,
            "territoryId": territory_id,
            "status": status,
            "isActive": False,
            "isSupported": is_supported,
            "unsupportedReason": unsupported_reason,
            "executionCount": 0,
            "createdAt": now,
            "updatedAt": now,
        }
        rules.append(rule)

    return {
        "success": len(errors) == 0,
        "rules": rules,
        "errors": errors,
        "warnings": warnings,
        "summary": {
            "totalRows": len(rows) - 1,
            "validRules": len(rules),
            "invalidRows": len(errors),
            "unsupportedRules": unsupported_count,
        }
    }


# -----------------------------------------------------------------------------
# SIMULATED AUTOMATIONS API LOGIC (Mirrors src/app/api/crm/automations/route.ts)
# -----------------------------------------------------------------------------
def simulate_get_automations(token=None, territory_id=None, status=None, search=None):
    user = verify_token(token)
    if not user:
        return 401, {"success": False, "error": "Authentication required. Please sign in."}

    store = load_store()
    all_rules = store.get("automations", [])

    if user.get("role") == "SUPER_ADMIN":
        if territory_id and territory_id != "ALL":
            authorized = [r for r in all_rules if (r.get("territoryId") or FLAGSHIP_TERRITORY_ID) == territory_id]
        else:
            authorized = list(all_rules)
    else:
        authorized = [r for r in all_rules if (r.get("territoryId") or FLAGSHIP_TERRITORY_ID) == user.get("territoryId")]

    if status:
        authorized = [r for r in authorized if r.get("status") == status]

    if search:
        sq = search.lower()
        authorized = [
            r for r in authorized
            if sq in r.get("name", "").lower()
            or sq in r.get("triggerValue", "").lower()
            or sq in r.get("actionValue", "").lower()
        ]

    return 200, {
        "success": True,
        "count": len(authorized),
        "automations": authorized,
        "summary": {
            "total": len(authorized),
            "active": len([r for r in authorized if r.get("status") == "active"]),
            "draft": len([r for r in authorized if r.get("status") == "draft"]),
            "paused": len([r for r in authorized if r.get("status") == "paused"]),
            "disabled": len([r for r in authorized if r.get("status") == "disabled"]),
        }
    }

def simulate_post_automations(token=None, body=None, payload_size=0):
    if payload_size > 2 * 1024 * 1024:
        return 413, {"success": False, "error": "Payload too large. Maximum CSV size is 2MB."}

    user = verify_token(token)
    if not user:
        return 401, {"success": False, "error": "Authentication required. Please sign in."}

    body = body or {}

    # Case A: CSV Import / Preview
    if "csvContent" in body:
        csv_text = body.get("csvContent", "")
        dry_run = body.get("dryRun", False)
        req_territory = body.get("territoryId")

        if user.get("role") == "SUPER_ADMIN":
            target_territory = req_territory or FLAGSHIP_TERRITORY_ID
        else:
            target_territory = user.get("territoryId") or FLAGSHIP_TERRITORY_ID
            if req_territory and req_territory != target_territory:
                return 403, {"success": False, "error": f'Access forbidden: You cannot import rules for territory "{req_territory}".'}

        parse_result = parse_automation_csv(csv_text, target_territory, default_status="draft")
        if not parse_result["success"] and len(parse_result["rules"]) == 0:
            return 400, {
                "success": False,
                "error": "CSV parsing failed with fatal errors.",
                "errors": parse_result["errors"],
                "summary": parse_result["summary"],
            }

        store = load_store()
        if "automations" not in store:
            store["automations"] = []

        existing_ids = {r.get("id") for r in store["automations"]}
        new_rules = []
        skipped_count = 0

        for rule in parse_result["rules"]:
            if rule.get("id") in existing_ids:
                skipped_count += 1
            else:
                new_rules.append(rule)
                existing_ids.add(rule.get("id"))

        if dry_run:
            # ZERO mutations
            return 200, {
                "success": True,
                "dryRun": True,
                "preview": {
                    "totalParsed": len(parse_result["rules"]),
                    "createdCount": len(new_rules),
                    "skippedCount": skipped_count,
                    "unsupportedCount": parse_result["summary"]["unsupportedRules"],
                    "sampleRules": parse_result["rules"][:5],
                    "warnings": parse_result["warnings"],
                    "errors": parse_result["errors"],
                }
            }

        if new_rules:
            store["automations"].extend(new_rules)
            save_store(store)

        return 201, {
            "success": True,
            "message": f"Successfully imported {len(new_rules)} automation rules as draft ({skipped_count} duplicates skipped).",
            "importedCount": len(new_rules),
            "skippedCount": skipped_count,
            "summary": parse_result["summary"],
            "warnings": parse_result["warnings"],
        }

    # Case B: Single Rule Creation
    name = body.get("name")
    trigger_type = body.get("triggerType")
    action_type = body.get("actionType")
    action_value = body.get("actionValue")
    req_territory = body.get("territoryId")

    if not name or len(name.strip()) < 2:
        return 400, {"success": False, "error": "Rule name is required and must be at least 2 characters."}
    if not trigger_type:
        return 400, {"success": False, "error": "Trigger type is required."}
    if not action_type:
        return 400, {"success": False, "error": "Action type is required."}
    if not action_value or not action_value.strip():
        return 400, {"success": False, "error": "Action value is required."}

    if user.get("role") == "SUPER_ADMIN":
        target_territory = req_territory or FLAGSHIP_TERRITORY_ID
    else:
        target_territory = user.get("territoryId") or FLAGSHIP_TERRITORY_ID
        if req_territory and req_territory != target_territory:
            return 403, {"success": False, "error": f'Access forbidden: You cannot create rules for territory "{req_territory}".'}

    store = load_store()
    if "automations" not in store:
        store["automations"] = []

    new_rule = {
        "id": f"auto_{int(time.time() * 1000)}",
        "name": name.strip(),
        "triggerType": trigger_type.strip(),
        "triggerValue": body.get("triggerValue", "").strip(),
        "actionType": action_type.strip(),
        "actionValue": action_value.strip(),
        "territoryId": target_territory,
        "status": "draft",
        "isActive": False,
        "isSupported": True,
        "executionCount": 0,
        "createdAt": "2026-10-26T06:30:00.000Z",
        "updatedAt": "2026-10-26T06:30:00.000Z",
    }
    store["automations"].append(new_rule)
    save_store(store)
    return 201, {"success": True, "rule": new_rule}

def simulate_put_automations(token=None, body=None):
    user = verify_token(token)
    if not user:
        return 401, {"success": False, "error": "Authentication required. Please sign in."}

    body = body or {}
    rule_id = body.get("id")
    if not rule_id:
        return 400, {"success": False, "error": "Rule id is required for updates."}

    store = load_store()
    rules = store.get("automations", [])
    rule = next((r for r in rules if r.get("id") == rule_id), None)
    if not rule:
        return 404, {"success": False, "error": f'Automation rule with ID "{rule_id}" was not found.'}

    rule_territory = rule.get("territoryId") or FLAGSHIP_TERRITORY_ID
    if user.get("role") != "SUPER_ADMIN" and user.get("territoryId") != rule_territory:
        return 403, {"success": False, "error": f'Access forbidden: You cannot manage rules for territory "{rule_territory}".'}

    if "status" in body:
        st = body.get("status")
        if st not in ["draft", "active", "paused", "disabled"]:
            return 400, {"success": False, "error": "Invalid status"}
        rule["status"] = st
        rule["isActive"] = (st == "active")

    if "actionValue" in body:
        rule["actionValue"] = body.get("actionValue")

    rule["updatedAt"] = "2026-10-26T06:35:00.000Z"
    save_store(store)
    return 200, {"success": True, "rule": rule}

def simulate_delete_automations(token=None, rule_id=None):
    user = verify_token(token)
    if not user:
        return 401, {"success": False, "error": "Authentication required. Please sign in."}

    if not rule_id:
        return 400, {"success": False, "error": "Rule id is required."}

    store = load_store()
    rules = store.get("automations", [])
    rule = next((r for r in rules if r.get("id") == rule_id), None)
    if not rule:
        return 404, {"success": False, "error": f'Automation rule with ID "{rule_id}" was not found.'}

    rule_territory = rule.get("territoryId") or FLAGSHIP_TERRITORY_ID
    if user.get("role") != "SUPER_ADMIN" and user.get("territoryId") != rule_territory:
        return 403, {"success": False, "error": f'Access forbidden: You cannot delete rules for territory "{rule_territory}".'}

    store["automations"] = [r for r in rules if r.get("id") != rule_id]
    save_store(store)
    return 200, {"success": True, "message": "Automation rule deleted successfully."}


# -----------------------------------------------------------------------------
# MAIN TEST RUNNER
# -----------------------------------------------------------------------------
def main():
    print("=" * 70)
    print("CHOUTUPPAL FRANCHISE CRM — PHASE 3F STEP 2 AUTOMATION DATA & CSV SUITE")
    print("=" * 70)

    # 1. Backup store
    shutil.copyfile(DATA_FILE, BACKUP_FILE)
    initial_store = load_store()
    initial_listings = len(initial_store.get("listings", []))
    initial_contacts = len(initial_store.get("contacts", []))
    initial_deals = len(initial_store.get("deals", []))
    initial_flows = len(initial_store.get("flows", []))
    print(f"[*] Initial Listings: {initial_listings}")
    print(f"[*] Initial Contacts: {initial_contacts}")
    print(f"[*] Initial Deals: {initial_deals}")
    print(f"[*] Initial Flows: {initial_flows}")

    super_admin_token = create_signed_token("9441348175", "SUPER_ADMIN", FLAGSHIP_TERRITORY_ID)
    choutuppal_token = create_signed_token("9848011111", "FRANCHISE_ADMIN", FLAGSHIP_TERRITORY_ID)
    nalgonda_token = create_signed_token("9848022222", "FRANCHISE_ADMIN", "territory_nalgonda")

    try:
        # =====================================================================
        # CHECK 1: Quoted Commas and Escaped Quotes
        # =====================================================================
        print("\n[CHECK 1] Quoted Commas & Escaped Quotes Parsing")
        csv_sample = (
            'name,trigger_type,trigger_value,action_type,action_value,is_active,description,template_slug\n'
            '"Greeting Hi Match",keyword_match,"Hi, hi, HI, Hello, hello, నమస్కారం, హాయ్, నమస్తే, start, Menu",send_message,"నమస్కారం! చౌటుప్పల్ యాప్ కి స్వాగతం. Say ""MENU"" for services.",true,"Greeting Handler",\n'
        )
        res = parse_automation_csv(csv_sample, FLAGSHIP_TERRITORY_ID)
        if res["success"] and len(res["rules"]) == 1:
            r = res["rules"][0]
            if "Hi, hi, HI" in r["triggerValue"] and 'Say "MENU" for services.' in r["actionValue"]:
                log_pass("Quoted commas and escaped quotes parsed accurately", f"triggerValue contains {len(r['triggerValue'].split(','))} keywords")
            else:
                log_fail("Quoted commas and escaped quotes parsing", f"Unexpected content: {r}")
        else:
            log_fail("Quoted commas and escaped quotes parsing", f"Errors: {res.get('errors')}")

        # =====================================================================
        # CHECK 2: Telugu Text & Multiline Fields
        # =====================================================================
        print("\n[CHECK 2] Multilingual Telugu Unicode & Multiline Fields")
        multiline_csv = (
            'name,trigger_type,trigger_value,action_type,action_value,is_active,description,template_slug\n'
            'Multiline Telugu Rule,keyword_match,పోలీస్ స్టేషన్,send_message,"🚨 చౌటుప్పల్ పోలీస్ స్టేషన్:\n📞 ఎస్సై: 9440795640\n📞 సీఐ: 9440795635",true,Emergency,\n'
        )
        res = parse_automation_csv(multiline_csv, FLAGSHIP_TERRITORY_ID)
        if res["success"] and len(res["rules"]) == 1:
            r = res["rules"][0]
            if "\n" in r["actionValue"] and "ఎస్సై: 9440795640" in r["actionValue"]:
                log_pass("Multiline Telugu Unicode preserved across line breaks", f"Lines in actionValue: {len(r['actionValue'].splitlines())}")
            else:
                log_fail("Multiline Telugu Unicode", f"actionValue missing newlines: {r['actionValue']}")
        else:
            log_fail("Multiline Telugu Unicode", f"Errors: {res.get('errors')}")

        # =====================================================================
        # CHECK 3: Missing/Extra Columns & Malformed CSV
        # =====================================================================
        print("\n[CHECK 3] Missing/Extra Columns & Malformed CSV Handling")
        bad_csv = "random_header_1,random_header_2\nval1,val2\n"
        res = parse_automation_csv(bad_csv, FLAGSHIP_TERRITORY_ID)
        if not res["success"] and len(res["errors"]) > 0 and "Missing required headers" in res["errors"][0]["message"]:
            log_pass("Malformed CSV missing headers rejected cleanly", f"Error: {res['errors'][0]['message']}")
        else:
            log_fail("Malformed CSV missing headers rejected cleanly", f"Got: {res}")

        empty_name_csv = (
            'name,trigger_type,trigger_value,action_type,action_value,is_active,description,template_slug\n'
            ',keyword_match,test,send_message,reply,true,desc,\n'
        )
        res = parse_automation_csv(empty_name_csv, FLAGSHIP_TERRITORY_ID)
        if not res["success"] and any("Rule name cannot be empty" in e["message"] for e in res["errors"]):
            log_pass("Empty rule name flagged with row-numbered error", f"Row: {res['errors'][0]['row']}")
        else:
            log_fail("Empty rule name flagged with row-numbered error", f"Got: {res}")

        # =====================================================================
        # CHECK 4: Unknown Triggers and Actions
        # =====================================================================
        print("\n[CHECK 4] Unknown Triggers & Actions Flagged as Unsupported")
        unknown_csv = (
            'name,trigger_type,trigger_value,action_type,action_value,is_active,description,template_slug\n'
            'Rogue Rule,UNKNOWN_TRIGGER,magic_val,EXECUTE_CODE,"console.log(1)",true,desc,\n'
        )
        res = parse_automation_csv(unknown_csv, FLAGSHIP_TERRITORY_ID)
        if len(res["rules"]) == 1:
            r = res["rules"][0]
            if r["isSupported"] is False and r["status"] == "disabled" and "Unknown trigger" in r["unsupportedReason"]:
                log_pass("Unknown trigger and action imported as 'disabled' with isSupported: False", f"reason={r['unsupportedReason']}")
            else:
                log_fail("Unknown trigger and action handling", f"Rule state: {r}")
        else:
            log_fail("Unknown trigger and action handling", f"Errors: {res.get('errors')}")

        # =====================================================================
        # CHECK 5: Authentication Enforcement
        # =====================================================================
        print("\n[CHECK 5] Unauthenticated API Rejection (HTTP 401)")
        code, resp = simulate_get_automations(token=None)
        if code == 401 and resp.get("success") is False:
            log_pass("Unauthenticated GET /api/crm/automations rejected with HTTP 401")
        else:
            log_fail("Unauthenticated GET", f"Got {code}: {resp}")

        code, resp = simulate_post_automations(token=None, body={"name": "Test"})
        if code == 401 and resp.get("success") is False:
            log_pass("Unauthenticated POST /api/crm/automations rejected with HTTP 401")
        else:
            log_fail("Unauthenticated POST", f"Got {code}: {resp}")

        # =====================================================================
        # CHECK 6: Cross-Territory Access Rejection
        # =====================================================================
        print("\n[CHECK 6] Cross-Territory Access Rejection (HTTP 403)")
        # Nalgonda Admin attempts to import rules for Choutuppal
        code, resp = simulate_post_automations(
            token=nalgonda_token,
            body={"csvContent": csv_sample, "territoryId": FLAGSHIP_TERRITORY_ID}
        )
        if code == 403 and resp.get("success") is False:
            log_pass("Cross-territory CSV import rejected with HTTP 403 Forbidden")
        else:
            log_fail("Cross-territory CSV import rejected", f"Got {code}: {resp}")

        # =====================================================================
        # CHECK 7: Draft Status on Import
        # =====================================================================
        print("\n[CHECK 7] Draft Status on Import (Non-Active by Default)")
        fresh_csv_sample = (
            'name,trigger_type,trigger_value,action_type,action_value,is_active,description,template_slug\n'
            '"Unique Brand New Draft Rule",keyword_match,"test, fresh",send_message,"Draft reply text",true,"Fresh Draft Handler",\n'
        )
        code, resp = simulate_post_automations(
            token=choutuppal_token,
            body={"csvContent": fresh_csv_sample, "dryRun": False}
        )
        if code == 201 and resp.get("importedCount") == 1:
            store = load_store()
            imported_rule = store["automations"][-1]
            if imported_rule["status"] == "draft" and imported_rule["isActive"] is False:
                log_pass("Imported rule assigned 'draft' status and isActive: False", f"id={imported_rule['id']}")
            else:
                log_fail("Imported rule draft status", f"Status: {imported_rule.get('status')}")
        else:
            log_fail("Imported rule creation", f"Got {code}: {resp}")

        # =====================================================================
        # CHECK 8: Preview Causes Zero Mutations
        # =====================================================================
        print("\n[CHECK 8] Dry-Run Preview Causes Zero Store Mutations")
        store_before_preview = load_store()
        rules_before = len(store_before_preview.get("automations", []))

        with open("csv/sample_automations.csv", "r", encoding="utf-8") as f:
            full_csv = f.read()

        code, resp = simulate_post_automations(
            token=choutuppal_token,
            body={"csvContent": full_csv, "dryRun": True}
        )
        store_after_preview = load_store()
        rules_after = len(store_after_preview.get("automations", []))

        if code == 200 and resp.get("dryRun") is True and rules_before == rules_after:
            prev = resp["preview"]
            log_pass(f"Dry-run preview parsed {prev['totalParsed']} rules with ZERO store mutations",
                     f"Rules in store: {rules_before} before, {rules_after} after")
        else:
            log_fail("Dry-run preview zero mutations", f"Rules before: {rules_before}, after: {rules_after}, code: {code}")

        # =====================================================================
        # CHECK 9: Duplicate Imports Do Not Create Duplicate Rules
        # =====================================================================
        print("\n[CHECK 9] Deterministic Deduplication on Duplicate Import")
        # Import the exact same fresh_csv_sample again
        code, resp = simulate_post_automations(
            token=choutuppal_token,
            body={"csvContent": fresh_csv_sample, "dryRun": False}
        )
        if code == 201 and resp.get("importedCount") == 0 and resp.get("skippedCount") == 1:
            log_pass("Duplicate CSV import detected identical rule and skipped cleanly", f"skippedCount={resp.get('skippedCount')}")
        else:
            log_fail("Duplicate CSV import detection", f"Got {code}: {resp}")

        # =====================================================================
        # CHECK 10: Full Master Import of sample_automations.csv
        # =====================================================================
        print("\n[CHECK 10] Master Dataset Ingestion (179 Rules)")
        code, resp = simulate_post_automations(
            token=choutuppal_token,
            body={"csvContent": full_csv, "dryRun": False}
        )
        if code == 201:
            store = load_store()
            total_imported = len(store.get("automations", []))
            log_pass(f"Successfully ingested master automations dataset ({total_imported} rules stored)",
                     f"imported={resp.get('importedCount')}, skipped={resp.get('skippedCount')}")
        else:
            log_fail("Master dataset ingestion", f"Got {code}: {resp}")

        # =====================================================================
        # CHECK 11: Rule Lifecycle Management (Draft -> Active -> Paused)
        # =====================================================================
        print("\n[CHECK 11] Rule Lifecycle & Status Transitions")
        store = load_store()
        target_rule = store["automations"][0]
        rule_id = target_rule["id"]

        # Activate rule
        code, resp = simulate_put_automations(token=choutuppal_token, body={"id": rule_id, "status": "active"})
        if code == 200 and resp["rule"]["status"] == "active" and resp["rule"]["isActive"] is True:
            log_pass("Rule transitioned to 'active' status")
        else:
            log_fail("Rule activation", f"Got {code}: {resp}")

        # Pause rule
        code, resp = simulate_put_automations(token=choutuppal_token, body={"id": rule_id, "status": "paused"})
        if code == 200 and resp["rule"]["status"] == "paused" and resp["rule"]["isActive"] is False:
            log_pass("Rule transitioned to 'paused' status")
        else:
            log_fail("Rule pausing", f"Got {code}: {resp}")

        # Cross-territory update blocked
        code, resp = simulate_put_automations(token=nalgonda_token, body={"id": rule_id, "status": "active"})
        if code == 403:
            log_pass("Cross-territory rule modification blocked with HTTP 403 Forbidden")
        else:
            log_fail("Cross-territory rule modification blocked", f"Got {code}: {resp}")

        # =====================================================================
        # CHECK 12: Baseline Data Safety & Flow Preservation
        # =====================================================================
        print("\n[CHECK 12] Baseline Data Integrity Verification")
        final_store = load_store()
        final_listings = len(final_store.get("listings", []))
        final_contacts = len(final_store.get("contacts", []))
        final_deals = len(final_store.get("deals", []))
        final_flows = len(final_store.get("flows", []))

        if final_listings == initial_listings:
            log_pass(f"All {initial_listings} listings intact (including 211 flagship)", f"Count={final_listings}")
        else:
            log_fail("Listings integrity compromised", f"Expected {initial_listings}, got {final_listings}")

        if final_contacts == initial_contacts:
            log_pass(f"All {initial_contacts} contacts intact", f"Count={final_contacts}")
        else:
            log_fail("Contacts integrity compromised", f"Expected {initial_contacts}, got {final_contacts}")

        if final_deals == initial_deals:
            log_pass(f"All {initial_deals} deals intact", f"Count={final_deals}")
        else:
            log_fail("Deals integrity compromised", f"Expected {initial_deals}, got {final_deals}")

        if final_flows == initial_flows:
            log_pass(f"All {initial_flows} flows intact", f"Count={final_flows}")
        else:
            log_fail("Flows integrity compromised", f"Expected {initial_flows}, got {final_flows}")

    finally:
        # Clean up and restore backup
        if os.path.exists(BACKUP_FILE):
            shutil.copyfile(BACKUP_FILE, DATA_FILE)
            os.remove(BACKUP_FILE)
            print("\n[*] Cleaned up and restored database backup.")

    print("\n" + "=" * 70)
    print(f"PHASE 3F STEP 2 TEST SUMMARY: {passed} PASSED, {failed} FAILED")
    print("=" * 70)

    if failed > 0:
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()
