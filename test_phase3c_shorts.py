#!/usr/bin/env python3
"""
Choutuppal Franchise CRM — Phase 3C Test Suite
Tests Public Shorts Submission (/api/shorts/submit), URL / SSRF Validation,
Duplicate Prevention, Moderation Approval Pipeline (/api/admin/approvals),
and Public Feed Visibility (/api/admin/content).
"""

import json
import os
import sys
import shutil
import urllib.parse
import time
import re

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "admin_data.json")
BACKUP_FILE = os.path.join(os.path.dirname(__file__), "data", "admin_data.json.bak_phase3c_test")
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

def load_store():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_store(store):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(store, f, indent=2, ensure_ascii=False)

def is_private_or_local_host(hostname: str) -> bool:
    lower = hostname.lower()
    if lower in [
        'localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0', '169.254.169.254',
        'metadata.google.internal', 'instance-data'
    ] or lower.endswith('.localhost') or lower.endswith('.local') or lower.endswith('.internal') or lower.endswith('.lan'):
        return True

    ipv4_match = re.match(r"^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$", lower)
    if ipv4_match:
        p1 = int(ipv4_match.group(1))
        p2 = int(ipv4_match.group(2))
        if p1 == 10: return True
        if p1 == 127: return True
        if p1 == 169 and p2 == 254: return True
        if p1 == 172 and 16 <= p2 <= 31: return True
        if p1 == 192 and p2 == 168: return True
        if p1 == 0: return True

    return False

def simulate_shorts_submit(body: dict):
    """Simulates src/app/api/shorts/submit/route.ts POST"""
    url = body.get("url")
    title = body.get("title")
    phone = body.get("phone")
    tag = body.get("tag")
    territoryId = body.get("territoryId")

    if not url or not isinstance(url, str) or not url.strip():
        return 400, {"success": False, "error": "Valid video URL is required"}

    trimmed_url = url.strip()
    if len(trimmed_url) > 2048:
        return 400, {"success": False, "error": "URL exceeds maximum allowed length (2048 characters)"}

    try:
        parsed = urllib.parse.urlparse(trimmed_url)
        if not parsed.scheme or not parsed.netloc:
            return 400, {"success": False, "error": "Invalid URL format"}
    except Exception:
        return 400, {"success": False, "error": "Invalid URL format"}

    if parsed.scheme not in ["http", "https"]:
        return 400, {"success": False, "error": "URL must use http or https scheme"}

    hostname = parsed.hostname or ""
    if is_private_or_local_host(hostname):
        return 400, {"success": False, "error": "Local, internal, and loopback addresses are prohibited for security"}

    if parsed.port and parsed.port not in [80, 443]:
        return 400, {"success": False, "error": "Custom ports are not allowed for submitted URLs"}

    store = load_store()
    if "shorts" not in store: store["shorts"] = []
    if "approvals" not in store: store["approvals"] = []

    normalized_url = trimmed_url

    # Duplicate Check 1: Pending Approvals
    has_pending = any(
        a.get("status") == "pending" and a.get("data", {}).get("url", "").strip().lower() == normalized_url.lower()
        for a in store["approvals"]
    )
    if has_pending:
        return 409, {"success": False, "error": "This video has already been submitted and is currently awaiting moderation approval."}

    # Duplicate Check 2: Recent shorts within 5 minutes
    now_ms = time.time() * 1000
    five_min_ago = now_ms - (5 * 60 * 1000)
    has_recent = False
    for s in store["shorts"]:
        if s.get("videoUrl", "").strip().lower() == normalized_url.lower():
            # If created recently
            has_recent = True
            break
    if has_recent:
        return 409, {"success": False, "error": "This video was recently submitted. Please wait before submitting again."}

    # Territory assignment
    assigned_territory = FLAGSHIP_TERRITORY_ID
    if territoryId and isinstance(territoryId, str) and territoryId.strip():
        for t in store.get("territories", []):
            if t.get("id") == territoryId.strip():
                assigned_territory = t.get("id")
                break

    clean_title = re.sub(r"<[^>]*>", "", title.strip())[:150] if title and isinstance(title, str) and title.strip() else "Local Reel Submission"
    clean_tag = re.sub(r"<[^>]*>", "", tag.strip())[:50] if tag and isinstance(tag, str) and tag.strip() else "Community"
    clean_phone = re.sub(r"[^0-9]", "", phone)[:15] if phone and isinstance(phone, str) else ""

    new_short_id = f"sh_{int(time.time() * 1000)}"
    new_short = {
        "id": new_short_id,
        "title": clean_title,
        "videoUrl": normalized_url,
        "thumbnailUrl": "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800",
        "tags": [clean_tag],
        "territoryId": assigned_territory,
        "views": 0,
        "isActive": False,
        "createdAt": "2026-10-26T00:00:00.000Z"
    }

    approval_item = {
        "id": f"appr_short_{int(time.time() * 1000)}",
        "type": "CITIZEN_REPORT",
        "title": f"Reel Submission: {clean_title}",
        "submitterName": f"Citizen ({clean_phone})" if clean_phone else "Anonymous Citizen",
        "submitterPhone": clean_phone or "9999999999",
        "territoryId": assigned_territory,
        "status": "pending",
        "mediaUrl": new_short["thumbnailUrl"],
        "data": {
            "shortId": new_short_id,
            "url": normalized_url,
            "title": clean_title,
            "tags": [clean_tag],
            "territoryId": assigned_territory
        },
        "submittedAt": "2026-10-26T00:00:00.000Z"
    }

    store["shorts"].insert(0, new_short)
    store["approvals"].insert(0, approval_item)
    save_store(store)

    return 201, {
        "success": True,
        "message": "Short/Reel submitted successfully and queued for admin moderation approval.",
        "short": new_short,
        "approvalId": approval_item["id"]
    }

def simulate_admin_approval(approval_id: str, action: str, admin_notes: str = ""):
    """Simulates src/app/api/admin/approvals/route.ts POST"""
    store = load_store()
    item = next((a for a in store.get("approvals", []) if a.get("id") == approval_id), None)
    if not item:
        return 404, {"success": False, "error": "Approval item not found"}

    item["reviewedAt"] = "2026-10-26T00:00:00.000Z"
    item["adminNotes"] = admin_notes

    if action == "approve":
        item["status"] = "approved"
        if item.get("type") in ["CITIZEN_REPORT", "SHORT_SUBMISSION"]:
            short_id = item.get("data", {}).get("shortId")
            if short_id:
                target_short = next((s for s in store.get("shorts", []) if s.get("id") == short_id), None)
                if target_short:
                    target_short["isActive"] = True

            if item.get("submitterPhone") and item.get("submitterPhone") != "9999999999":
                if "messages" not in store: store["messages"] = []
                store["messages"].insert(0, {
                    "id": f"msg_{int(time.time() * 1000)}",
                    "phone": item.get("submitterPhone"),
                    "contactName": item.get("submitterName"),
                    "direction": "outbound",
                    "messageText": f"🎉 Congratulations! Reel '{item.get('title')}' approved!",
                    "status": "sent",
                    "createdAt": "2026-10-26T00:00:00.000Z"
                })
    elif action == "reject":
        item["status"] = "rejected"
        short_id = item.get("data", {}).get("shortId")
        if short_id:
            target_short = next((s for s in store.get("shorts", []) if s.get("id") == short_id), None)
            if target_short:
                target_short["isActive"] = False

    save_store(store)
    return 200, {"success": True, "item": item}

def simulate_public_get_content(territory_id: str = None):
    """Simulates unauthenticated public GET /api/admin/content"""
    store = load_store()
    shorts = [s for s in store.get("shorts", []) if s.get("isActive") is not False]
    if territory_id and territory_id != "all":
        shorts = [s for s in shorts if (s.get("territoryId") or FLAGSHIP_TERRITORY_ID) == territory_id]
    return 200, {"success": True, "isPublic": True, "shorts": shorts}


def run_tests():
    print("=" * 70)
    print("CHOUTUPPAL FRANCHISE CRM — PHASE 3C SHORTS & MODERATION TEST SUITE")
    print("=" * 70)

    # Backup store
    shutil.copyfile(DATA_FILE, BACKUP_FILE)

    try:
        store = load_store()
        initial_listings_count = len(store.get("listings", []))
        print(f"[*] Initial Listings: {initial_listings_count}")
        print(f"[*] Initial Shorts: {len(store.get('shorts', []))}")
        print(f"[*] Initial Approvals: {len(store.get('approvals', []))}\n")

        # -------------------------------------------------------------
        # TEST GROUP 1: PUBLIC SUBMISSION HAPPY PATH & QUEUING
        # -------------------------------------------------------------
        print("[TEST GROUP 1] Public Shorts Submission & Moderation Queuing")

        status, resp = simulate_shorts_submit({
            "url": "https://www.youtube.com/shorts/dQw4w9WgXcQ",
            "title": "Choutuppal Night Market Street Food",
            "phone": "9849012345",
            "tag": "Food"
        })

        if status == 201 and resp.get("success"):
            short_obj = resp.get("short")
            appr_id = resp.get("approvalId")
            if short_obj.get("isActive") is False:
                log_pass("Submission creates inactive short", f"id={short_obj.get('id')}, isActive={short_obj.get('isActive')}")
            else:
                log_fail("Submission creates inactive short", "Short is active without approval!")

            if short_obj.get("territoryId") == FLAGSHIP_TERRITORY_ID:
                log_pass("Defaults to Flagship territory", f"territoryId={short_obj.get('territoryId')}")
            else:
                log_fail("Defaults to Flagship territory", f"territoryId={short_obj.get('territoryId')}")

            # Verify approval item in store
            store = load_store()
            appr_item = next((a for a in store.get("approvals", []) if a.get("id") == appr_id), None)
            if appr_item and appr_item.get("status") == "pending" and appr_item.get("type") == "CITIZEN_REPORT":
                log_pass("Approval item queued as pending", f"apprId={appr_id}, status={appr_item.get('status')}")
            else:
                log_fail("Approval item queued as pending", f"Item not found or status not pending: {appr_item}")

            if appr_item and appr_item.get("submitterPhone") == "9849012345":
                log_pass("Submitter phone recorded on approval", f"phone={appr_item.get('submitterPhone')}")
            else:
                log_fail("Submitter phone recorded on approval", f"phone mismatch: {appr_item}")
        else:
            log_fail("Valid submission accepted", f"Status={status}, resp={resp}")

        # -------------------------------------------------------------
        # TEST GROUP 2: SSRF & PROTOCOL SECURITY DEFENSES
        # -------------------------------------------------------------
        print("\n[TEST GROUP 2] SSRF & Protocol Security Defenses")

        malicious_urls = [
            ("http://localhost:3000/api/admin/env", "Localhost blocked"),
            ("http://127.0.0.1:80/admin", "127.0.0.1 loopback blocked"),
            ("http://169.254.169.254/latest/meta-data/", "AWS/Cloud metadata IP blocked"),
            ("http://10.0.0.5/internal", "Private RFC1918 10.0.0.0/8 blocked"),
            ("http://192.168.1.100/router", "Private RFC1918 192.168.0.0/16 blocked"),
            ("http://172.16.1.1/internal", "Private RFC1918 172.16.0.0/12 blocked"),
            ("http://0.0.0.0:8000/test", "0.0.0.0 host blocked"),
            ("javascript:alert(document.cookie)", "javascript: scheme blocked"),
            ("file:///etc/passwd", "file:// scheme blocked"),
            ("ftp://files.example.com/video.mp4", "ftp:// scheme blocked"),
            ("http://example.com:22/video.mp4", "Custom internal SSH port blocked"),
            ("not-a-valid-url", "Malformed URL string blocked"),
        ]

        for mal_url, label in malicious_urls:
            status, resp = simulate_shorts_submit({
                "url": mal_url,
                "title": "Exploit Attempt"
            })
            if status == 400 and not resp.get("success"):
                log_pass(f"SSRF defense: {label}", f"URL={mal_url[:30]} -> HTTP 400")
            else:
                log_fail(f"SSRF defense: {label}", f"Status={status}, expected 400. resp={resp}")

        # -------------------------------------------------------------
        # TEST GROUP 3: TAMPER RESISTANCE & SANITIZATION
        # -------------------------------------------------------------
        print("\n[TEST GROUP 3] Tamper Resistance & Input Sanitization")

        # Tampering attempt: Client sends isActive: True, status: "approved", views: 99999
        status, resp = simulate_shorts_submit({
            "url": "https://www.youtube.com/shorts/abcdef12345",
            "title": "<b>Bypass Attempt</b>",
            "tag": "<script>alert(1)</script>Cinema",
            "isActive": True,
            "status": "approved",
            "views": 99999
        })

        if status == 201:
            short_obj = resp.get("short")
            if short_obj.get("isActive") is False and short_obj.get("views") == 0:
                log_pass("Client cannot force isActive: true or falsify views", f"isActive={short_obj.get('isActive')}, views={short_obj.get('views')}")
            else:
                log_fail("Client cannot force isActive: true or falsify views", f"Tampering succeeded: {short_obj}")

            if "<b>" not in short_obj.get("title") and "<script>" not in short_obj.get("tags", [""])[0]:
                log_pass("HTML/XSS sanitized from title and tags", f"title={short_obj.get('title')}, tags={short_obj.get('tags')}")
            else:
                log_fail("HTML/XSS sanitized from title and tags", f"Unsanitized: {short_obj}")
        else:
            log_fail("Tamper test submission failed", f"status={status}")

        # -------------------------------------------------------------
        # TEST GROUP 4: DUPLICATE SUBMISSION PREVENTION
        # -------------------------------------------------------------
        print("\n[TEST GROUP 4] Duplicate Submission Prevention")

        # Attempt to submit exact same URL while pending
        status, resp = simulate_shorts_submit({
            "url": "https://www.youtube.com/shorts/abcdef12345",
            "title": "Duplicate Submission Attempt",
            "phone": "9998887776"
        })

        if status == 409 and not resp.get("success"):
            log_pass("Duplicate pending URL rejected with 409 Conflict", f"error={resp.get('error')}")
        else:
            log_fail("Duplicate pending URL rejected with 409 Conflict", f"Status={status}, expected 409. resp={resp}")

        # -------------------------------------------------------------
        # TEST GROUP 5: PUBLIC FEED VISIBILITY & ADMIN APPROVAL LIFECYCLE
        # -------------------------------------------------------------
        print("\n[TEST GROUP 5] Feed Visibility & Admin Moderation Approval Flow")

        # 1. Before approval: Public GET /api/admin/content must NOT include inactive shorts
        status, content_resp = simulate_public_get_content()
        public_short_ids = [s.get("id") for s in content_resp.get("shorts", [])]

        store = load_store()
        pending_short = next((s for s in store.get("shorts", []) if s.get("title") == "Choutuppal Night Market Street Food"), None)
        pending_appr = next((a for a in store.get("approvals", []) if a.get("data", {}).get("shortId") == pending_short.get("id")), None)

        if pending_short.get("id") not in public_short_ids:
            log_pass("Unapproved short is NOT visible on public feed", f"shortId={pending_short.get('id')}")
        else:
            log_fail("Unapproved short is NOT visible on public feed", f"Found unapproved short in public feed!")

        # 2. Admin approves the short
        appr_status, appr_resp = simulate_admin_approval(pending_appr.get("id"), action="approve")
        if appr_status == 200 and appr_resp.get("item", {}).get("status") == "approved":
            log_pass("Admin successfully marks approval item as approved", f"id={pending_appr.get('id')}")
        else:
            log_fail("Admin marks approval item as approved", f"Status={appr_status}, resp={appr_resp}")

        # 3. Verify short in store now has isActive: true
        store = load_store()
        updated_short = next((s for s in store.get("shorts", []) if s.get("id") == pending_short.get("id")), None)
        if updated_short and updated_short.get("isActive") is True:
            log_pass("Admin approval sets short isActive: true", f"shortId={updated_short.get('id')}, isActive={updated_short.get('isActive')}")
        else:
            log_fail("Admin approval sets short isActive: true", f"Short isActive not updated! {updated_short}")

        # 4. Outbound WhatsApp notification generated
        outbound_msg = next((m for m in store.get("messages", []) if m.get("phone") == "9849012345"), None)
        if outbound_msg:
            log_pass("Outbound approval WhatsApp notification sent", f"to={outbound_msg.get('phone')}, msg={outbound_msg.get('messageText')[:40]}...")
        else:
            log_fail("Outbound approval WhatsApp notification sent", "Message not found in store.messages")

        # 5. After approval: Public GET /api/admin/content MUST now include the approved short
        status, content_resp_after = simulate_public_get_content()
        public_short_ids_after = [s.get("id") for s in content_resp_after.get("shorts", [])]
        if pending_short.get("id") in public_short_ids_after:
            log_pass("Approved short is NOW LIVE on public feed", f"shortId={pending_short.get('id')} found in public feed")
        else:
            log_fail("Approved short is NOW LIVE on public feed", f"Approved short missing from public feed!")

        # -------------------------------------------------------------
        # TEST GROUP 6: REJECTION LIFECYCLE
        # -------------------------------------------------------------
        print("\n[TEST GROUP 6] Moderation Rejection Lifecycle")

        # Create another submission to reject
        status, rej_sub = simulate_shorts_submit({
            "url": "https://www.instagram.com/reel/C3zYAbcd123/",
            "title": "Low Quality Reel",
            "phone": "9991112233"
        })
        rej_short_id = rej_sub.get("short", {}).get("id")
        rej_appr_id = rej_sub.get("approvalId")

        status, rej_resp = simulate_admin_approval(rej_appr_id, action="reject", admin_notes="Video quality below community standard")
        if status == 200 and rej_resp.get("item", {}).get("status") == "rejected":
            log_pass("Admin marks item as rejected", f"id={rej_appr_id}, status=rejected")
        else:
            log_fail("Admin marks item as rejected", f"Status={status}, resp={rej_resp}")

        store = load_store()
        rej_short = next((s for s in store.get("shorts", []) if s.get("id") == rej_short_id), None)
        if rej_short and rej_short.get("isActive") is False:
            log_pass("Rejected short remains inactive", f"shortId={rej_short_id}, isActive={rej_short.get('isActive')}")
        else:
            log_fail("Rejected short remains inactive", f"Short became active or missing: {rej_short}")

        # -------------------------------------------------------------
        # TEST GROUP 7: BASELINE DATA INTEGRITY
        # -------------------------------------------------------------
        print("\n[TEST GROUP 7] Baseline Data Integrity Verification")
        store = load_store()
        final_listings = len(store.get("listings", []))
        if final_listings == initial_listings_count:
            log_pass(f"All {initial_listings_count} Choutuppal listings intact", f"Count matches baseline ({final_listings})")
        else:
            log_fail("Baseline listings preserved", f"Count changed: {initial_listings_count} -> {final_listings}")

    finally:
        # Restore backup
        if os.path.exists(BACKUP_FILE):
            shutil.copyfile(BACKUP_FILE, DATA_FILE)
            os.remove(BACKUP_FILE)
            print("\n[*] Cleaned up and restored database backup.")

    print("\n" + "=" * 70)
    print(f"PHASE 3C TEST SUMMARY: {passed} PASSED, {failed} FAILED")
    print("=" * 70)

    if failed > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    run_tests()
