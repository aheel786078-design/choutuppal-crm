#!/usr/bin/env node
/**
 * ============================================================================
 * CHOUTUPPAL FRANCHISE CRM — PHASE 7 BACKUP & RECOVERY MANAGER
 * ============================================================================
 * Reliable, non-destructive local backup, verification, and disaster recovery.
 * Uses atomic temp-file writes, SHA-256 integrity validation, structural checks,
 * and PII-free metadata manifests.
 *
 * Usage:
 *   node scripts/backup-manager.mjs create [--source=path] [--dir=path] [--label=name]
 *   node scripts/backup-manager.mjs verify <backup-file>
 *   node scripts/backup-manager.mjs restore <backup-file> --target=<target-file> [--force]
 *   node scripts/backup-manager.mjs list [--dir=path]
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const DEFAULT_SOURCE = path.resolve(process.cwd(), 'data', 'admin_data.json');
const DEFAULT_BACKUP_DIR = path.resolve(process.cwd(), 'data', 'backups');

const REQUIRED_TOP_LEVEL_KEYS = ['listings', 'territories'];

/**
 * Calculates SHA-256 checksum of a buffer or string.
 */
export function calculateSha256(content) {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Validates top-level JSON structure and extracts entity counts (safe aggregate numbers only).
 */
export function validateStoreStructure(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid JSON store: Root must be a non-null object.');
  }

  for (const key of REQUIRED_TOP_LEVEL_KEYS) {
    if (!Array.isArray(data[key]) || data[key].length === 0) {
      throw new Error(`Invalid JSON store: Required array "${key}" is missing or empty.`);
    }
  }

  const entityCounts = {};
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) {
      entityCounts[key] = val.length;
    } else if (val && typeof val === 'object') {
      entityCounts[key] = Object.keys(val).length;
    }
  }

  return { isValid: true, entityCounts };
}

/**
 * Creates a verified timestamped backup of a JSON data file with companion manifest.
 */
export function createBackup({
  sourcePath = DEFAULT_SOURCE,
  backupDir = DEFAULT_BACKUP_DIR,
  label = '',
} = {}) {
  const resolvedSource = path.resolve(sourcePath);
  const resolvedDir = path.resolve(backupDir);

  if (!fs.existsSync(resolvedSource)) {
    throw new Error(`Backup failed: Source file does not exist: "${resolvedSource}"`);
  }

  const sourceBytes = fs.readFileSync(resolvedSource);
  if (sourceBytes.length === 0) {
    throw new Error(`Backup failed: Source file is empty (0 bytes): "${resolvedSource}"`);
  }

  const sourceSha256 = calculateSha256(sourceBytes);

  let parsedData;
  try {
    parsedData = JSON.parse(sourceBytes.toString('utf-8'));
  } catch (err) {
    throw new Error(`Backup failed: Source file is not valid JSON: ${err.message}`);
  }

  const { entityCounts } = validateStoreStructure(parsedData);

  if (!fs.existsSync(resolvedDir)) {
    fs.mkdirSync(resolvedDir, { recursive: true });
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestampStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const shaPrefix = sourceSha256.substring(0, 8);
  const cleanLabel = label ? `_${label.replace(/[^a-zA-Z0-9_-]/g, '')}` : '';

  const backupFilename = `admin_data_${timestampStr}${cleanLabel}_${shaPrefix}.json`;
  const manifestFilename = `admin_data_${timestampStr}${cleanLabel}_${shaPrefix}.manifest.json`;

  const backupPath = path.join(resolvedDir, backupFilename);
  const manifestPath = path.join(resolvedDir, manifestFilename);

  if (fs.existsSync(backupPath)) {
    throw new Error(`Backup failed: Destination file already exists: "${backupPath}"`);
  }

  // 1. Atomic write to temporary file in the destination directory
  const tempBackupPath = path.join(resolvedDir, `.tmp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${backupFilename}`);
  try {
    fs.writeFileSync(tempBackupPath, sourceBytes);
    
    // 2. Verify temporary file checksum
    const tempBytes = fs.readFileSync(tempBackupPath);
    const tempSha256 = calculateSha256(tempBytes);
    if (tempSha256 !== sourceSha256) {
      throw new Error(`Backup verification failed: Temp file checksum mismatch (expected ${sourceSha256}, got ${tempSha256})`);
    }

    // 3. Rename to final destination
    fs.renameSync(tempBackupPath, backupPath);
  } catch (err) {
    if (fs.existsSync(tempBackupPath)) {
      try { fs.unlinkSync(tempBackupPath); } catch (_) {}
    }
    throw err;
  }

  // 4. Double-check final written backup
  const writtenBytes = fs.readFileSync(backupPath);
  const backupSha256 = calculateSha256(writtenBytes);
  if (backupSha256 !== sourceSha256) {
    try { fs.unlinkSync(backupPath); } catch (_) {}
    throw new Error(`Backup verification failed: Destination checksum mismatch after write.`);
  }

  // 5. Re-parse written backup JSON
  try {
    const rechecked = JSON.parse(writtenBytes.toString('utf-8'));
    validateStoreStructure(rechecked);
  } catch (err) {
    try { fs.unlinkSync(backupPath); } catch (_) {}
    throw new Error(`Backup verification failed: Written backup failed JSON re-validation: ${err.message}`);
  }

  // 6. Generate and write companion manifest (NO PII, safe metadata only)
  const manifest = {
    manifestVersion: '1.0',
    backupFile: backupFilename,
    sourceFile: path.basename(resolvedSource),
    timestamp: now.toISOString(),
    sourceSha256,
    backupSha256,
    fileSizeBytes: writtenBytes.length,
    isValidJson: true,
    validationStatus: 'VERIFIED',
    entityCounts,
  };

  const tempManifestPath = `${manifestPath}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tempManifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    fs.renameSync(tempManifestPath, manifestPath);
  } catch (err) {
    if (fs.existsSync(tempManifestPath)) {
      try { fs.unlinkSync(tempManifestPath); } catch (_) {}
    }
    throw err;
  }

  return {
    success: true,
    backupPath,
    manifestPath,
    backupFilename,
    sourceSha256,
    backupSha256,
    fileSizeBytes: writtenBytes.length,
    entityCounts,
  };
}

/**
 * Verifies a backup file against its companion manifest and structural requirements.
 */
export function verifyBackup(backupPath) {
  const resolved = path.resolve(backupPath);
  if (!fs.existsSync(resolved)) {
    return { isValid: false, error: `Backup file not found: "${resolved}"` };
  }

  const bytes = fs.readFileSync(resolved);
  if (bytes.length === 0) {
    return { isValid: false, error: 'Backup file is empty (0 bytes).' };
  }

  const currentSha256 = calculateSha256(bytes);

  let data;
  try {
    data = JSON.parse(bytes.toString('utf-8'));
  } catch (err) {
    return { isValid: false, error: `JSON parse error: ${err.message}` };
  }

  let validation;
  try {
    validation = validateStoreStructure(data);
  } catch (err) {
    return { isValid: false, error: `Structural validation error: ${err.message}` };
  }

  // Check companion manifest if available
  const manifestPath = resolved.replace(/\.json$/, '.manifest.json');
  let manifestChecked = false;
  let manifestMatch = false;

  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      manifestChecked = true;
      if (manifest.backupSha256 === currentSha256) {
        manifestMatch = true;
      } else {
        return {
          isValid: false,
          error: `Checksum mismatch with manifest! File: ${currentSha256}, Manifest: ${manifest.backupSha256}`,
        };
      }
    } catch (err) {
      return { isValid: false, error: `Corrupt manifest file: ${err.message}` };
    }
  }

  return {
    isValid: true,
    file: resolved,
    sha256: currentSha256,
    fileSizeBytes: bytes.length,
    manifestChecked,
    manifestMatch,
    entityCounts: validation.entityCounts,
  };
}

/**
 * Restores a backup file to an explicit target destination with atomic safety and snapshot.
 */
export function restoreBackup({
  backupPath,
  targetPath,
  createSafetySnapshot = true,
} = {}) {
  if (!backupPath) {
    throw new Error('Restore failed: backupPath is required.');
  }
  if (!targetPath) {
    throw new Error('Restore failed: targetPath is required. Refusing to restore without an explicit target.');
  }

  const resolvedBackup = path.resolve(backupPath);
  const resolvedTarget = path.resolve(targetPath);

  // 1. Verify backup file health first
  const verification = verifyBackup(resolvedBackup);
  if (!verification.isValid) {
    throw new Error(`Restore rejected: Backup verification failed: ${verification.error}`);
  }

  const backupBytes = fs.readFileSync(resolvedBackup);
  const backupSha256 = calculateSha256(backupBytes);

  const targetDir = path.dirname(resolvedTarget);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 2. If target exists, take a safety snapshot before modifying
  let snapshotPath = null;
  if (fs.existsSync(resolvedTarget) && createSafetySnapshot) {
    const existingBytes = fs.readFileSync(resolvedTarget);
    const existingSha256 = calculateSha256(existingBytes);
    snapshotPath = path.join(targetDir, `${path.basename(resolvedTarget)}.pre_restore.${Date.now()}_${existingSha256.substring(0, 8)}.bak`);
    fs.writeFileSync(snapshotPath, existingBytes);
  }

  // 3. Write restored data to temporary file in target directory
  const tempTargetPath = path.join(targetDir, `.tmp_restore_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.json`);
  try {
    fs.writeFileSync(tempTargetPath, backupBytes);

    // Verify temp file matches backup checksum
    const writtenSha256 = calculateSha256(fs.readFileSync(tempTargetPath));
    if (writtenSha256 !== backupSha256) {
      throw new Error(`Restore failed: Written temp file checksum mismatch (expected ${backupSha256}, got ${writtenSha256})`);
    }

    // Atomic rename to final target
    fs.renameSync(tempTargetPath, resolvedTarget);
  } catch (err) {
    if (fs.existsSync(tempTargetPath)) {
      try { fs.unlinkSync(tempTargetPath); } catch (_) {}
    }
    throw new Error(`Restore failed during write/rename: ${err.message}`);
  }

  // 4. Verify restored file
  const restoredBytes = fs.readFileSync(resolvedTarget);
  const restoredSha256 = calculateSha256(restoredBytes);
  if (restoredSha256 !== backupSha256) {
    throw new Error('Restore failed: Final restored target checksum does not match backup checksum.');
  }

  return {
    success: true,
    restoredFrom: resolvedBackup,
    targetPath: resolvedTarget,
    sha256: restoredSha256,
    safetySnapshot: snapshotPath,
    entityCounts: verification.entityCounts,
  };
}

/**
 * Lists backups in the backup directory with verification status.
 */
export function listBackups(backupDir = DEFAULT_BACKUP_DIR) {
  const resolvedDir = path.resolve(backupDir);
  if (!fs.existsSync(resolvedDir)) {
    return [];
  }

  const files = fs.readdirSync(resolvedDir).filter((f) => f.endsWith('.json') && !f.endsWith('.manifest.json') && !f.startsWith('.tmp'));
  const results = [];

  for (const f of files.sort().reverse()) {
    const filePath = path.join(resolvedDir, f);
    const verifyResult = verifyBackup(filePath);
    results.push({
      filename: f,
      filePath,
      isValid: verifyResult.isValid,
      sha256: verifyResult.sha256 || 'N/A',
      fileSizeBytes: verifyResult.fileSizeBytes || 0,
      manifestChecked: verifyResult.manifestChecked || false,
      error: verifyResult.error,
    });
  }

  return results;
}

/**
 * Copies a verified backup and its companion manifest to a separate private destination.
 * Safe, atomic, and strictly non-destructive (never deletes source backup, never uploads to cloud).
 */
export function copyBackup({
  backupPath,
  destDir,
  force = false,
} = {}) {
  if (!backupPath) {
    throw new Error('Copy failed: backupPath is required.');
  }
  if (!destDir) {
    throw new Error('Copy failed: destDir is required.');
  }

  const resolvedBackup = path.resolve(backupPath);
  const resolvedDestDir = path.resolve(destDir);

  // 1. Verify source backup before copying
  const verification = verifyBackup(resolvedBackup);
  if (!verification.isValid) {
    throw new Error(`Copy rejected: Source backup verification failed: ${verification.error}`);
  }

  // 2. Ensure destination directory exists (or create it safely)
  if (!fs.existsSync(resolvedDestDir)) {
    fs.mkdirSync(resolvedDestDir, { recursive: true });
  }

  const backupFilename = path.basename(resolvedBackup);
  const destBackupPath = path.join(resolvedDestDir, backupFilename);

  if (fs.existsSync(destBackupPath) && !force) {
    throw new Error(`Copy rejected: Destination backup already exists: "${destBackupPath}". Use --force to overwrite.`);
  }

  const backupBytes = fs.readFileSync(resolvedBackup);
  const sourceSha256 = calculateSha256(backupBytes);

  // 3. Atomic copy of backup file via temp file in destination directory
  const tempDestBackup = path.join(resolvedDestDir, `.tmp_copy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${backupFilename}`);
  try {
    fs.writeFileSync(tempDestBackup, backupBytes);
    const tempSha = calculateSha256(fs.readFileSync(tempDestBackup));
    if (tempSha !== sourceSha256) {
      throw new Error(`Copy verification failed: Destination temp checksum mismatch.`);
    }
    fs.renameSync(tempDestBackup, destBackupPath);
  } catch (err) {
    if (fs.existsSync(tempDestBackup)) {
      try { fs.unlinkSync(tempDestBackup); } catch (_) {}
    }
    throw err;
  }

  // 4. Copy companion manifest if it exists
  const sourceManifestPath = resolvedBackup.replace(/\.json$/, '.manifest.json');
  let manifestCopied = false;
  let destManifestPath = null;

  if (fs.existsSync(sourceManifestPath)) {
    const manifestFilename = path.basename(sourceManifestPath);
    destManifestPath = path.join(resolvedDestDir, manifestFilename);
    const manifestBytes = fs.readFileSync(sourceManifestPath);
    const tempManifest = path.join(resolvedDestDir, `.tmp_copy_${Date.now()}_${manifestFilename}`);
    try {
      fs.writeFileSync(tempManifest, manifestBytes);
      fs.renameSync(tempManifest, destManifestPath);
      manifestCopied = true;
    } catch (err) {
      if (fs.existsSync(tempManifest)) {
        try { fs.unlinkSync(tempManifest); } catch (_) {}
      }
      throw err;
    }
  }

  // 5. Final health check on copied backup in destination
  const finalVerify = verifyBackup(destBackupPath);
  if (!finalVerify.isValid) {
    throw new Error(`Copy rejected: Post-copy verification of destination file failed: ${finalVerify.error}`);
  }

  return {
    success: true,
    sourcePath: resolvedBackup,
    destPath: destBackupPath,
    destManifestPath,
    sha256: sourceSha256,
    fileSizeBytes: backupBytes.length,
    manifestCopied,
    entityCounts: verification.entityCounts,
  };
}

// ----------------------------------------------------------------------------
// CLI COMMAND RUNNER
// ----------------------------------------------------------------------------
function printUsage() {
  console.log(`
Choutuppal Franchise CRM — Backup & Recovery Manager
Usage:
  node scripts/backup-manager.mjs create [--source=path] [--dir=path] [--label=name]
  node scripts/backup-manager.mjs verify <backup-path>
  node scripts/backup-manager.mjs restore <backup-path> --target=<target-path>
  node scripts/backup-manager.mjs copy <backup-path> --dest=<dir-path> [--force]
  node scripts/backup-manager.mjs list [--dir=path]
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    process.exit(0);
  }

  const getArg = (prefix) => {
    const arg = args.find((a) => a.startsWith(prefix));
    return arg ? arg.substring(prefix.length) : undefined;
  };

  try {
    switch (command) {
      case 'create': {
        const sourcePath = getArg('--source=') || DEFAULT_SOURCE;
        const backupDir = getArg('--dir=') || DEFAULT_BACKUP_DIR;
        const label = getArg('--label=') || '';

        console.log(`[Backup] Reading source: "${sourcePath}"`);
        const result = createBackup({ sourcePath, backupDir, label });
        console.log(`[Backup] ✓ SUCCESS: Created backup "${result.backupFilename}"`);
        console.log(`  Path:     ${result.backupPath}`);
        console.log(`  Manifest: ${result.manifestPath}`);
        console.log(`  SHA-256:  ${result.backupSha256}`);
        console.log(`  Size:     ${(result.fileSizeBytes / 1024).toFixed(1)} KB`);
        console.log(`  Entities: Listings=${result.entityCounts.listings}, Contacts=${result.entityCounts.contacts}, Territories=${result.entityCounts.territories}`);
        break;
      }

      case 'verify': {
        const backupPath = args[1];
        if (!backupPath) {
          console.error('[Verify] Error: Missing backup file argument.');
          printUsage();
          process.exit(1);
        }
        console.log(`[Verify] Checking: "${backupPath}"`);
        const result = verifyBackup(backupPath);
        if (result.isValid) {
          console.log(`[Verify] ✓ VALID: Checksum and structure verified.`);
          console.log(`  SHA-256:  ${result.sha256}`);
          console.log(`  Manifest: ${result.manifestChecked ? (result.manifestMatch ? 'MATCHED' : 'MISMATCH') : 'Not present'}`);
          console.log(`  Entities: Listings=${result.entityCounts.listings}, Contacts=${result.entityCounts.contacts}`);
        } else {
          console.error(`[Verify] ✗ INVALID: ${result.error}`);
          process.exit(1);
        }
        break;
      }

      case 'restore': {
        const backupPath = args[1];
        const targetPath = getArg('--target=');
        if (!backupPath || !targetPath) {
          console.error('[Restore] Error: Both <backup-file> and --target=<path> are required.');
          printUsage();
          process.exit(1);
        }
        console.log(`[Restore] Restoring from: "${backupPath}"`);
        console.log(`[Restore] Target:         "${targetPath}"`);
        const result = restoreBackup({ backupPath, targetPath });
        console.log(`[Restore] ✓ SUCCESS: Target restored successfully.`);
        console.log(`  SHA-256:  ${result.sha256}`);
        if (result.safetySnapshot) {
          console.log(`  Snapshot: ${result.safetySnapshot}`);
        }
        break;
      }

      case 'copy': {
        const backupPath = args[1];
        const destDir = getArg('--dest=');
        const force = args.includes('--force');
        if (!backupPath || !destDir) {
          console.error('[Copy] Error: Both <backup-file> and --dest=<directory> are required.');
          printUsage();
          process.exit(1);
        }
        console.log(`[Copy] Verifying source: "${backupPath}"`);
        console.log(`[Copy] Destination dir:  "${destDir}"`);
        const result = copyBackup({ backupPath, destDir, force });
        console.log(`[Copy] ✓ SUCCESS: Backup verified and copied to destination.`);
        console.log(`  Source:      ${result.sourcePath}`);
        console.log(`  Destination: ${result.destPath}`);
        console.log(`  Manifest:    ${result.manifestCopied ? 'Copied and Verified' : 'None'}`);
        console.log(`  SHA-256:     ${result.sha256}`);
        console.log(`  Size:        ${(result.fileSizeBytes / 1024).toFixed(1)} KB`);
        console.log(`  Entities:    Listings=${result.entityCounts.listings}, Contacts=${result.entityCounts.contacts}`);
        break;
      }

      case 'list': {
        const backupDir = getArg('--dir=') || DEFAULT_BACKUP_DIR;
        console.log(`[List] Backups in "${backupDir}":`);
        const backups = listBackups(backupDir);
        if (backups.length === 0) {
          console.log('  No backup files found.');
        } else {
          for (const b of backups) {
            const status = b.isValid ? '✓ VALID' : '✗ CORRUPT';
            console.log(`  - ${b.filename} [${status}] (${(b.fileSizeBytes / 1024).toFixed(1)} KB) SHA: ${b.sha256.substring(0, 12)}...`);
          }
        }
        break;
      }

      default:
        console.error(`Unknown command: "${command}"`);
        printUsage();
        process.exit(1);
    }
  } catch (err) {
    console.error(`[Error] ${err.message}`);
    process.exit(1);
  }
}

// Only invoke CLI if executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
