import { getSupabaseAdminClient } from '@/lib/supabase.ts'

async function setupUsers() {
  const supabase = getSupabaseAdminClient()
  if (!supabase) {
    console.error('Supabase admin client not available')
    process.exit(1)
  }

  const usersToProvision = [
    {
      email: 'admin@choutuppal.in',
      password: 'Choutuppal@2026',
      phone: '9441348175',
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      territoryId: 'territory_choutuppal',
      franchiseId: null,
    },
    {
      email: 'operator@choutuppal.in',
      password: 'Choutuppal@2026',
      phone: '9494348175',
      name: 'Choutuppal Platform Operator',
      role: 'PLATFORM_OPERATOR',
      territoryId: 'territory_choutuppal',
      franchiseId: null,
    },
    {
      email: 'nalgonda.admin@choutuppal.in',
      password: 'Nalgonda@2026',
      phone: '9848012345',
      name: 'Nalgonda Franchise Admin',
      role: 'FRANCHISE_ADMIN',
      territoryId: 'territory_nalgonda',
      franchiseId: 'fr_nalgonda_1793019978034',
    },
    {
      email: 'suryapet.admin@choutuppal.in',
      password: 'Suryapet@2026',
      phone: '9848098765',
      name: 'Suryapet Franchise Admin',
      role: 'FRANCHISE_ADMIN',
      territoryId: 'territory_suryapet',
      franchiseId: 'fr_1',
    },
  ]

  console.log('======================================================================')
  console.log('CHOUTUPPAL CRM — SUPABASE AUTH & PROFILES PROVISIONING')
  console.log('======================================================================\n')

  const { data: listData, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) {
    console.error('Error listing existing users:', listErr.message)
    process.exit(1)
  }
  const existingUsers = listData?.users || []

  for (const u of usersToProvision) {
    let authUser = existingUsers.find((x) => x.email === u.email || x.phone === u.phone)

    if (!authUser) {
      console.log(`[+] Creating Supabase Auth user: ${u.email} (${u.role})...`)
      const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        phone: u.phone,
        phone_confirm: true,
        user_metadata: {
          name: u.name,
          role: u.role,
          territory_id: u.territoryId,
          franchise_id: u.franchiseId,
        },
      })

      if (createErr) {
        console.error(`  ❌ Failed to create auth user ${u.email}:`, createErr.message)
        continue
      }
      authUser = createData.user
      console.log(`  ✔ Created auth user ID: ${authUser.id}`)
    } else {
      console.log(`[*] User already exists in auth: ${u.email} (${authUser.id})`)
      // Update password to ensure it matches
      await supabase.auth.admin.updateUserById(authUser.id, {
        password: u.password,
        user_metadata: {
          name: u.name,
          role: u.role,
          territory_id: u.territoryId,
          franchise_id: u.franchiseId,
        },
      })
    }

    if (authUser?.id) {
      // Upsert profile in public.profiles table
      const { error: profErr } = await supabase.from('profiles').upsert(
        {
          id: authUser.id,
          phone: u.phone,
          full_name: u.name,
          role: u.role,
          territory_id: u.territoryId,
          franchise_id: u.franchiseId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

      if (profErr) {
        console.error(`  ❌ Failed to upsert profile for ${u.email}:`, profErr.message)
      } else {
        console.log(`  ✔ Profile synchronized in public.profiles: ${u.name} [${u.role}]`)
      }
    }
  }

  console.log('\n======================================================================')
  console.log('PROVISIONING COMPLETE')
  console.log('======================================================================')
}

setupUsers().catch(console.error)
