/**
 * ============================================================================
 * CHOUTUPPAL CRM — SUPABASE SCHEMA MIGRATION APPLIER
 * ============================================================================
 * Applies the verified master schema / migrations to the connected Supabase project.
 * Uses the authenticated Supabase Management API query endpoint.
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'llcfxewxqrmdzlvnzzxm';
const MANAGEMENT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';

async function executeSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MANAGEMENT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(`SQL execution failed (HTTP ${res.status}): ${typeof data === 'object' ? JSON.stringify(data) : text}`);
  }

  return data;
}

async function applyMigrations() {
  console.log('======================================================================');
  console.log('CHOUTUPPAL CRM — SUPABASE SCHEMA MIGRATION ENGINE');
  console.log(`Target Project: ${PROJECT_REF}`);
  console.log('======================================================================\n');

  const migrationFiles = [
    'supabase/migrations/01_core_platform_schema.sql',
    'supabase/migrations/02_crm_whatsapp_schema.sql',
    'supabase/migrations/03_content_monetization_schema.sql',
    'supabase/migrations/04_rls_security_policies.sql',
  ];

  for (const relPath of migrationFiles) {
    const absPath = path.resolve(process.cwd(), relPath);
    console.log(`Applying: ${relPath} ...`);
    const sql = fs.readFileSync(absPath, 'utf-8');

    try {
      await executeSql(sql);
      console.log(`  ✔ SUCCESS: ${path.basename(relPath)} applied cleanly.\n`);
    } catch (err) {
      console.error(`  ✖ ERROR applying ${relPath}:`, err.message);
      process.exit(1);
    }
  }

  console.log('--- Post-Migration Database Audit ---');
  // 1. List created tables
  const tables = await executeSql(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  console.log(`[OK] Total Tables Created in public schema: ${tables.length}`);
  for (const t of tables) {
    console.log(`  - ${t.table_name}`);
  }

  // 2. Check RLS status
  const rlsStatus = await executeSql(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);

  const rlsEnabledCount = rlsStatus.filter(r => r.rowsecurity).length;
  console.log(`\n[OK] Tables with Row Level Security Enabled: ${rlsEnabledCount} / ${rlsStatus.length}`);

  // 3. Check security helper functions
  const funcs = await executeSql(`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name IN ('current_territory_id', 'is_super_admin', 'log_audit_event')
    ORDER BY routine_name;
  `);
  console.log(`[OK] Security Definer Helper Functions Created: ${funcs.map(f => f.routine_name).join(', ')}`);

  console.log('\n======================================================================');
  console.log('SCHEMA MIGRATION COMPLETED SUCCESSFULLY!');
  console.log('======================================================================\n');
}

applyMigrations().catch(err => {
  console.error('[FATAL MIGRATION FAILURE]:', err.message);
  process.exit(1);
});
