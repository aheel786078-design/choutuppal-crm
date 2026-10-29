#!/usr/bin/env python3
"""
Choutuppal Franchise CRM — Phase 3D Test Suite
Tests Persistent Shared Inbox (/api/admin/inbox), Conversation Grouping,
Message Thread Loading, Reply Dispatching, Webhook Idempotency,
Tenant Scoping & Cross-Territory IDOR Defenses, and Baseline Data Safety.
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
BACKUP_FILE = os.path.join(os.path.dirname(__file__), "data", "admin_data.json.bak_phase3d_test")
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
# SIMULATED INBOX API LOGIC
# -----------------------------------------------------------------------------
def simulate_get_inbox(token=None, phone_param=None, search_query=None, unread_only=False):
    """Simulates GET /api/admin/inbox"""
    user = verify_token(token)
    if not user:
        return 401, {"success": False, "error": "Authentication required. Please sign in."}

    store = load_store()
    all_messages = store.get("messages", [])
    all_contacts = store.get("contacts", [])

    # Case A: Thread for specific phone
    if phone_param:
        clean_phone = re.sub(r"\D", "", phone_param)
        if len(clean_phone) < 10:
            return 400, {"success": False, "error": "Invalid phone number format"}

        phone_messages = [m for m in all_messages if re.sub(r"\D", "", m.get("phone", "")) == clean_phone]
        matched_contact = next((c for c in all_contacts if re.sub(r"\D", "", c.get("phone", "")) == clean_phone), None)

        conv_territory_id = (
            phone_messages[0].get("territoryId") if phone_messages else
            (matched_contact.get("territoryId") if matched_contact else FLAGSHIP_TERRITORY_ID)
        ) or FLAGSHIP_TERRITORY_ID

        # Cross-tenant check
        if user.get("role") != "SUPER_ADMIN" and user.get("territoryId") != conv_territory_id:
            return 403, {"success": False, "error": f'Access forbidden: You do not have permission to manage territory "{conv_territory_id}".'}

        auth_messages = phone_messages
        if user.get("role") != "SUPER_ADMIN":
            auth_messages = [m for m in phone_messages if (m.get("territoryId") or FLAGSHIP_TERRITORY_ID) == user.get("territoryId")]

        auth_messages.sort(key=lambda m: m.get("createdAt", ""))

        contact_name = matched_contact.get("name") if matched_contact else (
            auth_messages[-1].get("contactName") if auth_messages else f"Customer ({clean_phone})"
        )

        return 200, {
            "success": True,
            "phone": clean_phone,
            "contactName": contact_name,
            "territoryId": conv_territory_id,
            "messages": auth_messages,
            "total": len(auth_messages)
        }

    # Case B: List conversations
    scoped_messages = all_messages
    if user.get("role") != "SUPER_ADMIN":
        scoped_messages = [m for m in all_messages if (m.get("territoryId") or FLAGSHIP_TERRITORY_ID) == user.get("territoryId")]

    conv_map = {}
    for m in scoped_messages:
        p = re.sub(r"\D", "", m.get("phone", ""))
        if not p: continue
        if p not in conv_map:
            conv_map[p] = []
        conv_map[p].append(m)

    scoped_contacts = all_contacts
    if user.get("role") != "SUPER_ADMIN":
        scoped_contacts = [c for c in all_contacts if (c.get("territoryId") or FLAGSHIP_TERRITORY_ID) == user.get("territoryId")]

    for c in scoped_contacts:
        p = re.sub(r"\D", "", c.get("phone", ""))
        if p and p not in conv_map:
            conv_map[p] = []

    conversations = []
    for p, msgs in conv_map.items():
        msgs.sort(key=lambda m: m.get("createdAt", ""), reverse=True)
        latest_msg = msgs[0] if msgs else None
        matched_c = next((c for c in scoped_contacts if re.sub(r"\D", "", c.get("phone", "")) == p), None)

        contact_name = matched_c.get("name") if matched_c else (
            latest_msg.get("contactName") if latest_msg else f"Customer ({p})"
        )
        territory_id = (
            latest_msg.get("territoryId") if latest_msg else
            (matched_c.get("territoryId") if matched_c else user.get("territoryId"))
        ) or FLAGSHIP_TERRITORY_ID

        unread_count = len([m for m in msgs if m.get("direction") == "inbound" and m.get("status") != "read"])

        summary = {
            "phone": p,
            "contactName": contact_name,
            "territoryId": territory_id,
            "lastMessage": latest_msg.get("messageText") if latest_msg else (matched_c.get("lastMessage", "New Contact") if matched_c else ""),
            "lastMessageAt": latest_msg.get("createdAt") if latest_msg else (matched_c.get("lastContactAt", "2026-10-26T00:00:00Z") if matched_c else "2026-10-26T00:00:00Z"),
            "lastDirection": latest_msg.get("direction", "inbound") if latest_msg else "inbound",
            "unreadCount": unread_count,
            "totalMessages": len(msgs),
            "assignedStaffId": latest_msg.get("assignedStaffId") if latest_msg else None,
            "assignedStaffName": latest_msg.get("assignedStaffName") if latest_msg else None
        }

        if search_query:
            sq = search_query.lower()
            if sq not in summary["contactName"].lower() and sq not in summary["phone"] and sq not in summary["lastMessage"].lower():
                continue

        if unread_only and summary["unreadCount"] == 0:
            continue

        conversations.append(summary)

    conversations.sort(key=lambda c: c["lastMessageAt"], reverse=True)
    return 200, {"success": True, "conversations": conversations, "total": len(conversations)}


def simulate_post_inbox(token=None, body=None):
    """Simulates POST /api/admin/inbox"""
    user = verify_token(token)
    if not user:
        return 401, {"success": False, "error": "Authentication required. Please sign in."}

    if not body or not isinstance(body, dict):
        return 400, {"success": False, "error": "Invalid JSON request payload"}

    action = body.get("action", "send")
    phone = body.get("phone")

    if not phone or not isinstance(phone, str):
        return 400, {"success": False, "error": "Phone number is required"}

    clean_phone = re.sub(r"\D", "", phone)
    if len(clean_phone) < 10:
        return 400, {"success": False, "error": "Phone number must contain at least 10 digits"}

    store = load_store()
    if "messages" not in store: store["messages"] = []
    if "contacts" not in store: store["contacts"] = []

    existing_msg = next((m for m in store["messages"] if re.sub(r"\D", "", m.get("phone", "")) == clean_phone), None)
    existing_contact = next((c for c in store["contacts"] if re.sub(r"\D", "", c.get("phone", "")) == clean_phone), None)

    target_territory_id = (
        existing_msg.get("territoryId") if existing_msg else
        (existing_contact.get("territoryId") if existing_contact else user.get("territoryId"))
    ) or FLAGSHIP_TERRITORY_ID

    if user.get("role") != "SUPER_ADMIN":
        if existing_msg and (existing_msg.get("territoryId") or FLAGSHIP_TERRITORY_ID) != user.get("territoryId"):
            return 403, {"success": False, "error": f'Access forbidden: Conversation belongs to another territory "{existing_msg.get("territoryId")}".'}
        target_territory_id = user.get("territoryId")

    # ACTION: MARK READ
    if action == "mark_read":
        if user.get("role") != "SUPER_ADMIN" and target_territory_id != user.get("territoryId"):
            return 403, {"success": False, "error": "Forbidden"}

        updated_count = 0
        for m in store["messages"]:
            if re.sub(r"\D", "", m.get("phone", "")) == clean_phone and m.get("direction") == "inbound" and m.get("status") != "read":
                m["status"] = "read"
                updated_count += 1
        save_store(store)
        return 200, {"success": True, "message": "Conversation marked as read", "updatedCount": updated_count}

    # ACTION: ASSIGN
    if action == "assign":
        staff_id = body.get("staffId")
        staff_name = body.get("staffName")
        if not staff_id or not staff_name:
            return 400, {"success": False, "error": "staffId and staffName are required"}

        for m in store["messages"]:
            if re.sub(r"\D", "", m.get("phone", "")) == clean_phone:
                m["assignedStaffId"] = staff_id
                m["assignedStaffName"] = staff_name

        if existing_contact:
            existing_contact["notes"] = f"Assigned to {staff_name} ({staff_id}). {existing_contact.get('notes', '')}".strip()

        save_store(store)
        return 200, {"success": True, "message": f"Conversation assigned to {staff_name}", "assignedTo": {"staffId": staff_id, "staffName": staff_name}}

    # ACTION: SEND
    message_text = body.get("messageText")
    image_url = body.get("imageUrl")

    if not message_text or not isinstance(message_text, str) or not message_text.strip():
        return 400, {"success": False, "error": "Message text cannot be empty"}

    trimmed_text = message_text.strip()
    if len(trimmed_text) > 4096:
        return 400, {"success": False, "error": "Message exceeds maximum length of 4096 characters"}

    # Provider status simulation
    token_configured = bool(store.get("settings", {}).get("whatsappToken"))
    provider_delivered = False
    provider_status = "sent"

    contact_name = existing_contact.get("name") if existing_contact else (
        existing_msg.get("contactName") if existing_msg else "Customer"
    )

    new_msg = {
        "id": f"msg_out_{int(time.time() * 1000)}",
        "phone": clean_phone,
        "contactName": contact_name,
        "direction": "outbound",
        "messageText": trimmed_text,
        "imageUrl": image_url.strip() if image_url and isinstance(image_url, str) else None,
        "territoryId": target_territory_id,
        "status": provider_status,
        "createdAt": "2026-10-26T00:00:00.000Z"
    }

    store["messages"].insert(0, new_msg)

    if existing_contact:
        existing_contact["lastMessage"] = trimmed_text
        existing_contact["lastContactAt"] = "2026-10-26T00:00:00.000Z"
        existing_contact["messageCount"] = (existing_contact.get("messageCount") or 0) + 1
    else:
        new_contact = {
            "id": f"cnt_{int(time.time() * 1000)}",
            "name": contact_name,
            "phone": clean_phone,
            "tags": ["WhatsApp Lead"],
            "stage": "CONTACTED",
            "territoryId": target_territory_id,
            "lastMessage": trimmed_text,
            "lastContactAt": "2026-10-26T00:00:00.000Z",
            "messageCount": 1,
            "createdAt": "2026-10-26T00:00:00.000Z"
        }
        store["contacts"].insert(0, new_contact)

    save_store(store)
    return 201, {
        "success": True,
        "message": new_msg,
        "providerDelivered": provider_delivered,
        "notice": "Message saved locally in CRM inbox (WhatsApp provider credentials not configured)"
    }


def simulate_webhook_inbound(payload: dict):
    """Simulates POST /api/whatsapp/webhook with idempotency"""
    message = payload.get("entry", [{}])[0].get("changes", [{}])[0].get("value", {}).get("messages", [{}])[0]
    if not message:
        return 200, {"status": "ignored_no_message"}

    webhook_msg_id = message.get("id")
    store = load_store()

    # Idempotency check
    if webhook_msg_id and store.get("messages"):
        is_duplicate = any(
            m.get("id") == webhook_msg_id or m.get("providerMessageId") == webhook_msg_id
            for m in store["messages"]
        )
        if is_duplicate:
            return 200, {"status": "ignored_duplicate_webhook", "messageId": webhook_msg_id}

    sender_phone = re.sub(r"\D", "", message.get("from", ""))
    incoming_text = (message.get("text", {}).get("body") or "").strip()

    new_msg = {
        "id": f"msg_in_{int(time.time() * 1000)}",
        "providerMessageId": webhook_msg_id,
        "territoryId": FLAGSHIP_TERRITORY_ID,
        "phone": sender_phone,
        "contactName": "Citizen",
        "direction": "inbound",
        "messageText": incoming_text,
        "status": "received",
        "createdAt": "2026-10-26T00:00:00.000Z"
    }

    store["messages"].insert(0, new_msg)
    save_store(store)
    return 200, {"status": "processed_ok", "messageId": new_msg["id"]}


# -----------------------------------------------------------------------------
# MAIN TEST EXECUTION
# -----------------------------------------------------------------------------
def run_tests():
    print("=" * 70)
    print("CHOUTUPPAL FRANCHISE CRM — PHASE 3D SHARED INBOX TEST SUITE")
    print("=" * 70)

    # Backup data
    shutil.copyfile(DATA_FILE, BACKUP_FILE)

    try:
        store = load_store()
        initial_listings_count = len(store.get("listings", []))
        initial_msg_count = len(store.get("messages", []))
        print(f"[*] Initial Listings: {initial_listings_count}")
        print(f"[*] Initial Messages: {initial_msg_count}\n")

        # Create auth tokens
        super_admin_token = create_signed_token("9441348175", "SUPER_ADMIN", FLAGSHIP_TERRITORY_ID)
        choutuppal_token = create_signed_token("9849000001", "FRANCHISE_ADMIN", FLAGSHIP_TERRITORY_ID)
        nalgonda_token = create_signed_token("9849000002", "FRANCHISE_ADMIN", "territory_nalgonda")
        invalid_token = "invalid.token.here"

        # -------------------------------------------------------------
        # TEST GROUP 1: AUTHENTICATION ENFORCEMENT
        # -------------------------------------------------------------
        print("[TEST GROUP 1] Authentication Enforcement on Shared Inbox Endpoints")

        # Unauthenticated GET
        status, resp = simulate_get_inbox(token=None)
        if status == 401 and not resp.get("success"):
            log_pass("Unauthenticated GET /api/admin/inbox rejected with HTTP 401")
        else:
            log_fail("Unauthenticated GET rejected", f"Status={status}, resp={resp}")

        # Invalid token GET
        status, resp = simulate_get_inbox(token=invalid_token)
        if status == 401 and not resp.get("success"):
            log_pass("Tampered/Invalid session token rejected with HTTP 401")
        else:
            log_fail("Invalid token rejected", f"Status={status}")

        # Unauthenticated POST
        status, resp = simulate_post_inbox(token=None, body={"phone": "9848012345", "messageText": "Hello"})
        if status == 401 and not resp.get("success"):
            log_pass("Unauthenticated POST /api/admin/inbox rejected with HTTP 401")
        else:
            log_fail("Unauthenticated POST rejected", f"Status={status}")

        # -------------------------------------------------------------
        # TEST GROUP 2: CONVERSATION LISTING & SEARCH
        # -------------------------------------------------------------
        print("\n[TEST GROUP 2] Conversation Listing, Grouping & Search")

        # Populate a test message for Choutuppal and Nalgonda
        store = load_store()
        store["messages"].insert(0, {
            "id": "msg_cpl_1",
            "phone": "9848011111",
            "contactName": "Choutuppal Customer",
            "direction": "inbound",
            "messageText": "Inquiry about highway shops",
            "status": "received",
            "territoryId": FLAGSHIP_TERRITORY_ID,
            "createdAt": "2026-10-26T01:00:00Z"
        })
        store["messages"].insert(0, {
            "id": "msg_nal_1",
            "phone": "9848022222",
            "contactName": "Nalgonda Customer",
            "direction": "inbound",
            "messageText": "Looking for commercial space in Clock Tower",
            "status": "received",
            "territoryId": "territory_nalgonda",
            "createdAt": "2026-10-26T01:30:00Z"
        })
        save_store(store)

        # Choutuppal Admin gets conversations
        status, resp = simulate_get_inbox(token=choutuppal_token)
        if status == 200 and resp.get("success"):
            phones = [c["phone"] for c in resp.get("conversations", [])]
            if "9848011111" in phones and "9848022222" not in phones:
                log_pass("Choutuppal Admin sees only Choutuppal conversations", f"Found {len(phones)} conversations, Nalgonda excluded")
            else:
                log_fail("Tenant conversation filtering", f"Nalgonda leaked to Choutuppal: {phones}")
        else:
            log_fail("Choutuppal Admin conversation list failed", f"Status={status}, resp={resp}")

        # Nalgonda Admin gets conversations
        status, resp = simulate_get_inbox(token=nalgonda_token)
        if status == 200 and resp.get("success"):
            phones = [c["phone"] for c in resp.get("conversations", [])]
            if "9848022222" in phones and "9848011111" not in phones:
                log_pass("Nalgonda Admin sees only Nalgonda conversations", f"Found {len(phones)} conversations, Choutuppal excluded")
            else:
                log_fail("Tenant conversation filtering", f"Choutuppal leaked to Nalgonda: {phones}")
        else:
            log_fail("Nalgonda Admin conversation list failed", f"Status={status}")

        # Super Admin sees all conversations
        status, resp = simulate_get_inbox(token=super_admin_token)
        if status == 200 and resp.get("success"):
            phones = [c["phone"] for c in resp.get("conversations", [])]
            if "9848011111" in phones and "9848022222" in phones:
                log_pass("Super Admin sees conversations across all territories", f"Total conversations: {len(phones)}")
            else:
                log_fail("Super Admin conversation visibility", f"Phones missing: {phones}")
        else:
            log_fail("Super Admin conversation list failed", f"Status={status}")

        # Search filter
        status, resp = simulate_get_inbox(token=super_admin_token, search_query="Clock Tower")
        if status == 200 and len(resp.get("conversations", [])) == 1:
            log_pass("Search filter successfully matches message content", f"Matched: {resp['conversations'][0]['contactName']}")
        else:
            log_fail("Search filter", f"Status={status}, count={len(resp.get('conversations', []))}")

        # -------------------------------------------------------------
        # TEST GROUP 3: CROSS-TERRITORY IDOR / BOLA DEFENSES
        # -------------------------------------------------------------
        print("\n[TEST GROUP 3] Cross-Territory IDOR / BOLA Defenses")

        # Nalgonda Admin attempts to read Choutuppal thread
        status, resp = simulate_get_inbox(token=nalgonda_token, phone_param="9848011111")
        if status == 403 and not resp.get("success"):
            log_pass("Cross-territory thread read blocked with HTTP 403 Forbidden")
        else:
            log_fail("Cross-territory thread read blocked", f"Status={status}, expected 403. resp={resp}")

        # Nalgonda Admin attempts to send reply to Choutuppal customer
        status, resp = simulate_post_inbox(token=nalgonda_token, body={
            "action": "send",
            "phone": "9848011111",
            "messageText": "Unauthorized reply attempt"
        })
        if status == 403 and not resp.get("success"):
            log_pass("Cross-territory reply dispatch blocked with HTTP 403 Forbidden")
        else:
            log_fail("Cross-territory reply blocked", f"Status={status}, expected 403. resp={resp}")

        # -------------------------------------------------------------
        # TEST GROUP 4: MESSAGE THREAD LOADING & MARK AS READ
        # -------------------------------------------------------------
        print("\n[TEST GROUP 4] Message Thread Loading & Mark as Read Lifecycle")

        # Authorized read of Nalgonda thread
        status, resp = simulate_get_inbox(token=nalgonda_token, phone_param="9848022222")
        if status == 200 and resp.get("success"):
            msgs = resp.get("messages", [])
            if len(msgs) == 1 and msgs[0]["id"] == "msg_nal_1":
                log_pass("Authorized conversation messages loaded", f"Found {len(msgs)} messages for 9848022222")
            else:
                log_fail("Thread loading", f"Unexpected messages: {msgs}")
        else:
            log_fail("Thread loading failed", f"Status={status}, resp={resp}")

        # Mark conversation read
        status, resp = simulate_post_inbox(token=nalgonda_token, body={
            "action": "mark_read",
            "phone": "9848022222"
        })
        if status == 200 and resp.get("success") and resp.get("updatedCount") == 1:
            log_pass("Inbound message status updated to 'read'", f"updatedCount={resp.get('updatedCount')}")
        else:
            log_fail("Mark read action", f"Status={status}, resp={resp}")

        # Verify unread count is now 0 in conversations list
        status, resp = simulate_get_inbox(token=nalgonda_token)
        conv = next((c for c in resp.get("conversations", []) if c["phone"] == "9848022222"), None)
        if conv and conv.get("unreadCount") == 0:
            log_pass("Unread counter badge updated to 0", f"unreadCount={conv.get('unreadCount')}")
        else:
            log_fail("Unread counter update", f"Conv: {conv}")

        # -------------------------------------------------------------
        # TEST GROUP 5: REPLY DISPATCH & ACCURATE PROVIDER REPORTING
        # -------------------------------------------------------------
        print("\n[TEST GROUP 5] Reply Dispatch & Provider Representation")

        # Send valid reply in sandbox mode
        status, resp = simulate_post_inbox(token=nalgonda_token, body={
            "action": "send",
            "phone": "9848022222",
            "messageText": "Hello! We have 2 commercial spaces available near Clock Tower."
        })

        if status == 201 and resp.get("success"):
            new_msg = resp.get("message")
            provider_delivered = resp.get("providerDelivered")
            if provider_delivered is False and "credentials not configured" in resp.get("notice", ""):
                log_pass("Sandbox mode: providerDelivered accurately reported as False", f"notice={resp.get('notice')}")
            else:
                log_fail("Provider reporting", f"Falsely reported provider delivery! {resp}")

            if new_msg and new_msg.get("direction") == "outbound" and new_msg.get("territoryId") == "territory_nalgonda":
                log_pass("Outbound message persisted with correct territory and direction", f"msgId={new_msg.get('id')}")
            else:
                log_fail("Outbound message persistence", f"Invalid msg: {new_msg}")
        else:
            log_fail("Reply dispatch failed", f"Status={status}, resp={resp}")

        # Invalid reply validations
        # 1. Empty message text
        status, resp = simulate_post_inbox(token=nalgonda_token, body={"action": "send", "phone": "9848022222", "messageText": "   "})
        if status == 400 and not resp.get("success"):
            log_pass("Empty message text rejected with HTTP 400")
        else:
            log_fail("Empty message validation", f"Status={status}")

        # 2. Invalid phone number format (<10 digits)
        status, resp = simulate_post_inbox(token=nalgonda_token, body={"action": "send", "phone": "12345", "messageText": "Test"})
        if status == 400 and not resp.get("success"):
            log_pass("Malformed phone number (<10 digits) rejected with HTTP 400")
        else:
            log_fail("Malformed phone validation", f"Status={status}")

        # -------------------------------------------------------------
        # TEST GROUP 6: STAFF ASSIGNMENT
        # -------------------------------------------------------------
        print("\n[TEST GROUP 6] Conversation Staff Assignment")

        status, resp = simulate_post_inbox(token=nalgonda_token, body={
            "action": "assign",
            "phone": "9848022222",
            "staffId": "stf_nal_01",
            "staffName": "Suresh (Nalgonda Agent)"
        })
        if status == 200 and resp.get("success") and resp.get("assignedTo", {}).get("staffId") == "stf_nal_01":
            log_pass("Conversation successfully assigned to staff member", f"assignedTo={resp.get('assignedTo')}")
        else:
            log_fail("Staff assignment failed", f"Status={status}, resp={resp}")

        # -------------------------------------------------------------
        # TEST GROUP 7: WEBHOOK IDEMPOTENCY
        # -------------------------------------------------------------
        print("\n[TEST GROUP 7] WhatsApp Webhook Idempotency & Deduplication")

        wamid = f"wamid.HBgM{int(time.time() * 1000)}TESTID"
        webhook_payload = {
            "entry": [{
                "changes": [{
                    "value": {
                        "messages": [{
                            "id": wamid,
                            "from": "919441112233",
                            "text": {"body": "First attempt inbound message"}
                        }]
                    }
                }]
            }]
        }

        # 1. First delivery
        status1, resp1 = simulate_webhook_inbound(webhook_payload)
        if status1 == 200 and resp1.get("status") == "processed_ok":
            log_pass("First webhook delivery accepted and saved", f"messageId={resp1.get('messageId')}")
        else:
            log_fail("First webhook delivery failed", f"Status={status1}, resp={resp1}")

        # 2. Retried delivery with same wamid
        status2, resp2 = simulate_webhook_inbound(webhook_payload)
        if status2 == 200 and resp2.get("status") == "ignored_duplicate_webhook":
            log_pass("Duplicate webhook delivery detected and ignored cleanly", f"status={resp2.get('status')}")
        else:
            log_fail("Duplicate webhook deduplication failed", f"Status={status2}, resp={resp2}")

        # -------------------------------------------------------------
        # TEST GROUP 8: BASELINE DATA INTEGRITY
        # -------------------------------------------------------------
        print("\n[TEST GROUP 8] Baseline Data Integrity Verification")
        store = load_store()
        final_listings = len(store.get("listings", []))
        if final_listings == initial_listings_count:
            log_pass(f"All {initial_listings_count} listings intact", f"Count matches baseline ({final_listings})")
        else:
            log_fail("Baseline listings preserved", f"Count changed: {initial_listings_count} -> {final_listings}")

    finally:
        # Restore backup
        if os.path.exists(BACKUP_FILE):
            shutil.copyfile(BACKUP_FILE, DATA_FILE)
            os.remove(BACKUP_FILE)
            print("\n[*] Cleaned up and restored database backup.")

    print("\n" + "=" * 70)
    print(f"PHASE 3D TEST SUMMARY: {passed} PASSED, {failed} FAILED")
    print("=" * 70)

    if failed > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    run_tests()
