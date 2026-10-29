/**
 * ============================================================================
 * CHOUTUPPAL CRM — STAGING ENVIRONMENT VERIFIER
 * ============================================================================
 * Security Safeguards:
 * 1. Strictly asserts that target project is NOT production (llcfxewxqrmdzlvnzzxm).
 * 2. Never prints credentials, service role keys, or secrets to terminal/logs.
 * 3. Verifies URL structure, key lengths, and network connectivity.
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_PROJECT_REF = 'llcfxewxqrmdzlvnzzxm';

export function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

export async function verifyStagingEnv() {
  console.log('======================================================================');
  console.log('CHOUTUPPAL CRM — STAGING ENVIRONMENT VERIFIER');
  console.log('======================================================================\n');

  const stagingPath = path.resolve(process.cwd(), '.env.staging');
  const stagingLocalPath = path.resolve(process.cwd(), '.env.staging.local');
  const targetPath = fs.existsSync(stagingPath) ? stagingPath : (fs.existsSync(stagingLocalPath) ? stagingLocalPath : null);

  if (!targetPath) {
    console.log('[STATUS: NOT CONFIGURED] No .env.staging file found.');
    console.log('\nTo configure your separate Supabase staging project:');
    console.log('1. Copy the template:');
    console.log('   cp .env.staging.example .env.staging');
    console.log('2. Create your staging project on Supabase Dashboard (see instructions).');
    console.log('3. Add your staging project ref and keys into .env.staging.');
    return { configured: false, error: 'File .env.staging not found' };
  }

  const env = parseEnvFile(targetPath);
  const projectRef = env.STAGING_SUPABASE_PROJECT_REF;
  const url = env.STAGING_SUPABASE_URL;
  const anonKey = env.STAGING_SUPABASE_ANON_KEY;
  const serviceKey = env.STAGING_SUPABASE_SERVICE_ROLE_KEY;

  console.log(`Checking config file: ${path.basename(targetPath)}`);

  // 1. Production Reference Safeguard
  if (projectRef === PRODUCTION_PROJECT_REF || (url && url.includes(PRODUCTION_PROJECT_REF))) {
    console.error('\n[FATAL SECURITY VIOLATION] Staging environment points to PRODUCTION reference:');
    console.error(`  Reference: ${PRODUCTION_PROJECT_REF}`);
    console.error('  Execution IMMEDIATELY HALTED to protect production database!\n');
    process.exit(1);
  }

  // 2. Placeholder Check
  if (!projectRef || projectRef.includes('your-staging') || projectRef.includes('your-project')) {
    console.log('\n[STATUS: PLACEHOLDER DETECTED] STAGING_SUPABASE_PROJECT_REF is still set to placeholder.');
    console.log('Please enter your actual staging project reference in .env.staging.');
    return { configured: false, error: 'Placeholder detected' };
  }

  // 3. URL Format Check
  if (!url || !url.startsWith('https://') || !url.endsWith('.supabase.co')) {
    console.error(`\n[ERROR] Invalid STAGING_SUPABASE_URL: "${url}"`);
    console.error('Must be in format: https://<staging-ref>.supabase.co');
    return { configured: false, error: 'Invalid URL format' };
  }

  // 4. Safe Diagnostic Report (Zero Secret Leaks)
  console.log('\nSanitized Diagnostic Report:');
  console.log(`  - Target Project Ref: ${projectRef} [VERIFIED: DIFFERENT FROM PRODUCTION]`);
  console.log(`  - Target Host URL:    ${url}`);
  console.log(`  - Anon Key:           ${anonKey ? `[CONFIGURED, length=${anonKey.length}]` : '[MISSING]'}`);
  console.log(`  - Service Role Key:   ${serviceKey ? `[CONFIGURED, length=${serviceKey.length}]` : '[MISSING]'}`);

  if (!anonKey || !serviceKey) {
    console.log('\n[INCOMPLETE] Please supply both STAGING_SUPABASE_ANON_KEY and STAGING_SUPABASE_SERVICE_ROLE_KEY.');
    return { configured: false, error: 'Missing keys' };
  }

  // 5. Connectivity Ping
  console.log('\nTesting staging project REST connectivity...');
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    if (res.ok || res.status === 200 || res.status === 404) {
      console.log(`[CONNECTIVITY OK] HTTP ${res.status} from ${url}`);
      console.log('Staging Supabase project is active and reachable!\n');
      return { configured: true, projectRef, url };
    } else {
      console.warn(`[WARNING] Received unexpected HTTP status ${res.status}: ${res.statusText}`);
      return { configured: true, projectRef, url, warning: `HTTP ${res.status}` };
    }
  } catch (netErr) {
    console.error(`[NETWORK ERROR] Could not reach staging endpoint: ${netErr.message}`);
    return { configured: false, error: netErr.message };
  }
}

verifyStagingEnv().catch(err => {
  console.error('[EXECUTION ERROR]:', err.message);
});
