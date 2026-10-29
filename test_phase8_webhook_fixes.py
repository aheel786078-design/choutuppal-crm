#!/usr/bin/env python3
"""
======================================================================
CHOUTUPPAL FRANCHISE CRM — PHASE 8 WEBHOOK AUTOMATION TEST SUITE
======================================================================
Comprehensive verification for all 12 required Phase 8 test scenarios:
  1. Missing secret and missing signature
  2. Invalid and valid signatures
  3. Malformed webhook payload
  4. Duplicate inbound message
  5. Unknown sender and existing contact
  6. Country-code phone normalization
  7. Duplicate delivery-status event
  8. Status progression: sent → delivered → read
  9. Out-of-order status events
  10. Unknown provider message ID
  11. Concurrent webhook mutation safety
  12. Existing flow and automation regression tests

Strict Safety Invariants:
  - 100% Non-destructive. Points CRM_DATA_FILE to an isolated temporary fixture.
  - Verifies live data/admin_data.json SHA-256 baseline before and after.
"""

import unittest
import os
import sys
import json
import shutil
import tempfile
import hashlib
import hmac
import subprocess
from concurrent.futures import ThreadPoolExecutor

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LIVE_DATA_FILE = os.path.join(BASE_DIR, 'data', 'admin_data.json')
TS_LOADER = os.path.join(BASE_DIR, 'scripts', 'ts-loader.mjs')
WEBHOOK_ROUTE = os.path.join(BASE_DIR, 'src', 'app', 'api', 'whatsapp', 'webhook', 'route.ts')
EXPECTED_LIVE_HASH = 'd6a6e8bafe75cff95fdf2b15f671963b163bc5193c9aeea96cb41c66ced4d04f'

def get_file_sha256(filepath):
    with open(filepath, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()

class TestPhase8WebhookFixes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if os.path.exists(LIVE_DATA_FILE):
            cls.live_sha_pre = get_file_sha256(LIVE_DATA_FILE)
            assert cls.live_sha_pre == EXPECTED_LIVE_HASH, f"Live hash mismatch: {cls.live_sha_pre}"
        else:
            cls.live_sha_pre = None

    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix='crm_phase8_webhook_test_')
        self.synthetic_source = os.path.join(self.test_dir, 'synthetic_store.json')

        self.fixture_data = {
            "listings": [
                {
                    "id": "LST_001",
                    "title": "Choutuppal Kirana Store",
                    "slug": "choutuppal-kirana-store",
                    "territoryId": "territory_choutuppal",
                    "status": "published",
                    "phone": "9441348175",
                    "whatsapp": "9441348175",
                    "address": "Main Road, Choutuppal",
                    "description": "General grocery items",
                    "createdAt": "2026-01-01T00:00:00.000Z"
                }
            ],
            "contacts": [
                {
                    "id": "cnt_existing_001",
                    "name": "Existing Merchant",
                    "phone": "9848022338",
                    "territoryId": "territory_choutuppal",
                    "stage": "CONTACTED",
                    "tags": ["Merchant"],
                    "messageCount": 3,
                    "lastMessage": "Initial inquiry",
                    "lastContactAt": "2026-01-01T00:00:00.000Z",
                    "createdAt": "2026-01-01T00:00:00.000Z"
                }
            ],
            "territories": [
                {
                    "id": "territory_choutuppal",
                    "name": "Choutuppal Town",
                    "slug": "choutuppal",
                    "isFlagship": True,
                    "primaryDomain": "choutuppal.in"
                }
            ],
            "messages": [
                {
                    "id": "msg_out_test_01",
                    "providerMessageId": "wamid.HBgLtest01",
                    "phone": "9441348175",
                    "direction": "outbound",
                    "messageText": "Test outbound notification",
                    "territoryId": "territory_choutuppal",
                    "status": "sent",
                    "createdAt": "2026-01-01T00:00:00.000Z"
                },
                {
                    "id": "msg_out_test_02",
                    "providerMessageId": "wamid.HBgLtest02_fail",
                    "phone": "9848022338",
                    "direction": "outbound",
                    "messageText": "Delivery will fail",
                    "territoryId": "territory_choutuppal",
                    "status": "sent",
                    "createdAt": "2026-01-01T00:00:00.000Z"
                }
            ],
            "approvals": [],
            "flows": [],
            "automations": []
        }

        with open(self.synthetic_source, 'w', encoding='utf-8') as f:
            json.dump(self.fixture_data, f, indent=2)

    def tearDown(self):
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir, ignore_errors=True)

    def call_webhook_post(self, body_dict=None, headers=None, env_vars=None, raw_body_override=None):
        raw_body = raw_body_override if raw_body_override is not None else json.dumps(body_dict or {})
        headers = headers or {}
        env_vars = env_vars or {}

        env_merged = os.environ.copy()
        env_merged['CRM_DATA_FILE'] = self.synthetic_source
        env_merged.update(env_vars)

        node_script = f"""
import {{ POST }} from '{WEBHOOK_ROUTE}';

async function run() {{
  const rawBody = {json.dumps(raw_body)};
  const headerInit = {json.dumps(headers)};

  const req = new Request('http://localhost:3000/api/whatsapp/webhook', {{
    method: 'POST',
    headers: new Headers(headerInit),
    body: rawBody,
  }});

  const res = await POST(req);
  const status = res.status;
  const jsonBody = await res.json().catch(() => ({{}}));

  console.log(JSON.stringify({{ status, jsonBody }}));
}}

run().catch(err => {{
  console.error(err);
  process.exit(1);
}});
"""
        cmd = [
            'node',
            '--experimental-strip-types',
            '--loader', TS_LOADER,
            '--input-type=module',
            '-e', node_script
        ]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env_merged)
        if proc.returncode != 0:
            raise RuntimeError(f"Node execution failed (code {proc.returncode}): {proc.stderr}")

        for line in proc.stdout.splitlines():
            line = line.strip()
            if line.startswith('{') and line.endswith('}'):
                return json.loads(line)
        raise ValueError(f"Could not parse JSON from Node output: {proc.stdout}")

    # =========================================================================
    # TEST 1: MISSING SECRET AND MISSING SIGNATURE
    # =========================================================================

    def test_01_missing_secret_and_missing_signature(self):
        # 1a. Production with missing secret and missing header -> 401
        res1 = self.call_webhook_post({"entry": []}, env_vars={'NODE_ENV': 'production', 'WHATSAPP_APP_SECRET': ''})
        self.assertEqual(res1['status'], 401, "Production without secret must fail closed with 401")
        self.assertEqual(res1['jsonBody'].get('error'), 'Webhook signature required in production')

        # 1b. Production with secret configured but missing signature header -> 401
        res2 = self.call_webhook_post({"entry": []}, env_vars={'NODE_ENV': 'production', 'WHATSAPP_APP_SECRET': 'meta_secret_123'})
        self.assertEqual(res2['status'], 401, "Production with secret but missing header must fail closed with 401")
        self.assertEqual(res2['jsonBody'].get('error'), 'Webhook signature required in production')

        # 1c. Non-production with secret configured but missing signature header -> 401
        res3 = self.call_webhook_post({"entry": []}, env_vars={'NODE_ENV': 'development', 'WHATSAPP_APP_SECRET': 'meta_secret_123'})
        self.assertEqual(res3['status'], 401, "Non-production with secret but missing header must fail closed with 401")
        self.assertEqual(res3['jsonBody'].get('error'), 'Missing x-hub-signature-256 header')

        # 1d. Header provided but server secret is missing -> 401
        headers = {'x-hub-signature-256': 'sha256=abcdef1234567890'}
        res4 = self.call_webhook_post({"entry": []}, headers=headers, env_vars={'NODE_ENV': 'development', 'WHATSAPP_APP_SECRET': ''})
        self.assertEqual(res4['status'], 401, "Signature provided with unconfigured secret must fail closed with 401")
        self.assertEqual(res4['jsonBody'].get('error'), 'Webhook secret not configured on server')

    # =========================================================================
    # TEST 2: INVALID AND VALID SIGNATURES
    # =========================================================================

    def test_02_invalid_and_valid_signatures(self):
        secret = 'prod_meta_secret_secure_99'
        payload = {"entry": [{"changes": [{"value": {}}]}]}
        raw_body = json.dumps(payload)

        # 2a. Forged / invalid HMAC signature -> 401
        invalid_headers = {'x-hub-signature-256': 'sha256=0000000000000000000000000000000000000000000000000000000000000000'}
        res_invalid = self.call_webhook_post(payload, headers=invalid_headers, env_vars={'NODE_ENV': 'production', 'WHATSAPP_APP_SECRET': secret})
        self.assertEqual(res_invalid['status'], 401, "Forged signature must fail closed with 401")
        self.assertEqual(res_invalid['jsonBody'].get('error'), 'Invalid webhook signature')

        # 2b. Valid HMAC-SHA256 signature -> 200
        valid_sig = hmac.new(secret.encode('utf-8'), raw_body.encode('utf-8'), hashlib.sha256).hexdigest()
        valid_headers = {'x-hub-signature-256': f'sha256={valid_sig}'}
        res_valid = self.call_webhook_post(payload, headers=valid_headers, env_vars={'NODE_ENV': 'production', 'WHATSAPP_APP_SECRET': secret})
        self.assertEqual(res_valid['status'], 200, "Valid signature must pass with 200")
        self.assertEqual(res_valid['jsonBody']['status'], 'ignored_no_message')

    # =========================================================================
    # TEST 3: MALFORMED WEBHOOK PAYLOAD
    # =========================================================================

    def test_03_malformed_webhook_payload(self):
        malformed_raw = '{"entry": [{"changes": [{"value": { broken_json '
        res = self.call_webhook_post(raw_body_override=malformed_raw)
        self.assertEqual(res['status'], 400, "Malformed JSON must return HTTP 400 Bad Request")
        self.assertEqual(res['jsonBody'].get('error'), 'Malformed JSON payload')

    # =========================================================================
    # TEST 4: DUPLICATE INBOUND MESSAGE
    # =========================================================================

    def test_04_duplicate_inbound_message(self):
        inbound_payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messaging_product": "whatsapp",
                                "contacts": [{"profile": {"name": "Sita Ram"}}],
                                "messages": [
                                    {
                                        "id": "wamid.dup_test_id_unique_101",
                                        "from": "919441122334",
                                        "type": "text",
                                        "text": {"body": "Idempotency test message"}
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        # First execution -> 200
        res1 = self.call_webhook_post(inbound_payload)
        self.assertEqual(res1['status'], 200)

        with open(self.synthetic_source, 'r', encoding='utf-8') as f:
            store1 = json.load(f)
        msg_count1 = len(store1['messages'])

        # Replay identical message ID -> 200 with ignored_duplicate_webhook
        res2 = self.call_webhook_post(inbound_payload)
        self.assertEqual(res2['status'], 200)
        self.assertEqual(res2['jsonBody']['status'], 'ignored_duplicate_webhook')

        with open(self.synthetic_source, 'r', encoding='utf-8') as f:
            store2 = json.load(f)
        self.assertEqual(len(store2['messages']), msg_count1, "Duplicate message must NOT be appended to store")

    # =========================================================================
    # TEST 5: UNKNOWN SENDER AND EXISTING CONTACT
    # =========================================================================

    def test_05_unknown_sender_and_existing_contact(self):
        # 5a. Unknown sender -> auto-upsert new contact
        unknown_payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messaging_product": "whatsapp",
                                "contacts": [{"profile": {"name": "Kavitha Reddy"}}],
                                "messages": [
                                    {
                                        "id": "wamid.inbound_unknown_9988",
                                        "from": "919988776655",
                                        "type": "text",
                                        "text": {"body": "Looking for commercial spaces"}
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        res_unknown = self.call_webhook_post(unknown_payload)
        self.assertEqual(res_unknown['status'], 200)

        with open(self.synthetic_source, 'r', encoding='utf-8') as f:
            store_after_unknown = json.load(f)

        new_contact = next((c for c in store_after_unknown['contacts'] if '9988776655' in c['phone']), None)
        self.assertIsNotNone(new_contact, "New contact must be created for unknown sender")
        self.assertEqual(new_contact['name'], 'Kavitha Reddy')
        self.assertEqual(new_contact['stage'], 'NEW_LEAD')
        self.assertIn('WhatsApp Inbound', new_contact['tags'])
        self.assertEqual(new_contact['messageCount'], 1)

        # 5b. Existing contact -> updates existing record without duplicate
        existing_payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messaging_product": "whatsapp",
                                "contacts": [{"profile": {"name": "Existing Merchant"}}],
                                "messages": [
                                    {
                                        "id": "wamid.inbound_existing_9989",
                                        "from": "919848022338",
                                        "type": "text",
                                        "text": {"body": "Following up on wholesale price"}
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        res_existing = self.call_webhook_post(existing_payload)
        self.assertEqual(res_existing['status'], 200)

        with open(self.synthetic_source, 'r', encoding='utf-8') as f:
            store_after_existing = json.load(f)

        merchant_contacts = [c for c in store_after_existing['contacts'] if '9848022338' in c['phone']]
        self.assertEqual(len(merchant_contacts), 1, "Must NOT duplicate existing contact")
        self.assertEqual(merchant_contacts[0]['messageCount'], 4, "Existing contact messageCount must increment")
        self.assertEqual(merchant_contacts[0]['lastMessage'], 'Following up on wholesale price')

    # =========================================================================
    # TEST 6: COUNTRY-CODE PHONE NORMALIZATION
    # =========================================================================

    def test_06_country_code_phone_normalization(self):
        # Existing contact has phone "9848022338" (10 digits).
        # We test inbound from "+91 9848022338" and "919848022338".
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messaging_product": "whatsapp",
                                "contacts": [{"profile": {"name": "Existing Merchant"}}],
                                "messages": [
                                    {
                                        "id": "wamid.inbound_country_code_norm_01",
                                        "from": "+91 98480 22338",
                                        "type": "text",
                                        "text": {"body": "Message from phone formatted with country code"}
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        res = self.call_webhook_post(payload)
        self.assertEqual(res['status'], 200)

        with open(self.synthetic_source, 'r', encoding='utf-8') as f:
            store = json.load(f)

        matches = [c for c in store['contacts'] if '9848022338' in c['phone']]
        self.assertEqual(len(matches), 1, "Country-code variation must normalize to last 10 digits and prevent duplicates")
        self.assertEqual(matches[0]['messageCount'], 4)

    # =========================================================================
    # TEST 7: DUPLICATE DELIVERY-STATUS EVENT
    # =========================================================================

    def test_07_duplicate_delivery_status_event(self):
        status_payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messaging_product": "whatsapp",
                                "statuses": [
                                    {
                                        "id": "wamid.HBgLtest01",
                                        "status": "delivered",
                                        "timestamp": "1700000005",
                                        "recipient_id": "919441348175"
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        # First delivery event -> updates status to delivered
        res1 = self.call_webhook_post(status_payload)
        self.assertEqual(res1['status'], 200)
        self.assertEqual(res1['jsonBody']['status'], 'statuses_processed')

        # Duplicate delivery event (replayed) -> recognized as no mutation needed
        res2 = self.call_webhook_post(status_payload)
        self.assertEqual(res2['status'], 200)
        self.assertEqual(res2['jsonBody']['status'], 'statuses_acknowledged_no_mutation')

        with open(self.synthetic_source, 'r', encoding='utf-8') as f:
            store = json.load(f)
        msg = next(m for m in store['messages'] if m['providerMessageId'] == 'wamid.HBgLtest01')
        self.assertEqual(msg['status'], 'delivered')

    # =========================================================================
    # TEST 8: STATUS PROGRESSION: SENT → DELIVERED → READ
    # =========================================================================

    def test_08_status_progression_sent_delivered_read(self):
        # 8a. Verify initial status is 'sent'
        with open(self.synthetic_source, 'r', encoding='utf-8') as f:
            store0 = json.load(f)
        msg0 = next(m for m in store0['messages'] if m['providerMessageId'] == 'wamid.HBgLtest01')
        self.assertEqual(msg0['status'], 'sent')

        # 8b. Transition: sent -> delivered
        delivered_payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messaging_product": "whatsapp",
                                "statuses": [
                                    {
                                        "id": "wamid.HBgLtest01",
                                        "status": "delivered",
                                        "timestamp": "1700000005",
                                        "recipient_id": "919441348175"
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        res_del = self.call_webhook_post(delivered_payload)
        self.assertEqual(res_del['status'], 200)
        self.assertEqual(res_del['jsonBody']['status'], 'statuses_processed')

        with open(self.synthetic_source, 'r', encoding='utf-8') as f:
            store_del = json.load(f)
        msg_del = next(m for m in store_del['messages'] if m['providerMessageId'] == 'wamid.HBgLtest01')
        self.assertEqual(msg_del['status'], 'delivered')

        # 8c. Transition: delivered -> read
        read_payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messaging_product": "whatsapp",
                                "statuses": [
                                    {
                                        "id": "wamid.HBgLtest01",
                                        "status": "read",
                                        "timestamp": "1700000010",
                                        "recipient_id": "919441348175"
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        res_read = self.call_webhook_post(read_payload)
        self.assertEqual(res_read['status'], 200)
        self.assertEqual(res_read['jsonBody']['status'], 'statuses_processed')

        with open(self.synthetic_source, 'r', encoding='utf-8') as f:
            store_read = json.load(f)
        msg_read = next(m for m in store_read['messages'] if m['providerMessageId'] == 'wamid.HBgLtest01')
        self.assertEqual(msg_read['status'], 'read')

    # =========================================================================
    # TEST 9: OUT-OF-ORDER STATUS EVENTS
    # =========================================================================

    def test_09_out_of_order_status_events(self):
        # Progress message to 'read' first
        self.test_08_status_progression_sent_delivered_read()

        # 9a. Out-of-order 'delivered' event arriving after 'read'
        delayed_delivered = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messaging_product": "whatsapp",
                                "statuses": [
                                    {
                                        "id": "wamid.HBgLtest01",
                                        "status": "delivered",
                                        "timestamp": "1700000006",
                                        "recipient_id": "919441348175"
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        res_delayed_del = self.call_webhook_post(delayed_delivered)
        self.assertEqual(res_delayed_del['status'], 200)
        self.assertEqual(res_delayed_del['jsonBody']['status'], 'statuses_acknowledged_no_mutation')

        with open(self.synthetic_source, 'r', encoding='utf-8') as f:
            store1 = json.load(f)
        msg1 = next(m for m in store1['messages'] if m['providerMessageId'] == 'wamid.HBgLtest01')
        self.assertEqual(msg1['status'], 'read', "Out-of-order 'delivered' must NEVER downgrade 'read'")

        # 9b. Out-of-order 'sent' event arriving after 'read'
        delayed_sent = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messaging_product": "whatsapp",
                                "statuses": [
                                    {
                                        "id": "wamid.HBgLtest01",
                                        "status": "sent",
                                        "timestamp": "1700000001",
                                        "recipient_id": "919441348175"
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        res_delayed_sent = self.call_webhook_post(delayed_sent)
        self.assertEqual(res_delayed_sent['status'], 200)
        self.assertEqual(res_delayed_sent['jsonBody']['status'], 'statuses_acknowledged_no_mutation')

        with open(self.synthetic_source, 'r', encoding='utf-8') as f:
            store2 = json.load(f)
        msg2 = next(m for m in store2['messages'] if m['providerMessageId'] == 'wamid.HBgLtest01')
        self.assertEqual(msg2['status'], 'read', "Out-of-order 'sent' must NEVER downgrade 'read'")

        # 9c. 'failed' event arriving after 'read' must NOT downgrade 'read'
        delayed_failed = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messaging_product": "whatsapp",
                                "statuses": [
                                    {
                                        "id": "wamid.HBgLtest01",
                                        "status": "failed",
                                        "timestamp": "1700000015",
                                        "recipient_id": "919441348175"
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        res_delayed_failed = self.call_webhook_post(delayed_failed)
        self.assertEqual(res_delayed_failed['status'], 200)
        self.assertEqual(res_delayed_failed['jsonBody']['status'], 'statuses_acknowledged_no_mutation')

        with open(self.synthetic_source, 'r', encoding='utf-8') as f:
            store3 = json.load(f)
        msg3 = next(m for m in store3['messages'] if m['providerMessageId'] == 'wamid.HBgLtest01')
        self.assertEqual(msg3['status'], 'read', "'failed' event must NOT downgrade a confirmed 'read' message")

    # =========================================================================
    # TEST 10: UNKNOWN PROVIDER MESSAGE ID
    # =========================================================================

    def test_10_unknown_provider_message_id(self):
        unknown_status_payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messaging_product": "whatsapp",
                                "statuses": [
                                    {
                                        "id": "wamid.UNKNOWN_NON_EXISTENT_99999",
                                        "status": "delivered",
                                        "timestamp": "1700000005",
                                        "recipient_id": "919441348175"
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        res = self.call_webhook_post(unknown_status_payload)
        self.assertEqual(res['status'], 200)
        self.assertEqual(res['jsonBody']['status'], 'statuses_acknowledged_no_mutation')
        self.assertEqual(res['jsonBody']['receivedCount'], 1)

    # =========================================================================
    # TEST 11: CONCURRENT WEBHOOK MUTATION SAFETY
    # =========================================================================

    def test_11_concurrent_webhook_mutation_safety(self):
        senders = [
            {"phone": "919100000001", "wamid": "wamid.concurrent_01", "text": "Concurrent message 1"},
            {"phone": "919100000002", "wamid": "wamid.concurrent_02", "text": "Concurrent message 2"},
            {"phone": "919100000003", "wamid": "wamid.concurrent_03", "text": "Concurrent message 3"},
            {"phone": "919100000004", "wamid": "wamid.concurrent_04", "text": "Concurrent message 4"},
        ]

        env_merged = os.environ.copy()
        env_merged['CRM_DATA_FILE'] = self.synthetic_source

        node_script = f"""
import {{ POST }} from '{WEBHOOK_ROUTE}';

async function run() {{
  const senders = {json.dumps(senders)};
  const promises = senders.map(s => {{
    const payload = {{
      entry: [
        {{
          changes: [
            {{
              value: {{
                messaging_product: 'whatsapp',
                contacts: [{{ profile: {{ name: 'User ' + s.phone.slice(-4) }} }}],
                messages: [
                  {{
                    id: s.wamid,
                    from: s.phone,
                    type: 'text',
                    text: {{ body: s.text }}
                  }}
                ]
              }}
            }}
          ]
        }}
      ]
    }};
    const req = new Request('http://localhost:3000/api/whatsapp/webhook', {{
      method: 'POST',
      headers: new Headers({{ 'Content-Type': 'application/json' }}),
      body: JSON.stringify(payload)
    }});
    return POST(req).then(async (res) => ({{ status: res.status, body: await res.json().catch(() => ({{}})) }}));
  }});

  const results = await Promise.all(promises);
  console.log(JSON.stringify({{ count: results.length, statuses: results.map(r => r.status) }}));
}}

run().catch(err => {{
  console.error(err);
  process.exit(1);
}});
"""
        cmd = [
            'node',
            '--experimental-strip-types',
            '--loader', TS_LOADER,
            '--input-type=module',
            '-e', node_script
        ]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env_merged)
        self.assertEqual(proc.returncode, 0, f"Concurrent node execution failed: {proc.stderr}")

        with open(self.synthetic_source, 'r', encoding='utf-8') as f:
            final_store = json.load(f)

        # Confirm all 4 concurrent messages were saved without lost updates
        recorded_wamids = [m.get('providerMessageId') or m.get('id') for m in final_store['messages']]
        for s in senders:
            wamid = s['wamid']
            self.assertIn(wamid, recorded_wamids, f"Concurrent wamid {wamid} must be recorded in store")

    # =========================================================================
    # TEST 12: EXISTING FLOW AND AUTOMATION REGRESSION TESTS
    # =========================================================================

    def test_12_existing_flow_and_automation_regression(self):
        flow_test_script = os.path.join(BASE_DIR, 'test_phase7_flow_automation.py')
        self.assertTrue(os.path.exists(flow_test_script), "test_phase7_flow_automation.py must exist")

        proc = subprocess.run([sys.executable, flow_test_script], cwd=BASE_DIR, capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, f"Flow automation regression suite failed:\n{proc.stderr}\n{proc.stdout}")
        self.assertIn("ALL PHASE 7 FLOW AUTOMATION TESTS PASSED (9/9)!", proc.stdout)

    # =========================================================================
    # SAFETY INVARIANT: LIVE DATA UNTOUCHED
    # =========================================================================

    def test_13_live_crm_data_store_untouched(self):
        if self.live_sha_pre and os.path.exists(LIVE_DATA_FILE):
            live_sha_post = get_file_sha256(LIVE_DATA_FILE)
            self.assertEqual(
                live_sha_post,
                self.live_sha_pre,
                f"SAFETY INVARIANT VIOLATION: Live store was modified! Expected {self.live_sha_pre}, got {live_sha_post}"
            )
            self.assertEqual(live_sha_post, EXPECTED_LIVE_HASH)

if __name__ == '__main__':
    unittest.main()
