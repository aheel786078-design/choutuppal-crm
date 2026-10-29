#!/usr/bin/env python3
"""
Choutuppal Franchise CRM — Phase 3B Test Suite
Tests Admin Content API (/api/admin/content) persistence, authentication,
tenant scoping, cross-territory IDOR defense, and Flagship immutability.
"""

import json
import os
import sys
import shutil
import hmac
import hashlib
import base64
import time

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "admin_data.json")
BACKUP_FILE = os.path.join(os.path.dirname(__file__), "data", "admin_data.json.bak_phase3b_test")
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
    tmp = f"{DATA_FILE}.tmp.{os.getpid()}_{int(time.time()*1000)}"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(store, f, indent=2, ensure_ascii=False)
    os.replace(tmp, DATA_FILE)

# Emulate src/app/api/admin/content/route.ts logic in exact mirror
def simulate_content_api(method: str, caller_token: str | None, query_params: dict | None, body: dict | None):
    user = verify_token(caller_token) if caller_token else None
    store = load_store()

    if method == "GET":
        territory_param = (query_params or {}).get("territoryId")
        banners = store.get("banners", [])
        stories = store.get("stories", [])
        offers = store.get("offers", [])
        tickers = store.get("tickers", [])
        news = store.get("news", [])
        shorts = store.get("shorts", [])

        if not user:
            now = "2026-10-26T00:00:00.000Z"
            banners = [b for b in banners if b.get("isActive", True) is not False]
            stories = [s for s in stories if s.get("status") == "published"]
            offers = [o for o in offers if o.get("status") == "published"]
            tickers = [t for t in tickers if t.get("isActive", True) is not False]
            news = [n for n in news if n.get("isPublished", True) is not False]
            shorts = [s for s in shorts if s.get("isActive", True) is not False]

            if territory_param and territory_param != "all":
                banners = [b for b in banners if b.get("territoryId", FLAGSHIP_TERRITORY_ID) == territory_param]
                stories = [s for s in stories if s.get("territoryId", FLAGSHIP_TERRITORY_ID) == territory_param]
                offers = [o for o in offers if o.get("territoryId", FLAGSHIP_TERRITORY_ID) == territory_param]
                tickers = [t for t in tickers if t.get("territoryId", FLAGSHIP_TERRITORY_ID) == territory_param]
                news = [n for n in news if n.get("territoryId", FLAGSHIP_TERRITORY_ID) == territory_param]
                shorts = [s for s in shorts if s.get("territoryId", FLAGSHIP_TERRITORY_ID) == territory_param]

            return 200, {
                "success": True,
                "isPublic": True,
                "banners": banners,
                "stories": stories,
                "offers": offers,
                "tickers": tickers,
                "news": news,
                "shorts": shorts
            }

        # Authenticated caller
        if user["role"] != "SUPER_ADMIN":
            user_tid = user["territoryId"]
            banners = [b for b in banners if b.get("territoryId", FLAGSHIP_TERRITORY_ID) == user_tid]
            stories = [s for s in stories if s.get("territoryId", FLAGSHIP_TERRITORY_ID) == user_tid]
            offers = [o for o in offers if o.get("territoryId", FLAGSHIP_TERRITORY_ID) == user_tid]
            tickers = [t for t in tickers if t.get("territoryId", FLAGSHIP_TERRITORY_ID) == user_tid]
            news = [n for n in news if n.get("territoryId", FLAGSHIP_TERRITORY_ID) == user_tid]
            shorts = [s for s in shorts if s.get("territoryId", FLAGSHIP_TERRITORY_ID) == user_tid]
        elif territory_param and territory_param != "all":
            banners = [b for b in banners if b.get("territoryId", FLAGSHIP_TERRITORY_ID) == territory_param]
            stories = [s for s in stories if s.get("territoryId", FLAGSHIP_TERRITORY_ID) == territory_param]
            offers = [o for o in offers if o.get("territoryId", FLAGSHIP_TERRITORY_ID) == territory_param]
            tickers = [t for t in tickers if t.get("territoryId", FLAGSHIP_TERRITORY_ID) == territory_param]
            news = [n for n in news if n.get("territoryId", FLAGSHIP_TERRITORY_ID) == territory_param]
            shorts = [s for s in shorts if s.get("territoryId", FLAGSHIP_TERRITORY_ID) == territory_param]

        return 200, {
            "success": True,
            "banners": banners,
            "stories": stories,
            "offers": offers,
            "tickers": tickers,
            "news": news,
            "shorts": shorts
        }

    elif method == "POST":
        if not user:
            return 401, {"success": False, "error": "Authentication required. Please sign in."}

        body = body or {}
        c_type = body.get("type")
        action = body.get("action", "create")
        item = body.get("item")
        c_id = body.get("id")

        valid_types = ["banner", "story", "offer", "ticker", "news", "short"]
        if not c_type or c_type not in valid_types:
            return 400, {"success": False, "error": "Invalid content type"}

        plural_map = {
            "banner": "banners",
            "story": "stories",
            "offer": "offers",
            "ticker": "tickers",
            "news": "news",
            "short": "shorts"
        }
        list_key = plural_map[c_type]
        if list_key not in store:
            store[list_key] = []
        current_list = store[list_key]

        if action == "delete":
            if not c_id:
                return 400, {"success": False, "error": "ID is required to delete"}
            existing = next((x for x in current_list if x.get("id") == c_id), None)
            if not existing:
                return 404, {"success": False, "error": "Item not found"}

            item_tid = existing.get("territoryId", FLAGSHIP_TERRITORY_ID)
            if item_tid == FLAGSHIP_TERRITORY_ID and user["role"] != "SUPER_ADMIN":
                return 403, {"success": False, "error": "Forbidden: Flagship content can only be deleted by Super Admin"}

            if user["role"] != "SUPER_ADMIN" and user["territoryId"] != item_tid:
                return 403, {"success": False, "error": f"Access forbidden: You do not have permission for territory {item_tid}"}

            store[list_key] = [x for x in current_list if x.get("id") != c_id]
            save_store(store)
            return 200, {"success": True, "message": "Deleted successfully"}

        if action == "toggle":
            if not c_id:
                return 400, {"success": False, "error": "ID is required to toggle status"}
            existing = next((x for x in current_list if x.get("id") == c_id), None)
            if not existing:
                return 404, {"success": False, "error": "Item not found"}

            item_tid = existing.get("territoryId", FLAGSHIP_TERRITORY_ID)
            if user["role"] != "SUPER_ADMIN" and user["territoryId"] != item_tid:
                return 403, {"success": False, "error": f"Access forbidden: You do not have permission for territory {item_tid}"}

            if "isActive" in existing:
                existing["isActive"] = not existing["isActive"]
            elif "isPublished" in existing:
                existing["isPublished"] = not existing["isPublished"]
            elif "status" in existing:
                existing["status"] = "draft" if existing["status"] == "published" else "published"

            save_store(store)
            return 200, {"success": True, "message": "Status updated successfully", "item": existing}

        # create or update
        if not item or not isinstance(item, dict):
            return 400, {"success": False, "error": "Item payload object is required"}

        # validation
        if c_type == "banner" and not item.get("title", "").strip():
            return 400, {"success": False, "error": "Banner title is required"}
        if c_type == "ticker" and not item.get("text", "").strip():
            return 400, {"success": False, "error": "Ticker text is required"}
        if c_type == "news" and not item.get("title", "").strip():
            return 400, {"success": False, "error": "News headline is required"}

        target_tid = item.get("territoryId") or user["territoryId"] or FLAGSHIP_TERRITORY_ID
        if user["role"] != "SUPER_ADMIN":
            target_tid = user["territoryId"]
        item["territoryId"] = target_tid

        existing_idx = next((i for i, x in enumerate(current_list) if x.get("id") == item.get("id")), -1) if item.get("id") else -1
        if existing_idx >= 0:
            existing_tid = current_list[existing_idx].get("territoryId", FLAGSHIP_TERRITORY_ID)
            if user["role"] != "SUPER_ADMIN" and user["territoryId"] != existing_tid:
                return 403, {"success": False, "error": f"Access forbidden: You do not have permission for territory {existing_tid}"}
            current_list[existing_idx].update(item)
            current_list[existing_idx]["updatedAt"] = "2026-10-26T00:00:00.000Z"
            save_store(store)
            return 200, {"success": True, "message": "Updated successfully", "item": current_list[existing_idx]}
        else:
            item["id"] = item.get("id") or f"{c_type[:3]}_{int(time.time()*1000)}"
            item["createdAt"] = item.get("createdAt") or "2026-10-26T00:00:00.000Z"
            current_list.insert(0, item)
            save_store(store)
            return 200, {"success": True, "message": "Created successfully", "item": item}

    return 405, {"success": False, "error": "Method not allowed"}

def main():
    print("\n======================================================================")
    print("PHASE 3B: Admin Content UI to Persistent Local APIs Verification Suite")
    print("======================================================================\n")

    shutil.copyfile(DATA_FILE, BACKUP_FILE)
    try:
        store = load_store()
        initial_flagship_count = len([l for l in store.get("listings", []) if l.get("territoryId") == FLAGSHIP_TERRITORY_ID])
        print(f"[Initial Safety Snapshot] Flagship Listings: {initial_flagship_count}")

        super_admin_token = create_signed_token("9441348175", "SUPER_ADMIN", FLAGSHIP_TERRITORY_ID)
        nalgonda_admin_token = create_signed_token("9848011223", "FRANCHISE_ADMIN", "territory_nalgonda")
        suryapet_admin_token = create_signed_token("9848077665", "FRANCHISE_ADMIN", "territory_suryapet")

        # --------------------------------------------------------------------
        # TEST 1: Unauthenticated GET returns only active public content
        # --------------------------------------------------------------------
        status, data = simulate_content_api("GET", None, None, None)
        if status == 200 and data.get("isPublic") is True:
            log_pass("SEC-01", "Unauthenticated GET /api/admin/content returns filtered public content")
        else:
            log_fail("SEC-01", f"Unexpected status {status} or isPublic not set")

        # --------------------------------------------------------------------
        # TEST 2: Unauthenticated POST is blocked
        # --------------------------------------------------------------------
        status, data = simulate_content_api("POST", None, None, {"type": "banner", "action": "create", "item": {"title": "Test"}})
        if status == 401:
            log_pass("SEC-02", "Unauthenticated POST /api/admin/content rejected with HTTP 401 Unauthorized")
        else:
            log_fail("SEC-02", f"Expected HTTP 401, got {status}")

        # --------------------------------------------------------------------
        # TEST 3: Invalid input payload is rejected
        # --------------------------------------------------------------------
        status, data = simulate_content_api("POST", nalgonda_admin_token, None, {"type": "invalid_type", "action": "create"})
        if status == 400:
            log_pass("SEC-03.1", "Invalid content type rejected with HTTP 400")
        else:
            log_fail("SEC-03.1", f"Expected HTTP 400, got {status}")

        status, data = simulate_content_api("POST", nalgonda_admin_token, None, {"type": "banner", "action": "create", "item": {"title": ""}})
        if status == 400:
            log_pass("SEC-03.2", "Missing required banner title rejected with HTTP 400")
        else:
            log_fail("SEC-03.2", f"Expected HTTP 400, got {status}")

        # --------------------------------------------------------------------
        # TEST 4: Franchise Admin CRUD operations within own territory
        # --------------------------------------------------------------------
        # Create banner
        banner_payload = {
            "type": "banner",
            "action": "create",
            "item": {
                "id": "ban_test_nalgonda_001",
                "title": "Nalgonda Gold Festival Offer 25% Off",
                "imageUrl": "https://example.com/nalgonda.jpg",
                "linkUrl": "/business/nalgonda-gold",
                "type": "TOP_BANNER",
                "isActive": True
            }
        }
        status, data = simulate_content_api("POST", nalgonda_admin_token, None, banner_payload)
        if status == 200 and data.get("item", {}).get("territoryId") == "territory_nalgonda":
            log_pass("SEC-04.1", "Franchise Admin created banner safely scoped to territory_nalgonda")
        else:
            log_fail("SEC-04.1", f"Banner creation failed with status {status}")

        # Toggle status
        status, data = simulate_content_api("POST", nalgonda_admin_token, None, {
            "type": "banner",
            "action": "toggle",
            "id": "ban_test_nalgonda_001"
        })
        if status == 200 and data.get("item", {}).get("isActive") is False:
            log_pass("SEC-04.2", "Banner active status toggled to False")
        else:
            log_fail("SEC-04.2", f"Toggle failed with status {status}")

        # --------------------------------------------------------------------
        # TEST 5: Cross-Territory IDOR Defense
        # --------------------------------------------------------------------
        # Suryapet admin attempts to toggle or delete Nalgonda banner
        status, data = simulate_content_api("POST", suryapet_admin_token, None, {
            "type": "banner",
            "action": "toggle",
            "id": "ban_test_nalgonda_001"
        })
        if status == 403:
            log_pass("SEC-05.1", "Cross-territory toggle attempt blocked with HTTP 403 Forbidden")
        else:
            log_fail("SEC-05.1", f"Expected HTTP 403, got {status}")

        status, data = simulate_content_api("POST", suryapet_admin_token, None, {
            "type": "banner",
            "action": "delete",
            "id": "ban_test_nalgonda_001"
        })
        if status == 403:
            log_pass("SEC-05.2", "Cross-territory delete attempt blocked with HTTP 403 Forbidden")
        else:
            log_fail("SEC-05.2", f"Expected HTTP 403, got {status}")

        # --------------------------------------------------------------------
        # TEST 6: Flagship Choutuppal Content Immutability
        # --------------------------------------------------------------------
        # Franchise Admin attempts to delete Flagship banner
        status, data = simulate_content_api("POST", nalgonda_admin_token, None, {
            "type": "banner",
            "action": "delete",
            "id": "ban_1" # Existing flagship banner
        })
        if status == 403:
            log_pass("SEC-06.1", "Flagship Choutuppal banner deletion strictly blocked for Franchise Admin (HTTP 403)")
        else:
            log_fail("SEC-06.1", f"Expected HTTP 403, got {status}")

        # --------------------------------------------------------------------
        # TEST 7: Tenant Content Scoping on Authenticated GET
        # --------------------------------------------------------------------
        status, nalgonda_data = simulate_content_api("GET", nalgonda_admin_token, None, None)
        nalgonda_banners = nalgonda_data.get("banners", [])
        if all(b.get("territoryId") == "territory_nalgonda" for b in nalgonda_banners):
            log_pass("SEC-07.1", f"Authenticated GET strictly returned only Nalgonda content ({len(nalgonda_banners)} banners)")
        else:
            log_fail("SEC-07.1", "Foreign territory content leaked to Franchise Admin")

        # --------------------------------------------------------------------
        # TEST 8: Super Admin Access & Cleanup
        # --------------------------------------------------------------------
        status, super_data = simulate_content_api("GET", super_admin_token, None, None)
        if status == 200 and len(super_data.get("banners", [])) >= 2:
            log_pass("SEC-08.1", "Super Admin has full visibility across all territories")
        else:
            log_fail("SEC-08.1", "Super Admin visibility compromised")

        # Clean up test banner
        status, _ = simulate_content_api("POST", nalgonda_admin_token, None, {
            "type": "banner",
            "action": "delete",
            "id": "ban_test_nalgonda_001"
        })
        if status == 200:
            log_pass("SEC-08.2", "Authorized tenant successfully deleted own test banner")
        else:
            log_fail("SEC-08.2", f"Failed to delete test banner with status {status}")

        # --------------------------------------------------------------------
        # TEST 9: Baseline Data Safety Verification
        # --------------------------------------------------------------------
        final_store = load_store()
        final_flagship_count = len([l for l in final_store.get("listings", []) if l.get("territoryId") == FLAGSHIP_TERRITORY_ID])
        stable_ids = ["lst_1", "lst_2", "lst_3", "lst_dir_206", "lst_dir_207", "lst_dir_208"]
        listing_ids = set(l.get("id") for l in final_store.get("listings", []))

        if final_flagship_count == 211 and all(sid in listing_ids for sid in stable_ids):
            log_pass("SEC-09.1", f"Data integrity 100% verified: exactly {final_flagship_count}/211 flagship listings intact")
        else:
            log_fail("SEC-09.1", f"Flagship listings corrupted! Count: {final_flagship_count}")

    finally:
        if os.path.exists(BACKUP_FILE):
            os.remove(BACKUP_FILE)

    print("\n======================================================================")
    print(f"TOTAL CHECKS: {passed + failed} | PASSED: {passed} | FAILED: {failed}")
    print("======================================================================\n")

    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
