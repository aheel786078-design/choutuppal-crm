#!/usr/bin/env python3
"""
======================================================================
CHOUTUPPAL FRANCHISE CRM — PHASE 8 CONCURRENCY & BACKUP RESILIENCE
======================================================================
Comprehensive automated verification for:
  - Scenario 1: Two concurrent updates to different records (both preserved)
  - Scenario 2: Two concurrent updates to the same record (both fields merged/preserved)
  - Scenario 3: Failed mutation followed by a successful mutation
  - Scenario 4: Queue recovery after an exception (no cascade deadlock)
  - Scenario 5: Preservation of existing records during mutations
  - Scenario 6: Zero disk writes on failed mutation (disk state uncorrupted)
  - Scenario 7: Backup copy to private destination with companion manifest & SHA-256
  - Scenario 8: Live CRM data store remains 100% untouched & invariant

Safety Invariant: Strictly non-destructive. Never writes to data/admin_data.json.
Uses synthetic test fixtures in isolated temporary directories.
"""

import unittest
import os
import sys
import json
import shutil
import tempfile
import hashlib
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LIVE_DATA_FILE = os.path.join(BASE_DIR, 'data', 'admin_data.json')
BACKUP_SCRIPT = os.path.join(BASE_DIR, 'scripts', 'backup-manager.mjs')
TS_LOADER = os.path.join(BASE_DIR, 'scripts', 'ts-loader.mjs')
STORE_MODULE = os.path.join(BASE_DIR, 'src', 'lib', 'store.ts')
EXPECTED_LIVE_HASH = 'd6a6e8bafe75cff95fdf2b15f671963b163bc5193c9aeea96cb41c66ced4d04f'

def get_file_sha256(filepath):
    with open(filepath, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()

class TestPhase8ConcurrencyAndResilience(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if os.path.exists(LIVE_DATA_FILE):
            cls.live_sha_pre = get_file_sha256(LIVE_DATA_FILE)
        else:
            cls.live_sha_pre = None

    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix='crm_phase8_test_')
        self.synthetic_source = os.path.join(self.test_dir, 'synthetic_store.json')
        self.backup_dir = os.path.join(self.test_dir, 'backups')
        self.private_dest_dir = os.path.join(self.test_dir, 'private_backups')
        os.makedirs(self.backup_dir, exist_ok=True)
        os.makedirs(self.private_dest_dir, exist_ok=True)

        self.fixture_data = {
            "listings": [
                {
                    "id": "LST_001",
                    "title": "Initial Business One",
                    "territoryId": "territory_choutuppal",
                    "status": "APPROVED",
                    "phone": "9999900001",
                    "email": "initial1@example.com",
                    "createdAt": "2026-01-01T00:00:00.000Z"
                },
                {
                    "id": "LST_002",
                    "title": "Initial Business Two",
                    "territoryId": "territory_choutuppal",
                    "status": "PENDING",
                    "phone": "9999900002",
                    "email": "initial2@example.com",
                    "createdAt": "2026-01-02T00:00:00.000Z"
                }
            ],
            "contacts": [
                {
                    "id": "CNT_001",
                    "name": "Initial Contact One",
                    "phone": "9999900003",
                    "stage": "NEW_LEAD",
                    "territoryId": "territory_choutuppal"
                },
                {
                    "id": "CNT_002",
                    "name": "Initial Contact Two",
                    "phone": "9999900004",
                    "stage": "OPEN",
                    "territoryId": "territory_choutuppal"
                }
            ],
            "territories": [
                {
                    "id": "territory_choutuppal",
                    "name": "Choutuppal Town"
                }
            ],
            "auditLogs": []
        }

        with open(self.synthetic_source, 'w', encoding='utf-8') as f:
            json.dump(self.fixture_data, f, indent=2)

        self.synthetic_source_sha = get_file_sha256(self.synthetic_source)

    def tearDown(self):
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir, ignore_errors=True)

    def run_node_code(self, code_snippet):
        cmd = [
            'node',
            '--experimental-strip-types',
            '--loader', TS_LOADER,
            '--input-type=module',
            '-e', code_snippet
        ]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return proc

    # ----------------------------------------------------------------------
    # SCENARIO 1: Two concurrent updates to different records
    # ----------------------------------------------------------------------
    def test_scenario_01_concurrent_updates_different_records(self):
        node_script = f"""
import {{ mutateStore }} from '{STORE_MODULE}';

async function run() {{
  const target = '{self.synthetic_source}';
  
  // Launch two concurrent async mutations without awaiting sequentially
  const mutationA = mutateStore(async (store) => {{
    // Simulate non-trivial compute/delay
    await new Promise(r => setTimeout(r, 40));
    const l = store.listings.find(x => x.id === 'LST_001');
    if (l) l.title = 'Updated Title Alpha';
    return 'A_DONE';
  }}, {{ customPath: target }});

  const mutationB = mutateStore(async (store) => {{
    await new Promise(r => setTimeout(r, 20));
    const c = store.contacts.find(x => x.id === 'CNT_002');
    if (c) c.stage = 'WON';
    return 'B_DONE';
  }}, {{ customPath: target }});

  const results = await Promise.all([mutationA, mutationB]);
  console.log(JSON.stringify({{ success: true, results }}));
}}

run().catch(err => {{
  console.error(err);
  process.exit(1);
}});
"""
        proc = self.run_node_code(node_script)
        self.assertEqual(proc.returncode, 0, f"Concurrent mutation failed: {proc.stderr}")

        with open(self.synthetic_source, 'r', encoding='utf-8') as f:
            updated = json.load(f)

        lst1 = next(x for x in updated['listings'] if x['id'] == 'LST_001')
        cnt2 = next(x for x in updated['contacts'] if x['id'] == 'CNT_002')

        self.assertEqual(lst1['title'], 'Updated Title Alpha', "Listing 1 title update must be preserved")
        self.assertEqual(cnt2['stage'], 'WON', "Contact 2 stage update must be preserved")

    # ----------------------------------------------------------------------
    # SCENARIO 2: Two concurrent updates to the same record
    # ----------------------------------------------------------------------
    def test_scenario_02_concurrent_updates_same_record(self):
        node_script = f"""
import {{ mutateStore }} from '{STORE_MODULE}';

async function run() {{
  const target = '{self.synthetic_source}';

  const mutationPhone = mutateStore(async (store) => {{
    await new Promise(r => setTimeout(r, 30));
    const l = store.listings.find(x => x.id === 'LST_001');
    if (l) l.phone = '9999988888';
    return 'PHONE_DONE';
  }}, {{ customPath: target }});

  const mutationEmail = mutateStore(async (store) => {{
    await new Promise(r => setTimeout(r, 10));
    const l = store.listings.find(x => x.id === 'LST_001');
    if (l) l.email = 'merged@example.com';
    return 'EMAIL_DONE';
  }}, {{ customPath: target }});

  await Promise.all([mutationPhone, mutationEmail]);
  console.log(JSON.stringify({{ success: true }}));
}}

run().catch(err => {{
  console.error(err);
  process.exit(1);
}});
"""
        proc = self.run_node_code(node_script)
        self.assertEqual(proc.returncode, 0, f"Same record concurrent mutation failed: {proc.stderr}")

        with open(self.synthetic_source, 'r', encoding='utf-8') as f:
            updated = json.load(f)

        lst1 = next(x for x in updated['listings'] if x['id'] == 'LST_001')
        self.assertEqual(lst1['phone'], '9999988888', "Listing phone must be updated")
        self.assertEqual(lst1['email'], 'merged@example.com', "Listing email must be updated")

    # ----------------------------------------------------------------------
    # SCENARIO 3: Failed mutation followed by successful mutation
    # ----------------------------------------------------------------------
    def test_scenario_03_failed_mutation_followed_by_success(self):
        node_script = f"""
import {{ mutateStore }} from '{STORE_MODULE}';

async function run() {{
  const target = '{self.synthetic_source}';

  let failedError = null;
  try {{
    await mutateStore(async (store) => {{
      // Corrupt in-memory state then throw
      store.listings[0].title = 'CORRUPTED_TITLE';
      throw new Error('Simulated validation failure');
    }}, {{ customPath: target }});
  }} catch (err) {{
    failedError = err.message;
  }}

  // Next mutation should succeed cleanly
  const resSuccess = await mutateStore(async (store) => {{
    const c = store.contacts.find(x => x.id === 'CNT_001');
    c.name = 'Contact One Cleanly Updated';
    return 'SUCCESS_DONE';
  }}, {{ customPath: target }});

  console.log(JSON.stringify({{ failedError, resSuccess }}));
}}

run().catch(err => {{
  console.error(err);
  process.exit(1);
}});
"""
        proc = self.run_node_code(node_script)
        self.assertEqual(proc.returncode, 0, f"Failed/success sequence failed: {proc.stderr}")

        with open(self.synthetic_source, 'r', encoding='utf-8') as f:
            updated = json.load(f)

        lst1 = next(x for x in updated['listings'] if x['id'] == 'LST_001')
        cnt1 = next(x for x in updated['contacts'] if x['id'] == 'CNT_001')

        self.assertEqual(lst1['title'], 'Initial Business One', "Failed mutation must not persist corrupted title")
        self.assertEqual(cnt1['name'], 'Contact One Cleanly Updated', "Subsequent mutation must succeed cleanly")

    # ----------------------------------------------------------------------
    # SCENARIO 4: Queue recovery after exception (no deadlock/hang)
    # ----------------------------------------------------------------------
    def test_scenario_04_queue_recovery_after_exception(self):
        node_script = f"""
import {{ mutateStore }} from '{STORE_MODULE}';

async function run() {{
  const target = '{self.synthetic_source}';

  const m1 = mutateStore(async (store) => {{
    store.contacts[0].stage = 'STAGE_1';
    return 'M1_OK';
  }}, {{ customPath: target }});

  const m2 = mutateStore(async (store) => {{
    throw new Error('M2_SIMULATED_CRASH');
  }}, {{ customPath: target }});

  const m3 = mutateStore(async (store) => {{
    store.contacts[1].stage = 'STAGE_3';
    return 'M3_OK';
  }}, {{ customPath: target }});

  const [res1, res2, res3] = await Promise.allSettled([m1, m2, m3]);
  console.log(JSON.stringify({{
    m1Status: res1.status,
    m2Status: res2.status,
    m2Reason: res2.reason ? res2.reason.message : null,
    m3Status: res3.status
  }}));
}}

run().catch(err => {{
  console.error(err);
  process.exit(1);
}});
"""
        proc = self.run_node_code(node_script)
        self.assertEqual(proc.returncode, 0, f"Queue recovery test failed: {proc.stderr}")
        out = json.loads(proc.stdout.strip().splitlines()[-1])
        self.assertEqual(out['m1Status'], 'fulfilled')
        self.assertEqual(out['m2Status'], 'rejected')
        self.assertIn('M2_SIMULATED_CRASH', out['m2Reason'])
        self.assertEqual(out['m3Status'], 'fulfilled', "M3 must fulfill even after M2 failed")

    # ----------------------------------------------------------------------
    # SCENARIO 5: Preservation of existing records
    # ----------------------------------------------------------------------
    def test_scenario_05_preservation_of_existing_records(self):
        node_script = f"""
import {{ mutateStore }} from '{STORE_MODULE}';

async function run() {{
  const target = '{self.synthetic_source}';

  await mutateStore(async (store) => {{
    store.listings.push({{
      id: 'LST_NEW_003',
      title: 'Newly Appended Business',
      territoryId: 'territory_choutuppal',
      status: 'APPROVED',
      phone: '9999977777',
      createdAt: new Date().toISOString()
    }});
  }}, {{ customPath: target }});

  console.log(JSON.stringify({{ success: true }}));
}}

run().catch(err => {{
  console.error(err);
  process.exit(1);
}});
"""
        proc = self.run_node_code(node_script)
        self.assertEqual(proc.returncode, 0)

        with open(self.synthetic_source, 'r', encoding='utf-8') as f:
            updated = json.load(f)

        self.assertEqual(len(updated['listings']), 3, "Total listings should now be 3")
        self.assertTrue(any(x['id'] == 'LST_001' for x in updated['listings']))
        self.assertTrue(any(x['id'] == 'LST_002' for x in updated['listings']))
        self.assertTrue(any(x['id'] == 'LST_NEW_003' for x in updated['listings']))
        self.assertEqual(len(updated['contacts']), 2, "Contacts count must remain unchanged at 2")

    # ----------------------------------------------------------------------
    # SCENARIO 6: Zero disk writes on failed mutation
    # ----------------------------------------------------------------------
    def test_scenario_06_zero_disk_writes_on_failed_mutation(self):
        before_sha = get_file_sha256(self.synthetic_source)

        node_script = f"""
import {{ mutateStore }} from '{STORE_MODULE}';

async function run() {{
  const target = '{self.synthetic_source}';
  await mutateStore(async (store) => {{
    store.listings[0].title = 'TAMPERED_IN_MEMORY';
    throw new Error('Abort mutation before persist');
  }}, {{ customPath: target }});
}}

run().catch(() => process.exit(42));
"""
        proc = self.run_node_code(node_script)
        self.assertEqual(proc.returncode, 42, "Failed mutation must throw with exit code 42")

        after_sha = get_file_sha256(self.synthetic_source)
        self.assertEqual(before_sha, after_sha, "File on disk must remain 100% byte-for-byte identical after failed mutation")

    # ----------------------------------------------------------------------
    # SCENARIO 7: Backup copy to private destination via CLI
    # ----------------------------------------------------------------------
    def test_scenario_07_backup_copy_to_private_destination(self):
        # 1. Create a synthetic backup in backup_dir
        cmd_create = ['node', BACKUP_SCRIPT, 'create', f'--source={self.synthetic_source}', f'--dir={self.backup_dir}', '--label=concurrency_test']
        proc_create = subprocess.run(cmd_create, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.assertEqual(proc_create.returncode, 0, f"Backup create failed: {proc_create.stderr}")

        backups = [f for f in os.listdir(self.backup_dir) if f.endswith('.json') and not f.endswith('.manifest.json')]
        self.assertEqual(len(backups), 1)
        backup_file = os.path.join(self.backup_dir, backups[0])
        source_backup_sha = get_file_sha256(backup_file)

        # 2. Copy backup to private destination
        cmd_copy = ['node', BACKUP_SCRIPT, 'copy', backup_file, f'--dest={self.private_dest_dir}']
        proc_copy = subprocess.run(cmd_copy, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.assertEqual(proc_copy.returncode, 0, f"Backup copy failed: {proc_copy.stderr}")
        self.assertIn("✓ SUCCESS", proc_copy.stdout)

        # 3. Check destination files
        dest_backup_file = os.path.join(self.private_dest_dir, backups[0])
        dest_manifest_file = dest_backup_file.replace('.json', '.manifest.json')
        self.assertTrue(os.path.exists(dest_backup_file), "Copied backup must exist in private directory")
        self.assertTrue(os.path.exists(dest_manifest_file), "Copied manifest must exist in private directory")

        dest_sha = get_file_sha256(dest_backup_file)
        self.assertEqual(source_backup_sha, dest_sha, "Copied backup SHA-256 must match source backup SHA-256")

        # 4. Confirm source backup was NOT deleted
        self.assertTrue(os.path.exists(backup_file), "Source backup must be strictly preserved without deletion")

    # ----------------------------------------------------------------------
    # SCENARIO 8: Live CRM data store remains 100% untouched & invariant
    # ----------------------------------------------------------------------
    def test_scenario_08_live_crm_data_store_untouched(self):
        if self.live_sha_pre:
            live_sha_now = get_file_sha256(LIVE_DATA_FILE)
            self.assertEqual(self.live_sha_pre, live_sha_now, "Live CRM data store was modified during testing!")
            self.assertEqual(live_sha_now, EXPECTED_LIVE_HASH, "Live CRM data store hash differs from expected baseline!")

if __name__ == '__main__':
    unittest.main(verbosity=2)
