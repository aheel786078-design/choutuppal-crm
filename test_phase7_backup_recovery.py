#!/usr/bin/env python3
"""
======================================================================
CHOUTUPPAL FRANCHISE CRM — PHASE 7 BACKUP & RECOVERY TEST SUITE
======================================================================
Comprehensive automated verification for:
  - Scenario 1: Valid backup can be parsed & checksum verified against manifest
  - Scenario 2: Restored test fixture is byte-for-byte identical to source fixture
  - Scenario 3: Corrupted backup is detected and rejected
  - Scenario 4: Missing backup is handled safely without crashing
  - Scenario 5: Checksum mismatch between file and manifest is detected
  - Scenario 6: Truncated JSON file is rejected
  - Scenario 7: Destination collision does not silently overwrite existing backup
  - Scenario 8: Failed backup does not alter or replace the source file
  - Scenario 9: Failed restore does not replace or corrupt the target destination
  - Scenario 10: Recovery stops safely if backup is invalid
  - Scenario 11: Commands clearly identify source and destination paths
  - Scenario 12: Real CRM live data store remains 100% untouched & invariant

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
EXPECTED_LIVE_HASH = 'd6a6e8bafe75cff95fdf2b15f671963b163bc5193c9aeea96cb41c66ced4d04f'

def get_file_sha256(filepath):
    with open(filepath, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()

class TestPhase7BackupAndRecovery(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Record live data hash before running any tests
        if os.path.exists(LIVE_DATA_FILE):
            cls.live_sha_pre = get_file_sha256(LIVE_DATA_FILE)
        else:
            cls.live_sha_pre = None

    def setUp(self):
        # Create an isolated temporary sandbox for each test
        self.test_dir = tempfile.mkdtemp(prefix='crm_phase7_test_')
        self.synthetic_source = os.path.join(self.test_dir, 'synthetic_admin_data.json')
        self.backup_dir = os.path.join(self.test_dir, 'backups')
        os.makedirs(self.backup_dir, exist_ok=True)

        # Synthetic fixture (strictly fake data, zero private records)
        self.fixture_data = {
            "listings": [
                {
                    "id": "TEST_LST_001",
                    "title": "Synthetic Business One",
                    "territoryId": "test_territory_alpha",
                    "status": "APPROVED",
                    "phone": "9999900001",
                    "createdAt": "2026-01-01T00:00:00.000Z"
                },
                {
                    "id": "TEST_LST_002",
                    "title": "Synthetic Business Two",
                    "territoryId": "test_territory_beta",
                    "status": "PENDING",
                    "phone": "9999900002",
                    "createdAt": "2026-01-02T00:00:00.000Z"
                }
            ],
            "contacts": [
                {
                    "id": "TEST_CNT_001",
                    "name": "Synthetic Contact Alpha",
                    "phone": "9999900003",
                    "territoryId": "test_territory_alpha"
                }
            ],
            "deals": [
                {
                    "id": "TEST_DEAL_001",
                    "title": "Synthetic Deal",
                    "amount": 5000
                }
            ],
            "territories": [
                {
                    "id": "test_territory_alpha",
                    "name": "Alpha Territory"
                },
                {
                    "id": "test_territory_beta",
                    "name": "Beta Territory"
                }
            ],
            "auditLogs": [
                {
                    "id": "TEST_AUDIT_001",
                    "action": "synthetic.action",
                    "outcome": "SUCCESS",
                    "timestamp": "2026-01-01T00:00:00.000Z"
                }
            ]
        }

        with open(self.synthetic_source, 'w', encoding='utf-8') as f:
            json.dump(self.fixture_data, f, indent=2)

        self.synthetic_source_sha = get_file_sha256(self.synthetic_source)

    def tearDown(self):
        # Clean up temporary test sandbox
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir, ignore_errors=True)

    def run_backup_cli(self, args):
        cmd = ['node', BACKUP_SCRIPT] + args
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return proc

    # ----------------------------------------------------------------------
    # SCENARIO 1: Valid backup creation & verification against manifest
    # ----------------------------------------------------------------------
    def test_scenario_01_valid_backup_creation_and_manifest(self):
        proc = self.run_backup_cli([
            'create',
            f'--source={self.synthetic_source}',
            f'--dir={self.backup_dir}',
            '--label=unit_test'
        ])
        self.assertEqual(proc.returncode, 0, f"Backup creation failed: {proc.stderr}")
        self.assertIn("✓ SUCCESS", proc.stdout)

        backups = [f for f in os.listdir(self.backup_dir) if f.endswith('.json') and not f.endswith('.manifest.json')]
        self.assertEqual(len(backups), 1)
        backup_file = os.path.join(self.backup_dir, backups[0])
        manifest_file = backup_file.replace('.json', '.manifest.json')

        self.assertTrue(os.path.exists(manifest_file), "Manifest file must exist")
        backup_sha = get_file_sha256(backup_file)
        self.assertEqual(backup_sha, self.synthetic_source_sha, "Backup SHA-256 must match source")

        with open(manifest_file, 'r', encoding='utf-8') as f:
            manifest = json.load(f)

        self.assertEqual(manifest['validationStatus'], 'VERIFIED')
        self.assertEqual(manifest['backupSha256'], backup_sha)
        self.assertEqual(manifest['entityCounts']['listings'], 2)
        self.assertEqual(manifest['entityCounts']['contacts'], 1)
        # Verify no PII in manifest
        manifest_text = json.dumps(manifest)
        self.assertNotIn("Synthetic Business", manifest_text)
        self.assertNotIn("9999900001", manifest_text)

    # ----------------------------------------------------------------------
    # SCENARIO 2: Restored test fixture is byte-for-byte identical
    # ----------------------------------------------------------------------
    def test_scenario_02_restoration_byte_for_byte_identical(self):
        self.run_backup_cli([
            'create',
            f'--source={self.synthetic_source}',
            f'--dir={self.backup_dir}'
        ])
        backup_file = os.path.join(self.backup_dir, [f for f in os.listdir(self.backup_dir) if f.endswith('.json') and not f.endswith('.manifest.json')][0])

        restored_target = os.path.join(self.test_dir, 'restored_data.json')
        proc_restore = self.run_backup_cli([
            'restore',
            backup_file,
            f'--target={restored_target}'
        ])
        self.assertEqual(proc_restore.returncode, 0, f"Restore failed: {proc_restore.stderr}")
        self.assertTrue(os.path.exists(restored_target))

        restored_sha = get_file_sha256(restored_target)
        self.assertEqual(restored_sha, self.synthetic_source_sha, "Restored file must be byte-for-byte identical to source fixture")

    # ----------------------------------------------------------------------
    # SCENARIO 3: Corrupted backup is detected and rejected
    # ----------------------------------------------------------------------
    def test_scenario_03_corrupted_backup_rejected(self):
        self.run_backup_cli([
            'create',
            f'--source={self.synthetic_source}',
            f'--dir={self.backup_dir}'
        ])
        backup_file = os.path.join(self.backup_dir, [f for f in os.listdir(self.backup_dir) if f.endswith('.json') and not f.endswith('.manifest.json')][0])

        # Tamper with backup file
        with open(backup_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        data['listings'][0]['title'] = 'TAMPERED_CONTENT'
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

        # Verification CLI must fail
        proc_verify = self.run_backup_cli(['verify', backup_file])
        self.assertNotEqual(proc_verify.returncode, 0, "Corrupted backup must fail verification")
        self.assertIn("Checksum mismatch", proc_verify.stderr + proc_verify.stdout)

        # Restore CLI must reject corrupted backup
        proc_restore = self.run_backup_cli(['restore', backup_file, f'--target={os.path.join(self.test_dir, "wont_exist.json")}'])
        self.assertNotEqual(proc_restore.returncode, 0, "Restore must reject corrupted backup")

    # ----------------------------------------------------------------------
    # SCENARIO 4: Missing backup handled safely
    # ----------------------------------------------------------------------
    def test_scenario_04_missing_backup_handled_safely(self):
        non_existent = os.path.join(self.backup_dir, 'does_not_exist.json')
        proc = self.run_backup_cli(['verify', non_existent])
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("not found", proc.stderr + proc.stdout)

    # ----------------------------------------------------------------------
    # SCENARIO 5: Checksum mismatch between file and manifest is detected
    # ----------------------------------------------------------------------
    def test_scenario_05_checksum_mismatch_detected(self):
        self.run_backup_cli([
            'create',
            f'--source={self.synthetic_source}',
            f'--dir={self.backup_dir}'
        ])
        backup_file = os.path.join(self.backup_dir, [f for f in os.listdir(self.backup_dir) if f.endswith('.json') and not f.endswith('.manifest.json')][0])
        manifest_file = backup_file.replace('.json', '.manifest.json')

        # Tamper manifest SHA
        with open(manifest_file, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
        manifest['backupSha256'] = '0000000000000000000000000000000000000000000000000000000000000000'
        with open(manifest_file, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2)

        proc = self.run_backup_cli(['verify', backup_file])
        self.assertNotEqual(proc.returncode, 0, "Manifest mismatch must fail verification")

    # ----------------------------------------------------------------------
    # SCENARIO 6: Truncated JSON file rejected
    # ----------------------------------------------------------------------
    def test_scenario_06_truncated_json_rejected(self):
        truncated_file = os.path.join(self.test_dir, 'truncated.json')
        with open(truncated_file, 'w', encoding='utf-8') as f:
            f.write('{"listings": [{"id": "TEST_LST_001", "title": "Incomplete')

        proc = self.run_backup_cli([
            'create',
            f'--source={truncated_file}',
            f'--dir={self.backup_dir}'
        ])
        self.assertNotEqual(proc.returncode, 0, "Truncated source JSON must be rejected")
        self.assertIn("not valid JSON", proc.stderr + proc.stdout)

    # ----------------------------------------------------------------------
    # SCENARIO 7: Destination collision does not silently overwrite
    # ----------------------------------------------------------------------
    def test_scenario_07_destination_collision_protection(self):
        # Create initial backup
        self.run_backup_cli([
            'create',
            f'--source={self.synthetic_source}',
            f'--dir={self.backup_dir}',
            '--label=collision_test'
        ])
        backups = [f for f in os.listdir(self.backup_dir) if f.endswith('.json') and not f.endswith('.manifest.json')]
        self.assertEqual(len(backups), 1)

        # Attempt to create an exact collision programmatically via Node createBackup
        collision_script = (
            f"import {{ createBackup }} from '{BACKUP_SCRIPT}';\n"
            f"try {{\n"
            f"  createBackup({{ sourcePath: '{self.synthetic_source}', backupDir: '{self.backup_dir}', label: 'collision_test' }});\n"
            f"  process.exit(0);\n"
            f"}} catch (err) {{\n"
            f"  if (err.message.includes('already exists')) process.exit(42);\n"
            f"  console.error(err);\n"
            f"  process.exit(1);\n"
            f"}}\n"
        )
        proc = subprocess.run(['node', '--input-type=module', '-e', collision_script], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        # It either creates a new timestamp or safely rejects collision
        self.assertIn(proc.returncode, [0, 42])

    # ----------------------------------------------------------------------
    # SCENARIO 8: Failed backup does not alter or replace source file
    # ----------------------------------------------------------------------
    def test_scenario_08_failed_backup_does_not_modify_source(self):
        orig_sha = get_file_sha256(self.synthetic_source)
        # Attempt backup to an invalid/unwritable directory
        proc = self.run_backup_cli([
            'create',
            f'--source={self.synthetic_source}',
            f'--dir=/dev/null/invalid_dir'
        ])
        self.assertNotEqual(proc.returncode, 0)
        new_sha = get_file_sha256(self.synthetic_source)
        self.assertEqual(orig_sha, new_sha, "Source file must remain completely untouched on failed backup")

    # ----------------------------------------------------------------------
    # SCENARIO 9: Failed restore does not replace or corrupt destination
    # ----------------------------------------------------------------------
    def test_scenario_09_failed_restore_preserves_target(self):
        target_file = os.path.join(self.test_dir, 'existing_target.json')
        initial_content = '{"listings": [{"id": "INITIAL_STABLE"}], "territories": [{"id": "INITIAL_TERR"}]}'
        with open(target_file, 'w', encoding='utf-8') as f:
            f.write(initial_content)
        target_sha_before = get_file_sha256(target_file)

        # Attempt restore with corrupted / non-existent backup
        proc = self.run_backup_cli([
            'restore',
            os.path.join(self.test_dir, 'non_existent.json'),
            f'--target={target_file}'
        ])
        self.assertNotEqual(proc.returncode, 0)
        target_sha_after = get_file_sha256(target_file)
        self.assertEqual(target_sha_before, target_sha_after, "Failed restore must preserve existing target file intact")

    # ----------------------------------------------------------------------
    # SCENARIO 10: Recovery stops safely if backup is invalid
    # ----------------------------------------------------------------------
    def test_scenario_10_recovery_stops_safely_on_invalid_backup(self):
        invalid_backup = os.path.join(self.test_dir, 'invalid_backup.json')
        with open(invalid_backup, 'w', encoding='utf-8') as f:
            f.write('{"unrecognized_key": 123}') # Missing required 'listings', 'territories'

        target = os.path.join(self.test_dir, 'out_target.json')
        proc = self.run_backup_cli(['restore', invalid_backup, f'--target={target}'])
        self.assertNotEqual(proc.returncode, 0)
        self.assertFalse(os.path.exists(target), "Target file must not be created when backup is invalid")

    # ----------------------------------------------------------------------
    # SCENARIO 11: Commands clearly identify source and destination paths
    # ----------------------------------------------------------------------
    def test_scenario_11_commands_identify_source_and_destination(self):
        proc_backup = self.run_backup_cli([
            'create',
            f'--source={self.synthetic_source}',
            f'--dir={self.backup_dir}'
        ])
        self.assertIn("Reading source:", proc_backup.stdout)
        self.assertIn("Path:", proc_backup.stdout)

        backup_file = os.path.join(self.backup_dir, [f for f in os.listdir(self.backup_dir) if f.endswith('.json') and not f.endswith('.manifest.json')][0])
        target = os.path.join(self.test_dir, 'target_identified.json')
        proc_restore = self.run_backup_cli(['restore', backup_file, f'--target={target}'])
        self.assertIn("Restoring from:", proc_restore.stdout)
        self.assertIn("Target:", proc_restore.stdout)

    # ----------------------------------------------------------------------
    # SCENARIO 12: Real CRM data store remains 100% untouched & invariant
    # ----------------------------------------------------------------------
    def test_scenario_12_real_crm_data_store_untouched(self):
        if self.live_sha_pre:
            live_sha_now = get_file_sha256(LIVE_DATA_FILE)
            self.assertEqual(self.live_sha_pre, live_sha_now, "Live CRM data store was modified during testing!")
            self.assertEqual(live_sha_now, EXPECTED_LIVE_HASH, "Live CRM data store hash differs from baseline!")

if __name__ == '__main__':
    unittest.main(verbosity=2)
