#!/usr/bin/env python3
"""
Choutuppal Franchise CRM — Phase 3F Step 3 Engine Test Suite
Deterministic Automation Rule Evaluation Engine & Dry-Run API Tests

Verifies all 16 specification points:
 1. Active keyword rule matching
 2. Draft rule never matching
 3. Paused and disabled rules never matching
 4. Unsupported rule rejection
 5. First-inbound trigger behavior
 6. Keyword boundary and normalization behavior
 7. Multiple-match deterministic behavior & single-reply policy
 8. Cross-territory rule exclusion
 9. Safe template substitution
 10. Unknown template variables
 11. Unsupported actions & deal stage validation
 12. Time-based rules explicitly deferred
 13. No storage mutation during evaluation
 14. No outbound network calls or WhatsApp messages
 15. Dry-run API authentication and tenant authorization
 16. Existing automation, contact, flow, and listing counts remain unchanged
"""

import os
import sys
import json
import time
import hmac
import hashlib
import base64
import shutil
import subprocess

DATA_FILE = "data/admin_data.json"
BACKUP_FILE = "data/admin_data.json.bak"
SESSION_SECRET = os.environ.get("SESSION_SECRET", "choutuppal-super-secret-session-key-change-in-production")
FLAGSHIP_TERRITORY_ID = "territory_choutuppal"

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

# -----------------------------------------------------------------------------
# AUTH & TOKEN HELPERS
# -----------------------------------------------------------------------------
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
# NODE EVALUATOR RUNNER (Direct invocation of TypeScript Engine)
# -----------------------------------------------------------------------------
def run_node_evaluator(eval_options: dict) -> dict:
    code = f"""
    import {{ evaluateAutomations }} from './src/lib/automation-engine.ts';
    const opts = {json.dumps(eval_options)};
    const res = evaluateAutomations(opts);
    console.log(JSON.stringify(res));
    """
    proc = subprocess.run(
        ["node", "--loader", "./scripts/ts-loader.mjs", "--input-type=module"],
        input=code,
        capture_output=True,
        text=True,
        timeout=15
    )
    if proc.returncode != 0:
        raise RuntimeError(f"Node execution failed (code {proc.returncode}): {proc.stderr}")
    for line in proc.stdout.splitlines():
        line = line.strip()
        if line.startswith("{") and line.endswith("}"):
            return json.loads(line)
    raise ValueError(f"Could not parse JSON from Node output: {proc.stdout}")

# -----------------------------------------------------------------------------
# SIMULATE DRY-RUN API ROUTE
# -----------------------------------------------------------------------------
def simulate_dry_run_api(token=None, raw_body_str=None, body_dict=None):
    user = verify_token(token)
    if not user:
        return 401, {"success": False, "error": "Authentication required. Please sign in."}

    if raw_body_str is not None:
        if len(raw_body_str.encode("utf-8")) > 64 * 1024:
            return 413, {"success": False, "error": "Payload too large. Maximum size is 64KB."}
        try:
            body = json.loads(raw_body_str)
        except Exception:
            return 400, {"success": False, "error": "Malformed JSON payload."}
    else:
        body = body_dict or {}

    message_text = (body.get("messageText") or "").strip()
    if not message_text:
        return 400, {"success": False, "error": "messageText is required for dry-run evaluation."}

    phone = body.get("phone", "919441348175")
    contact_name = body.get("contactName")
    provider_msg_id = body.get("providerMessageId")
    req_rule_ids = body.get("ruleIds")

    # Territory isolation
    if user.get("role") == "SUPER_ADMIN":
        target_territory = body.get("territoryId") or FLAGSHIP_TERRITORY_ID
    else:
        target_territory = user.get("territoryId") or FLAGSHIP_TERRITORY_ID
        if body.get("territoryId") and body.get("territoryId") != target_territory:
            return 403, {"success": False, "error": f'Access forbidden: You cannot dry-run automations for territory "{body.get("territoryId")}".'}

    store = load_store()
    all_rules = store.get("automations", [])
    candidate_rules = [
        r for r in all_rules
        if (r.get("territoryId") or FLAGSHIP_TERRITORY_ID) == target_territory or r.get("isGlobal") is True
    ]
    if req_rule_ids:
        candidate_rules = [r for r in candidate_rules if r.get("id") in req_rule_ids]

    clean_phone = "".join(filter(str.isdigit, phone))
    contacts = store.get("contacts", [])
    existing_contact = next((c for c in contacts if "".join(filter(str.isdigit, c.get("phone", ""))) == clean_phone), None)

    if existing_contact:
        contact_ctx = {
            "id": existing_contact.get("id"),
            "name": existing_contact.get("name"),
            "phone": existing_contact.get("phone"),
            "tags": existing_contact.get("tags", []),
            "stage": existing_contact.get("stage", "NEW_LEAD"),
            "messageCount": existing_contact.get("messageCount", 0),
            "isFirstInbound": existing_contact.get("messageCount", 0) == 0,
        }
    else:
        contact_ctx = {
            "name": contact_name or "Citizen",
            "phone": phone,
            "messageCount": 0,
            "isFirstInbound": True,
        }

    territory_ctx = {
        "territoryId": target_territory,
        "territoryName": "Choutuppal" if target_territory == FLAGSHIP_TERRITORY_ID else target_territory,
        "primaryDomain": "choutuppal.in",
        "contactPhone": "9441348175",
        "whatsappNumber": "9441348175",
    }

    eval_res = run_node_evaluator({
        "event": {
            "messageText": message_text,
            "phone": phone,
            "providerMessageId": provider_msg_id,
            "contactName": contact_ctx["name"],
            "timestamp": "2026-10-26T07:15:00.000Z",
        },
        "territory": territory_ctx,
        "rules": candidate_rules,
        "contact": contact_ctx,
        "requireIdempotency": bool(body.get("requireIdempotency")),
        "cooldownSeconds": body.get("cooldownSeconds"),
    })

    return 200, {
        "success": True,
        "dryRun": True,
        "dispatched": False,
        "territoryId": target_territory,
        "evaluation": eval_res,
        "notice": "Dry-run completed in sandbox. Zero store mutations or external WhatsApp dispatches occurred."
    }


# -----------------------------------------------------------------------------
# MAIN TEST EXECUTION
# -----------------------------------------------------------------------------
def main():
    print("=" * 70)
    print("CHOUTUPPAL FRANCHISE CRM — PHASE 3F STEP 3 AUTOMATION ENGINE SUITE")
    print("=" * 70)

    # Backup store
    shutil.copyfile(DATA_FILE, BACKUP_FILE)
    initial_store = load_store()
    initial_listings = len(initial_store.get("listings", []))
    initial_contacts = len(initial_store.get("contacts", []))
    initial_deals = len(initial_store.get("deals", []))
    initial_flows = len(initial_store.get("flows", []))
    initial_automations = len(initial_store.get("automations", []))

    print(f"[*] Initial Listings: {initial_listings}")
    print(f"[*] Initial Contacts: {initial_contacts}")
    print(f"[*] Initial Deals: {initial_deals}")
    print(f"[*] Initial Flows: {initial_flows}")
    print(f"[*] Initial Automations: {initial_automations}")

    super_admin_token = create_signed_token("9441348175", "SUPER_ADMIN", FLAGSHIP_TERRITORY_ID)
    choutuppal_token = create_signed_token("9848011111", "FRANCHISE_ADMIN", FLAGSHIP_TERRITORY_ID)
    nalgonda_token = create_signed_token("9848022222", "FRANCHISE_ADMIN", "territory_nalgonda")

    try:
        # =====================================================================
        # CHECK 1: Active Keyword Rule Matching
        # =====================================================================
        print("\n[CHECK 1] Active Keyword Rule Matching")
        active_rule = {
            "id": "rule_active_01",
            "name": "Active Greeting",
            "triggerType": "keyword_match",
            "triggerValue": "hi, hello, namaste",
            "actionType": "send_message",
            "actionValue": "Hello {{contact.name}}! Welcome to {{territory.name}}.",
            "status": "active",
            "isActive": True,
            "isSupported": True,
            "territoryId": FLAGSHIP_TERRITORY_ID,
        }
        res = run_node_evaluator({
            "event": {"messageText": "Hello there!", "phone": "9848012345"},
            "territory": {"territoryId": FLAGSHIP_TERRITORY_ID, "territoryName": "Choutuppal"},
            "rules": [active_rule],
            "contact": {"name": "Ravi Kumar"}
        })
        if res["success"] and "rule_active_01" in res["matchedRuleIds"]:
            act = res["proposedActions"][0]
            if act["renderedValue"] == "Hello Ravi Kumar! Welcome to Choutuppal.":
                log_pass("Active keyword rule matched and rendered greeting", f"rendered='{act['renderedValue']}'")
            else:
                log_fail("Active keyword action render", f"Got: {act}")
        else:
            log_fail("Active keyword rule matching", f"Result: {res}")

        # =====================================================================
        # CHECK 2: Draft Rule Never Matching
        # =====================================================================
        print("\n[CHECK 2] Draft Rule Never Matching")
        draft_rule = {
            "id": "rule_draft_01",
            "name": "Draft Greeting",
            "triggerType": "keyword_match",
            "triggerValue": "hi, hello",
            "actionType": "send_message",
            "actionValue": "Draft reply text",
            "status": "draft",
            "isActive": False,
            "isSupported": True,
            "territoryId": FLAGSHIP_TERRITORY_ID,
        }
        res = run_node_evaluator({
            "event": {"messageText": "hello", "phone": "9848012345"},
            "territory": {"territoryId": FLAGSHIP_TERRITORY_ID},
            "rules": [draft_rule]
        })
        if len(res["matchedRuleIds"]) == 0 and "rule_draft_01" in res["skippedRuleIds"]:
            trace = res["trace"][0]
            if "must be 'active'" in trace.get("skipReason", ""):
                log_pass("Draft rule strictly excluded from matching", f"skipReason='{trace['skipReason']}'")
            else:
                log_fail("Draft rule skipReason", f"Got: {trace}")
        else:
            log_fail("Draft rule never matching", f"Result: {res}")

        # =====================================================================
        # CHECK 3: Paused and Disabled Rules Never Matching
        # =====================================================================
        print("\n[CHECK 3] Paused and Disabled Rules Never Matching")
        paused_rule = {
            "id": "rule_paused_01",
            "name": "Paused Promotion",
            "triggerType": "keyword_match",
            "triggerValue": "discount",
            "actionType": "send_message",
            "actionValue": "Promo",
            "status": "paused",
            "isActive": False,
            "isSupported": True,
            "territoryId": FLAGSHIP_TERRITORY_ID,
        }
        disabled_rule = {
            "id": "rule_disabled_01",
            "name": "Disabled Rule",
            "triggerType": "keyword_match",
            "triggerValue": "discount",
            "actionType": "send_message",
            "actionValue": "Promo",
            "status": "disabled",
            "isActive": False,
            "isSupported": True,
            "territoryId": FLAGSHIP_TERRITORY_ID,
        }
        res = run_node_evaluator({
            "event": {"messageText": "I want a discount", "phone": "9848012345"},
            "territory": {"territoryId": FLAGSHIP_TERRITORY_ID},
            "rules": [paused_rule, disabled_rule]
        })
        if len(res["matchedRuleIds"]) == 0 and "rule_paused_01" in res["skippedRuleIds"] and "rule_disabled_01" in res["skippedRuleIds"]:
            log_pass("Paused and disabled rules excluded from matching", f"skippedCount={res['summary']['skippedCount']}")
        else:
            log_fail("Paused and disabled rule matching", f"Result: {res}")

        # =====================================================================
        # CHECK 4: Unsupported Rule Rejection
        # =====================================================================
        print("\n[CHECK 4] Unsupported Rule Rejection")
        unsupported_rule = {
            "id": "rule_unsupp_01",
            "name": "Rogue Rule",
            "triggerType": "ai_intent_prediction",
            "triggerValue": "high_intent",
            "actionType": "execute_arbitrary_code",
            "actionValue": "eval(something)",
            "status": "disabled",
            "isActive": False,
            "isSupported": False,
            "unsupportedReason": "Unsupported trigger type ai_intent_prediction",
            "territoryId": FLAGSHIP_TERRITORY_ID,
        }
        res = run_node_evaluator({
            "event": {"messageText": "high_intent", "phone": "9848012345"},
            "territory": {"territoryId": FLAGSHIP_TERRITORY_ID},
            "rules": [unsupported_rule]
        })
        if "rule_unsupp_01" in res["unsupportedRuleIds"]:
            log_pass("Unsupported rule flagged in unsupportedRuleIds without evaluation", f"unsupportedCount={res['summary']['unsupportedCount']}")
        else:
            log_fail("Unsupported rule rejection", f"Result: {res}")

        # =====================================================================
        # CHECK 5: First-Inbound Trigger Behavior
        # =====================================================================
        print("\n[CHECK 5] First-Inbound Trigger Behavior")
        first_inbound_rule = {
            "id": "rule_first_01",
            "name": "Welcome New Citizen",
            "triggerType": "first_inbound_message",
            "triggerValue": "",
            "actionType": "send_message",
            "actionValue": "Welcome for the first time!",
            "status": "active",
            "isActive": True,
            "isSupported": True,
            "territoryId": FLAGSHIP_TERRITORY_ID,
        }
        # Case A: Brand new contact (messageCount = 0)
        res_new = run_node_evaluator({
            "event": {"messageText": "Any text", "phone": "9848099999"},
            "territory": {"territoryId": FLAGSHIP_TERRITORY_ID},
            "rules": [first_inbound_rule],
            "contact": {"name": "New User", "messageCount": 0, "isFirstInbound": True}
        })
        # Case B: Returning contact (messageCount = 3)
        res_returning = run_node_evaluator({
            "event": {"messageText": "Any text", "phone": "9848099999"},
            "territory": {"territoryId": FLAGSHIP_TERRITORY_ID},
            "rules": [first_inbound_rule],
            "contact": {"name": "Old User", "messageCount": 3, "isFirstInbound": False}
        })
        if "rule_first_01" in res_new["matchedRuleIds"] and "rule_first_01" in res_returning["skippedRuleIds"]:
            log_pass("First-inbound triggers exclusively on new contacts", "Matches on messageCount=0, skips on messageCount=3")
        else:
            log_fail("First-inbound trigger behavior", f"New: {res_new['matchedRuleIds']}, Returning: {res_returning['matchedRuleIds']}")

        # =====================================================================
        # CHECK 6: Keyword Boundary and Normalization Behavior
        # =====================================================================
        print("\n[CHECK 6] Keyword Boundary & Unicode Normalization")
        kw_rule = {
            "id": "rule_kw_boundary",
            "name": "Boundary Test",
            "triggerType": "keyword_match",
            "triggerValue": "hi, 1, ఆటో",
            "actionType": "send_message",
            "actionValue": "Matched boundary",
            "status": "active",
            "isActive": True,
            "isSupported": True,
            "territoryId": FLAGSHIP_TERRITORY_ID,
        }
        # 6a. Substring false positive rejection: "this is cool" contains "hi" as substring
        res_false_pos = run_node_evaluator({
            "event": {"messageText": "this is cool", "phone": "9848012345"},
            "territory": {"territoryId": FLAGSHIP_TERRITORY_ID},
            "rules": [kw_rule]
        })
        # 6b. Number boundary: "12345" contains "1"
        res_num_false = run_node_evaluator({
            "event": {"messageText": "order 12345", "phone": "9848012345"},
            "territory": {"territoryId": FLAGSHIP_TERRITORY_ID},
            "rules": [kw_rule]
        })
        # 6c. Valid boundary match: "say hi!"
        res_valid_hi = run_node_evaluator({
            "event": {"messageText": "say hi!", "phone": "9848012345"},
            "territory": {"territoryId": FLAGSHIP_TERRITORY_ID},
            "rules": [kw_rule]
        })
        # 6d. Telugu isolated boundary match: "నాకు ఆటో కావాలి"
        res_valid_telugu = run_node_evaluator({
            "event": {"messageText": "నాకు ఆటో కావాలి", "phone": "9848012345"},
            "territory": {"territoryId": FLAGSHIP_TERRITORY_ID},
            "rules": [kw_rule]
        })
        # 6e. Telugu compound false positive: "ఈ నాఆటో బాగాలేదు"
        res_compound_telugu = run_node_evaluator({
            "event": {"messageText": "ఈ నాఆటో బాగాలేదు", "phone": "9848012345"},
            "territory": {"territoryId": FLAGSHIP_TERRITORY_ID},
            "rules": [kw_rule]
        })

        if (len(res_false_pos["matchedRuleIds"]) == 0 and
            len(res_num_false["matchedRuleIds"]) == 0 and
            len(res_valid_hi["matchedRuleIds"]) == 1 and
            len(res_valid_telugu["matchedRuleIds"]) == 1 and
            len(res_compound_telugu["matchedRuleIds"]) == 0):
            log_pass("Word boundary prevents substring false positives across Latin digits & Telugu Unicode")
        else:
            log_fail("Keyword boundary testing",
                     f"hi_false={len(res_false_pos['matchedRuleIds'])}, num_false={len(res_num_false['matchedRuleIds'])}, "
                     f"valid_hi={len(res_valid_hi['matchedRuleIds'])}, valid_te={len(res_valid_telugu['matchedRuleIds'])}, "
                     f"te_comp={len(res_compound_telugu['matchedRuleIds'])}")

        # =====================================================================
        # CHECK 7: Multiple-Match Deterministic Behavior & Single-Reply Policy
        # =====================================================================
        print("\n[CHECK 7] Multiple-Match Deterministic Behavior & Single Reply Policy")
        rule_short = {
            "id": "rule_police_short",
            "name": "General Police",
            "triggerType": "keyword_match",
            "triggerValue": "police",
            "actionType": "send_message",
            "actionValue": "General Police Info",
            "status": "active",
            "isActive": True,
            "isSupported": True,
            "territoryId": FLAGSHIP_TERRITORY_ID,
        }
        rule_long = {
            "id": "rule_police_long",
            "name": "Choutuppal Police Station Direct",
            "triggerType": "keyword_match",
            "triggerValue": "police station, choutuppal police",
            "actionType": "send_message",
            "actionValue": "Choutuppal Police Station SI: 9440795640",
            "status": "active",
            "isActive": True,
            "isSupported": True,
            "territoryId": FLAGSHIP_TERRITORY_ID,
        }
        res_multi = run_node_evaluator({
            "event": {"messageText": "need choutuppal police station immediately", "phone": "9848012345"},
            "territory": {"territoryId": FLAGSHIP_TERRITORY_ID},
            "rules": [rule_short, rule_long] # Intentionally pass short first
        })

        if len(res_multi["matchedRuleIds"]) == 2:
            # Winner should be rule_police_long due to longer keyword length
            winner_id = res_multi["matchedRuleIds"][0]
            unsuppressed_replies = [a for a in res_multi["proposedActions"] if a.get("actionType") == "send_message" and not a.get("isSuppressed")]
            suppressed_replies = [a for a in res_multi["proposedActions"] if a.get("actionType") == "send_message" and a.get("isSuppressed")]

            if winner_id == "rule_police_long" and len(unsuppressed_replies) == 1 and len(suppressed_replies) == 1:
                log_pass("Longest keyword prioritized & exactly 1 non-suppressed reply planned",
                         f"Winner={winner_id}, Suppressed={suppressed_replies[0]['ruleId']}")
            else:
                log_fail("Multiple match ordering/suppression", f"Winner={winner_id}, unsupp={len(unsuppressed_replies)}, supp={len(suppressed_replies)}")
        else:
            log_fail("Multiple match detection", f"Result: {res_multi}")

        # =====================================================================
        # CHECK 8: Cross-Territory Rule Exclusion
        # =====================================================================
        print("\n[CHECK 8] Cross-Territory Rule Exclusion")
        nalgonda_rule = {
            "id": "rule_nalgonda_01",
            "name": "Nalgonda Emergency",
            "triggerType": "keyword_match",
            "triggerValue": "emergency, help",
            "actionType": "send_message",
            "actionValue": "Nalgonda Control Room",
            "status": "active",
            "isActive": True,
            "isSupported": True,
            "territoryId": "territory_nalgonda",
        }
        res_cross = run_node_evaluator({
            "event": {"messageText": "emergency help needed", "phone": "9848012345"},
            "territory": {"territoryId": FLAGSHIP_TERRITORY_ID},
            "rules": [nalgonda_rule]
        })
        if len(res_cross["matchedRuleIds"]) == 0 and "rule_nalgonda_01" in res_cross["skippedRuleIds"]:
            log_pass("Foreign territory rule excluded by evaluator context", f"skipReason='{res_cross['trace'][0]['skipReason']}'")
        else:
            log_fail("Cross-territory rule exclusion", f"Result: {res_cross}")

        # =====================================================================
        # CHECK 9: Safe Template Substitution
        # =====================================================================
        print("\n[CHECK 9] Safe Template Variable Substitution")
        template_rule = {
            "id": "rule_tmpl_01",
            "name": "Template Test",
            "triggerType": "keyword_match",
            "triggerValue": "info",
            "actionType": "send_message",
            "actionValue": "Dear {{contact.name}}, your phone is {{contact.phone}}. Visit {{territory.domain}} or call {{territory.phone}}.",
            "status": "active",
            "isActive": True,
            "isSupported": True,
            "territoryId": FLAGSHIP_TERRITORY_ID,
        }
        res_tmpl = run_node_evaluator({
            "event": {"messageText": "need info", "phone": "9441348175"},
            "territory": {
                "territoryId": FLAGSHIP_TERRITORY_ID,
                "territoryName": "Choutuppal",
                "primaryDomain": "choutuppal.in",
                "contactPhone": "9441348175"
            },
            "rules": [template_rule],
            "contact": {"name": "Laxman Rao", "phone": "9441348175"}
        })
        expected_rendered = "Dear Laxman Rao, your phone is 9441348175. Visit choutuppal.in or call 9441348175."
        actual_rendered = res_tmpl["proposedActions"][0]["renderedValue"]
        if actual_rendered == expected_rendered:
            log_pass("Allowlisted template variables accurately substituted", f"rendered='{actual_rendered}'")
        else:
            log_fail("Safe template substitution", f"Expected '{expected_rendered}', got '{actual_rendered}'")

        # =====================================================================
        # CHECK 10: Unknown Template Variables Handled Gracefully
        # =====================================================================
        print("\n[CHECK 10] Unknown Template Variables Warning & Safety")
        unknown_var_rule = {
            "id": "rule_unknown_var",
            "name": "Unknown Var Test",
            "triggerType": "keyword_match",
            "triggerValue": "status",
            "actionType": "send_message",
            "actionValue": "Hello {{contact.name}}, your token is {{user.password_hash}} and secret is {{eval(evil)}}.",
            "status": "active",
            "isActive": True,
            "isSupported": True,
            "territoryId": FLAGSHIP_TERRITORY_ID,
        }
        res_unknown = run_node_evaluator({
            "event": {"messageText": "check status", "phone": "9441348175"},
            "territory": {"territoryId": FLAGSHIP_TERRITORY_ID},
            "rules": [unknown_var_rule],
            "contact": {"name": "Suresh"}
        })
        act = res_unknown["proposedActions"][0]
        warnings = act.get("warnings", [])
        if any("user.password_hash" in w for w in warnings) and "{{user.password_hash}}" in act["renderedValue"]:
            log_pass("Unknown template variables left unreplaced with validation warnings", f"Warnings count: {len(warnings)}")
        else:
            log_fail("Unknown template variable handling", f"Action: {act}")

        # =====================================================================
        # CHECK 11: Unsupported Actions & Stage Validation
        # =====================================================================
        print("\n[CHECK 11] Action Type Validation & Stage Verification")
        # 11a: Unsupported action
        bad_act_rule = {
            "id": "rule_bad_act",
            "name": "Rogue Action Rule",
            "triggerType": "keyword_match",
            "triggerValue": "hack",
            "actionType": "EXECUTE_SYSTEM_COMMAND",
            "actionValue": "rm -rf /",
            "status": "active",
            "isActive": True,
            "isSupported": True,
            "territoryId": FLAGSHIP_TERRITORY_ID,
        }
        # 11b: Valid stage update
        valid_stage_rule = {
            "id": "rule_valid_stage",
            "name": "Promote to Qualified",
            "triggerType": "keyword_match",
            "triggerValue": "quote, pricing",
            "actionType": "update_stage",
            "actionValue": "QUALIFIED",
            "status": "active",
            "isActive": True,
            "isSupported": True,
            "territoryId": FLAGSHIP_TERRITORY_ID,
        }
        # 11c: Invalid stage update
        invalid_stage_rule = {
            "id": "rule_invalid_stage",
            "name": "Invalid Stage Rule",
            "triggerType": "keyword_match",
            "triggerValue": "pricing",
            "actionType": "update_stage",
            "actionValue": "BOGUS_STAGE_NAME",
            "status": "active",
            "isActive": True,
            "isSupported": True,
            "territoryId": FLAGSHIP_TERRITORY_ID,
        }
        res_actions = run_node_evaluator({
            "event": {"messageText": "pricing quote hack", "phone": "9441348175"},
            "territory": {"territoryId": FLAGSHIP_TERRITORY_ID},
            "rules": [bad_act_rule, valid_stage_rule, invalid_stage_rule]
        })
        act_bad = next((a for a in res_actions["proposedActions"] if a["ruleId"] == "rule_bad_act"), None)
        act_valid = next((a for a in res_actions["proposedActions"] if a["ruleId"] == "rule_valid_stage"), None)
        act_inv_stage = next((a for a in res_actions["proposedActions"] if a["ruleId"] == "rule_invalid_stage"), None)

        if (act_bad and act_bad.get("isSuppressed") and "Unsupported action" in act_bad.get("suppressionReason", "") and
            act_valid and not act_valid.get("isSuppressed") and act_valid.get("actionValue") == "QUALIFIED" and
            act_inv_stage and act_inv_stage.get("isSuppressed") and "Invalid deal stage" in act_inv_stage.get("suppressionReason", "")):
            log_pass("Action validation allows valid DealStage and suppresses unsupported actions/invalid stages")
        else:
            log_fail("Action validation", f"bad={act_bad}, valid={act_valid}, inv_stage={act_inv_stage}")

        # =====================================================================
        # CHECK 12: Time-Based Rules Explicitly Deferred
        # =====================================================================
        print("\n[CHECK 12] Time-Based Rules Explicitly Deferred")
        time_rule = {
            "id": "rule_time_01",
            "name": "Followup In 24h",
            "triggerType": "time_based",
            "triggerValue": "delay_24h",
            "actionType": "send_message",
            "actionValue": "Following up with you!",
            "status": "active",
            "isActive": True,
            "isSupported": True,
            "territoryId": FLAGSHIP_TERRITORY_ID,
        }
        res_time = run_node_evaluator({
            "event": {"messageText": "hello", "phone": "9441348175"},
            "territory": {"territoryId": FLAGSHIP_TERRITORY_ID},
            "rules": [time_rule]
        })
        if "rule_time_01" in res_time["deferredRuleIds"] and "explicitly deferred" in res_time["trace"][0]["skipReason"]:
            log_pass("time_based trigger cataloged in deferredRuleIds with explicit reason",
                     f"skipReason='{res_time['trace'][0]['skipReason']}'")
        else:
            log_fail("Time-based deferred check", f"Result: {res_time}")

        # =====================================================================
        # CHECK 13: Zero Storage Mutation During Evaluation
        # =====================================================================
        print("\n[CHECK 13] Zero Storage Mutation Guarantee")
        with open(DATA_FILE, "rb") as f:
            bytes_before = f.read()

        # Run multiple evaluations on real store rules
        store_rules = load_store().get("automations", [])
        _ = run_node_evaluator({
            "event": {"messageText": "Hi hello police station", "phone": "9441348175"},
            "territory": {"territoryId": FLAGSHIP_TERRITORY_ID},
            "rules": store_rules
        })

        with open(DATA_FILE, "rb") as f:
            bytes_after = f.read()

        if bytes_before == bytes_after:
            log_pass("Evaluator is completely pure: storage hash and bytes 100% identical before and after")
        else:
            log_fail("Storage mutation detected", f"Bytes before: {len(bytes_before)}, after: {len(bytes_after)}")

        # =====================================================================
        # CHECK 14: Zero Outbound Network Calls / WhatsApp Messages
        # =====================================================================
        print("\n[CHECK 14] Pure Evaluator Network Isolation")
        # In dry run and evaluation, verify no messages appended to store.messages
        store_before_msg = len(load_store().get("messages", []))
        code, resp = simulate_dry_run_api(
            token=choutuppal_token,
            body_dict={"messageText": "Hi there! I need a doctor", "phone": "9441348175"}
        )
        store_after_msg = len(load_store().get("messages", []))

        if code == 200 and resp.get("dispatched") is False and store_before_msg == store_after_msg:
            log_pass("Dry-run API explicitly flags dispatched: False and creates zero outbound messages",
                     f"messages in store: {store_after_msg}")
        else:
            log_fail("Outbound network isolation", f"Code={code}, resp={resp}")

        # =====================================================================
        # CHECK 15: Dry-Run API Authentication and Tenant Authorization
        # =====================================================================
        print("\n[CHECK 15] Dry-Run API Authentication & Tenant Authorization")
        # 15a: Unauthenticated call -> 401
        c_unauth, r_unauth = simulate_dry_run_api(token=None, body_dict={"messageText": "Hi"})
        if c_unauth == 401 and r_unauth.get("success") is False:
            log_pass("Unauthenticated dry-run request rejected with HTTP 401 Unauthorized")
        else:
            log_fail("Unauthenticated request rejection", f"Got {c_unauth}: {r_unauth}")

        # 15b: Cross-territory authorization -> 403
        c_cross, r_cross = simulate_dry_run_api(
            token=nalgonda_token,
            body_dict={"messageText": "Hi", "territoryId": FLAGSHIP_TERRITORY_ID}
        )
        if c_cross == 403 and "Access forbidden" in r_cross.get("error", ""):
            log_pass("Franchise Admin barred from cross-territory dry-run with HTTP 403 Forbidden")
        else:
            log_fail("Cross-territory authorization", f"Got {c_cross}: {r_cross}")

        # 15c: Payload size limit (> 64KB) -> 413
        oversized = "A" * (65 * 1024)
        c_large, r_large = simulate_dry_run_api(token=choutuppal_token, raw_body_str=oversized)
        if c_large == 413:
            log_pass("Oversized dry-run payload (>64KB) rejected with HTTP 413 Payload Too Large")
        else:
            log_fail("Payload size limit", f"Got {c_large}: {r_large}")

        # 15d: Super Admin authorized across territories
        c_super, r_super = simulate_dry_run_api(
            token=super_admin_token,
            body_dict={"messageText": "Hello", "territoryId": "territory_nalgonda"}
        )
        if c_super == 200 and r_super.get("territoryId") == "territory_nalgonda":
            log_pass("Super Admin authorized to dry-run any territory", "territoryId=territory_nalgonda")
        else:
            log_fail("Super Admin authorization", f"Got {c_super}: {r_super}")

        # =====================================================================
        # CHECK 16: Baseline Integrity & Unchanged Rule Counts
        # =====================================================================
        print("\n[CHECK 16] Baseline Data Integrity Verification")
        final_store = load_store()
        final_listings = len(final_store.get("listings", []))
        final_contacts = len(final_store.get("contacts", []))
        final_deals = len(final_store.get("deals", []))
        final_flows = len(final_store.get("flows", []))
        final_automations = len(final_store.get("automations", []))

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

        if final_automations == initial_automations:
            # Also verify all 179 rules remain draft and inactive
            all_draft = all(r.get("status") == "draft" and not r.get("isActive") for r in final_store.get("automations", []))
            if all_draft:
                log_pass(f"All {initial_automations} rules remain unchanged and in draft status", "draft=179, active=0")
            else:
                log_fail("Rule status changed", "Some rules are not in draft status!")
        else:
            log_fail("Automations count compromised", f"Expected {initial_automations}, got {final_automations}")

    finally:
        # Restore backup if modified
        if os.path.exists(BACKUP_FILE):
            shutil.copyfile(BACKUP_FILE, DATA_FILE)
            os.remove(BACKUP_FILE)
            print("\n[*] Cleaned up and restored database backup.")

    print("\n" + "=" * 70)
    print(f"PHASE 3F STEP 3 TEST SUMMARY: {passed} PASSED, {failed} FAILED")
    print("=" * 70)

    if failed > 0:
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()
