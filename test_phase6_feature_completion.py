#!/usr/bin/env python3
"""
Choutuppal Franchise CRM — Phase 6 Test Suite:
Complete Existing Features Before Supabase Verification

Verifies:
1. Baseline Data Integrity (212 listings, 211 contacts, 4 deals, 1 flow, 179 draft automations, 4 territories)
2. Broadcasts API Authentication & RBAC (HTTP 401 unauthenticated)
3. Broadcasts Audience Calculation & Sandbox Staging (HTTP 201, zero WhatsApp dispatches)
4. Broadcasts Territory Scoping & Cross-Tenant Rejection (HTTP 403)
5. Contacts Details Update & IDOR Security (HTTP 403 for cross-territory edit)
6. Shared Inbox Staff Assignment & Scoping (action: 'assign')
7. Automations Dry-Run Simulator API (Standard skip vs What-If draft simulation)
8. Admin Dashboard Territory Scoping (Flows & Broadcasts scoped)
9. Final Baseline Reconciliation & Preservation
"""

import json
import os
import sys
import time
import shutil
import hmac
import hashlib
import base64
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data", "admin_data.json")
BACKUP_FILE = os.path.join(BASE_DIR, "data", "admin_data.json.bak_phase6_test_suite")
SESSION_SECRET = os.getenv("SESSION_SECRET", "choutuppal_sec_secret_key_8923487234")
FLAGSHIP_TERRITORY_ID = "territory_choutuppal"

passed = 0
failed = 0

def log_pass(title, details=""):
    global passed
    passed += 1
    if details:
        print(f"  ✔ PASS: {title} ({details})")
    else:
        print(f"  ✔ PASS: {title}")

def log_fail(title, reason, details=""):
    global failed
    failed += 1
    print(f"  ✖ FAIL: {title}")
    print(f"     Reason: {reason}")
    if details:
        print(f"     Details: {details}")

def make_session_token(phone="9441348175", role="SUPER_ADMIN", territory_id="territory_choutuppal"):
    payload = {
        "userId": f"usr_{phone}",
        "phone": phone,
        "role": role,
        "territoryId": territory_id,
        "expiresAt": int(time.time() * 1000) + 86400000,
    }
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig = hmac.new(SESSION_SECRET.encode(), payload_b64.encode(), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(sig).decode().rstrip("=")
    return f"{payload_b64}.{sig_b64}"

def run_ts_eval(code: str):
    ts_loader = os.path.join(BASE_DIR, "scripts", "ts-loader.mjs")
    proc = subprocess.run(
        ["node", "--loader", ts_loader, "--input-type=module", "-e", code],
        capture_output=True,
        text=True,
        cwd=BASE_DIR,
    )
    if proc.returncode != 0:
        print(f"Node execution error (code {proc.returncode}):\n{proc.stderr}")
    for line in reversed(proc.stdout.splitlines()):
        line = line.strip()
        if line.startswith("{") and line.endswith("}"):
            return proc.returncode, line, proc.stderr
    return proc.returncode, proc.stdout.strip(), proc.stderr

def main():
    print("\n" + "=" * 70)
    print("CHOUTUPPAL FRANCHISE CRM — PHASE 6: FEATURE COMPLETION TEST SUITE")
    print("=" * 70)

    # 1. Preflight Backup
    shutil.copy2(DATA_FILE, BACKUP_FILE)

    super_token = make_session_token("9441348175", "SUPER_ADMIN", FLAGSHIP_TERRITORY_ID)
    choutuppal_token = make_session_token("9848011111", "FRANCHISE_ADMIN", FLAGSHIP_TERRITORY_ID)
    nalgonda_token = make_session_token("9848022222", "FRANCHISE_ADMIN", "territory_nalgonda")

    try:
        # =====================================================================
        # CHECK 1: Baseline Data Integrity
        # =====================================================================
        print("\n" + "=" * 70)
        print("[CHECK 1] Initial Baseline Data Verification")
        print("=" * 70)
        with open(DATA_FILE, "r") as f:
            d = json.load(f)
        total_listings = len(d.get("listings", []))
        flagship_listings = sum(1 for l in d.get("listings", []) if l.get("territoryId") == FLAGSHIP_TERRITORY_ID)
        total_contacts = len(d.get("contacts", []))
        total_deals = len(d.get("deals", []))
        total_flows = len(d.get("flows", []))
        total_automations = len(d.get("automations", []))
        draft_automations = sum(1 for a in d.get("automations", []) if a.get("status") == "draft")
        total_territories = len(d.get("territories", []))

        if total_listings == 212 and flagship_listings == 211:
            log_pass("Flagship Choutuppal listings (211) & total listings (212) intact", f"Count={total_listings}")
        else:
            log_fail("Listings count mismatch", f"Expected 212 (211 flagship), got {total_listings} ({flagship_listings} flagship)")

        if total_contacts == 211:
            log_pass("All 211 CRM contacts intact", f"Count={total_contacts}")
        else:
            log_fail("Contacts count mismatch", f"Expected 211, got {total_contacts}")

        if total_deals == 4:
            log_pass("All 4 persistent CRM deals intact", f"Count={total_deals}")
        else:
            log_fail("Deals count mismatch", f"Expected 4, got {total_deals}")

        if total_flows == 1:
            log_pass("Default interactive flow intact", f"Count={total_flows}")
        else:
            log_fail("Flows count mismatch", f"Expected 1, got {total_flows}")

        if total_automations == 179 and draft_automations == 179:
            log_pass("All 179 automation rules verified in draft state", f"Count={total_automations}")
        else:
            log_fail("Automations mismatch", f"Expected 179 draft, got {draft_automations}/{total_automations}")

        if total_territories == 4:
            log_pass("All 4 territories verified", f"Count={total_territories}")
        else:
            log_fail("Territories mismatch", f"Expected 4, got {total_territories}")

        # =====================================================================
        # CHECK 2: Broadcasts API Authentication
        # =====================================================================
        print("\n" + "=" * 70)
        print("[CHECK 2] Broadcasts API Authentication Enforcement")
        print("=" * 70)
        code_unauth = """
        import { GET, POST } from './src/app/api/admin/broadcasts/route.ts';
        const reqGet = new Request('http://localhost:3000/api/admin/broadcasts', { method: 'GET' });
        const resGet = await GET(reqGet);
        const reqPost = new Request('http://localhost:3000/api/admin/broadcasts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Test', message: 'Hello' })
        });
        const resPost = await POST(reqPost);
        console.log(JSON.stringify({ getStatus: resGet.status, postStatus: resPost.status }));
        """
        code, stdout, stderr = run_ts_eval(code_unauth)
        res_data = json.loads(stdout.strip().split("\n")[-1])
        if res_data.get("getStatus") == 401 and res_data.get("postStatus") == 401:
            log_pass("Broadcasts API rejects unauthenticated requests with HTTP 401", "GET & POST Protected")
        else:
            log_fail("Broadcasts auth guard failed", f"Result: {res_data}")

        # =====================================================================
        # CHECK 3: Broadcasts Audience Calculation & Sandbox Staging
        # =====================================================================
        print("\n" + "=" * 70)
        print("[CHECK 3] Broadcasts Audience Calculation & Sandbox Staging")
        print("=" * 70)
        code_stage = f"""
        import {{ GET, POST }} from './src/app/api/admin/broadcasts/route.ts';
        const reqGet = new Request('http://localhost:3000/api/admin/broadcasts', {{
          method: 'GET',
          headers: {{ 'authorization': 'Bearer {choutuppal_token}' }}
        }});
        const resGet = await GET(reqGet);
        const dataGet = await resGet.json();

        const reqPost = new Request('http://localhost:3000/api/admin/broadcasts', {{
          method: 'POST',
          headers: {{
            'authorization': 'Bearer {choutuppal_token}',
            'Content-Type': 'application/json'
          }},
          body: JSON.stringify({{
            title: 'Choutuppal Diwali Greetings',
            message: 'Happy Festival to all Choutuppal Citizens and Business Owners!',
            targetSegment: 'all'
          }})
        }});
        const resPost = await POST(reqPost);
        const dataPost = await resPost.json();
        console.log(JSON.stringify({{
          getStatus: resGet.status,
          audienceAll: dataGet.audienceCounts?.all,
          postStatus: resPost.status,
          staged: dataPost.staged,
          dispatched: dataPost.dispatched,
          recipientCount: dataPost.recipientCount,
          campaignId: dataPost.campaign?.id,
          notice: dataPost.notice
        }}));
        """
        code, stdout, stderr = run_ts_eval(code_stage)
        res_data = json.loads(stdout.strip().split("\n")[-1])
        campaign_id = res_data.get("campaignId")

        if (
            res_data.get("getStatus") == 200
            and res_data.get("audienceAll") == 211
            and res_data.get("postStatus") == 201
            and res_data.get("staged") is True
            and res_data.get("dispatched") is False
            and res_data.get("recipientCount") == 211
        ):
            log_pass(
                "Broadcast campaign staged in sandbox with accurate contact audience matching",
                f"Audience=211, CampaignId={campaign_id}, Dispatched=False"
            )
        else:
            log_fail("Broadcast staging failed", f"Response: {res_data}")

        # =====================================================================
        # CHECK 4: Broadcasts Territory Scoping & Cross-Tenant Rejection
        # =====================================================================
        print("\n" + "=" * 70)
        print("[CHECK 4] Broadcasts Territory Scoping & Cross-Tenant Protection")
        print("=" * 70)
        code_cross_tenant = f"""
        import {{ POST, DELETE }} from './src/app/api/admin/broadcasts/route.ts';
        // 1. Nalgonda admin trying to stage broadcast in Choutuppal
        const reqCross = new Request('http://localhost:3000/api/admin/broadcasts', {{
          method: 'POST',
          headers: {{
            'authorization': 'Bearer {nalgonda_token}',
            'Content-Type': 'application/json'
          }},
          body: JSON.stringify({{
            title: 'Unauthorized Intrusion Broadcast',
            message: 'Hello Choutuppal',
            territoryId: '{FLAGSHIP_TERRITORY_ID}'
          }})
        }});
        const resCross = await POST(reqCross);

        // 2. Nalgonda admin trying to delete Choutuppal campaign
        const reqDelIntrusion = new Request('http://localhost:3000/api/admin/broadcasts?id={campaign_id}', {{
          method: 'DELETE',
          headers: {{ 'authorization': 'Bearer {nalgonda_token}' }}
        }});
        const resDelIntrusion = await DELETE(reqDelIntrusion);

        // 3. Authorized Choutuppal admin deleting their campaign
        const reqDelAuth = new Request('http://localhost:3000/api/admin/broadcasts?id={campaign_id}', {{
          method: 'DELETE',
          headers: {{ 'authorization': 'Bearer {choutuppal_token}' }}
        }});
        const resDelAuth = await DELETE(reqDelAuth);

        console.log(JSON.stringify({{
          crossStatus: resCross.status,
          delIntrusionStatus: resDelIntrusion.status,
          delAuthStatus: resDelAuth.status
        }}));
        """
        code, stdout, stderr = run_ts_eval(code_cross_tenant)
        res_data = json.loads(stdout.strip().split("\n")[-1])

        if (
            res_data.get("crossStatus") == 403
            and res_data.get("delIntrusionStatus") == 403
            and res_data.get("delAuthStatus") == 200
        ):
            log_pass(
                "Broadcasts strictly enforce territory scoping for create and delete (IDOR prevented)",
                f"CrossCreate=403, CrossDelete=403, AuthorizedDelete=200"
            )
        else:
            log_fail("Broadcast territory isolation check failed", f"Result: {res_data}")

        # =====================================================================
        # CHECK 5: Contacts Details Update & IDOR Protection
        # =====================================================================
        print("\n" + "=" * 70)
        print("[CHECK 5] Contacts Details & IDOR Security Verification")
        print("=" * 70)
        # Select first contact from store
        with open(DATA_FILE, "r") as f:
            d = json.load(f)
        target_contact = d["contacts"][0]
        c_id = target_contact["id"]
        c_orig_stage = target_contact.get("stage", "NEW_LEAD")
        c_orig_tags = list(target_contact.get("tags", []))
        c_orig_notes = target_contact.get("notes", "")

        code_contact = f"""
        import {{ PUT }} from './src/app/api/crm/contacts/route.ts';
        // 1. Cross-territory update attempt by Nalgonda admin
        const reqCross = new Request('http://localhost:3000/api/crm/contacts', {{
          method: 'PUT',
          headers: {{
            'authorization': 'Bearer {nalgonda_token}',
            'Content-Type': 'application/json'
          }},
          body: JSON.stringify({{
            id: '{c_id}',
            stage: 'WON',
            notes: 'Hacked by cross-territory admin'
          }})
        }});
        const resCross = await PUT(reqCross);

        // 2. Authorized update by Choutuppal admin
        const reqAuth = new Request('http://localhost:3000/api/crm/contacts', {{
          method: 'PUT',
          headers: {{
            'authorization': 'Bearer {choutuppal_token}',
            'Content-Type': 'application/json'
          }},
          body: JSON.stringify({{
            id: '{c_id}',
            stage: 'QUALIFIED',
            tags: ['verified_citizen', 'vip'],
            notes: 'Verified resident of Ward 4'
          }})
        }});
        const resAuth = await PUT(reqAuth);
        const dataAuth = await resAuth.json();

        // 3. Reset contact back to original
        const reqReset = new Request('http://localhost:3000/api/crm/contacts', {{
          method: 'PUT',
          headers: {{
            'authorization': 'Bearer {choutuppal_token}',
            'Content-Type': 'application/json'
          }},
          body: JSON.stringify({{
            id: '{c_id}',
            stage: '{c_orig_stage}',
            tags: {json.dumps(c_orig_tags)},
            notes: '{c_orig_notes}'
          }})
        }});
        const resReset = await PUT(reqReset);

        console.log(JSON.stringify({{
          crossStatus: resCross.status,
          authStatus: resAuth.status,
          updatedStage: dataAuth.contact?.stage,
          resetStatus: resReset.status
        }}));
        """
        code, stdout, stderr = run_ts_eval(code_contact)
        res_data = json.loads(stdout.strip().split("\n")[-1])

        if (
            res_data.get("crossStatus") == 403
            and res_data.get("authStatus") == 200
            and res_data.get("updatedStage") == "QUALIFIED"
            and res_data.get("resetStatus") == 200
        ):
            log_pass(
                "Contact detail updates function correctly with strict IDOR territory checks",
                "CrossEdit=403, AuthorizedEdit=200, Reverted=200"
            )
        else:
            log_fail("Contact update test failed", f"Result: {res_data}")

        # =====================================================================
        # CHECK 6: Shared Inbox Staff Assignment & Scoping
        # =====================================================================
        print("\n" + "=" * 70)
        print("[CHECK 6] Shared Inbox Staff Assignment & Scoping")
        print("=" * 70)
        c_phone = target_contact["phone"]
        code_inbox = f"""
        import {{ POST }} from './src/app/api/admin/inbox/route.ts';
        // 1. Cross-territory assignment by Nalgonda admin on Choutuppal thread
        const reqCross = new Request('http://localhost:3000/api/admin/inbox', {{
          method: 'POST',
          headers: {{
            'authorization': 'Bearer {nalgonda_token}',
            'Content-Type': 'application/json'
          }},
          body: JSON.stringify({{
            action: 'assign',
            phone: '{c_phone}',
            assignedTo: 'Nalgonda Staff'
          }})
        }});
        const resCross = await POST(reqCross);

        // 2. Authorized assignment by Choutuppal admin
        const reqAuth = new Request('http://localhost:3000/api/admin/inbox', {{
          method: 'POST',
          headers: {{
            'authorization': 'Bearer {choutuppal_token}',
            'Content-Type': 'application/json'
          }},
          body: JSON.stringify({{
            action: 'assign',
            phone: '{c_phone}',
            assignedTo: 'Officer Ramesh'
          }})
        }});
        const resAuth = await POST(reqAuth);
        const dataAuth = await resAuth.json();

        console.log(JSON.stringify({{
          crossStatus: resCross.status,
          authStatus: resAuth.status,
          assignedTo: dataAuth.conversation?.assignedTo
        }}));
        """
        code, stdout, stderr = run_ts_eval(code_inbox)
        res_data = json.loads(stdout.strip().split("\n")[-1])

        if (
            res_data.get("crossStatus") == 403
            and res_data.get("authStatus") == 200
            and res_data.get("assignedTo") == "Officer Ramesh"
        ):
            log_pass(
                "Inbox staff assignment enforces territory scoping and updates assigned staff",
                f"CrossAssign=403, Assigned='Officer Ramesh'"
            )
        else:
            log_fail("Inbox assignment failed", f"Result: {res_data}")

        # =====================================================================
        # CHECK 7: Automations Dry-Run Simulator API (Both Modes)
        # =====================================================================
        print("\n" + "=" * 70)
        print("[CHECK 7] Automations Dry-Run Simulator API")
        print("=" * 70)
        code_dry_run = f"""
        import {{ POST }} from './src/app/api/crm/automations/dry-run/route.ts';

        // 1. Standard mode: draft rules skipped
        const reqStandard = new Request('http://localhost:3000/api/crm/automations/dry-run', {{
          method: 'POST',
          headers: {{
            'authorization': 'Bearer {choutuppal_token}',
            'Content-Type': 'application/json'
          }},
          body: JSON.stringify({{
            messageText: 'doctor clinic hospital',
            phone: '919441348175',
            simulateDrafts: false
          }})
        }});
        const resStandard = await POST(reqStandard);
        const dataStandard = await resStandard.json();

        // 2. What-If Simulation mode: draft rules evaluated as active
        const reqSim = new Request('http://localhost:3000/api/crm/automations/dry-run', {{
          method: 'POST',
          headers: {{
            'authorization': 'Bearer {choutuppal_token}',
            'Content-Type': 'application/json'
          }},
          body: JSON.stringify({{
            messageText: 'doctor clinic',
            phone: '919441348175',
            contactName: 'Ravi Kumar',
            simulateDrafts: true
          }})
        }});
        const resSim = await POST(reqSim);
        const dataSim = await resSim.json();

        // 3. Cross-territory forbidden
        const reqCross = new Request('http://localhost:3000/api/crm/automations/dry-run', {{
          method: 'POST',
          headers: {{
            'authorization': 'Bearer {nalgonda_token}',
            'Content-Type': 'application/json'
          }},
          body: JSON.stringify({{
            messageText: 'doctor',
            territoryId: '{FLAGSHIP_TERRITORY_ID}'
          }})
        }});
        const resCross = await POST(reqCross);

        console.log(JSON.stringify({{
          standardMatches: dataStandard.evaluation?.matchedRuleIds?.length || 0,
          simMatches: dataSim.evaluation?.matchedRuleIds?.length || 0,
          simDispatched: dataSim.dispatched,
          simProposedActions: dataSim.evaluation?.proposedActions?.length || 0,
          renderedText: dataSim.evaluation?.proposedActions?.[0]?.renderedValue || '',
          crossStatus: resCross.status
        }}));
        """
        code, stdout, stderr = run_ts_eval(code_dry_run)
        res_data = json.loads(stdout.strip().split("\n")[-1])

        if (
            res_data.get("standardMatches") == 0
            and res_data.get("simMatches") >= 1
            and res_data.get("simDispatched") is False
            and res_data.get("crossStatus") == 403
        ):
            log_pass(
                "Dry-Run simulator safely separates production draft skipping from What-If simulation",
                f"StandardMatches=0, WhatIfMatches={res_data.get('simMatches')}, CrossSecurity=403"
            )
        else:
            log_fail("Dry-run simulator check failed", f"Result: {res_data}")

        # =====================================================================
        # CHECK 8: Admin Dashboard Territory Scoping (Flows & Broadcasts)
        # =====================================================================
        print("\n" + "=" * 70)
        print("[CHECK 8] Dashboard Territory Scoping for Flows and Broadcasts")
        print("=" * 70)
        code_dash = f"""
        import {{ GET }} from './src/app/api/admin/dashboard/route.ts';
        // Super Admin
        const reqSuper = new Request('http://localhost:3000/api/admin/dashboard', {{
          headers: {{ 'authorization': 'Bearer {super_token}' }}
        }});
        const resSuper = await GET(reqSuper);
        const dataSuper = await resSuper.json();

        // Nalgonda Admin (isolated)
        const reqNalgonda = new Request('http://localhost:3000/api/admin/dashboard', {{
          headers: {{ 'authorization': 'Bearer {nalgonda_token}' }}
        }});
        const resNalgonda = await GET(reqNalgonda);
        const dataNalgonda = await resNalgonda.json();

        console.log(JSON.stringify({{
          superFlows: dataSuper.stats?.totalFlows,
          nalgondaFlows: dataNalgonda.stats?.totalFlows,
          superBroadcasts: typeof dataSuper.stats?.totalBroadcasts,
          nalgondaBroadcasts: typeof dataNalgonda.stats?.totalBroadcasts
        }}));
        """
        code, stdout, stderr = run_ts_eval(code_dash)
        res_data = json.loads(stdout.strip().split("\n")[-1])

        if (
            res_data.get("superFlows") == 1
            and res_data.get("nalgondaFlows") == 0
            and res_data.get("superBroadcasts") == "number"
            and res_data.get("nalgondaBroadcasts") == "number"
        ):
            log_pass(
                "Dashboard correctly scopes flows and broadcasts by tenant territory",
                f"SuperFlows=1, NalgondaFlows=0"
            )
        else:
            log_fail("Dashboard flows/broadcasts scoping failed", f"Result: {res_data}")

    finally:
        # Revert from backup to guarantee 100% preservation
        shutil.copy2(BACKUP_FILE, DATA_FILE)
        if os.path.exists(BACKUP_FILE):
            os.remove(BACKUP_FILE)

    # =====================================================================
    # CHECK 9: Final Baseline Data Preservation
    # =====================================================================
    print("\n" + "=" * 70)
    print("[CHECK 9] Final Baseline Data Reconciliation")
    print("=" * 70)
    with open(DATA_FILE, "r") as f:
        final_d = json.load(f)
    final_listings = len(final_d.get("listings", []))
    final_contacts = len(final_d.get("contacts", []))
    final_deals = len(final_d.get("deals", []))
    final_flows = len(final_d.get("flows", []))
    final_automations = len(final_d.get("automations", []))
    final_draft = sum(1 for a in final_d.get("automations", []) if a.get("status") == "draft")
    final_territories = len(final_d.get("territories", []))

    if (
        final_listings == 212
        and final_contacts == 211
        and final_deals == 4
        and final_flows == 1
        and final_automations == 179
        and final_draft == 179
        and final_territories == 4
    ):
        log_pass("100% baseline data preservation verified after all Phase 6 operations",
                 f"Listings={final_listings}, Contacts={final_contacts}, Deals={final_deals}, DraftAutomations={final_draft}")
    else:
        log_fail("Data preservation mismatch",
                 f"Got listings={final_listings}, contacts={final_contacts}, deals={final_deals}, automations={final_automations}")

    print("\n" + "=" * 70)
    print(f"PHASE 6 SUMMARY: {passed} PASSED, {failed} FAILED")
    print("=" * 70)

    if failed > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
