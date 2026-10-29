import assert from 'assert'
import { POST as loginPOST } from '../src/app/api/auth/login/route.ts'
import { POST as registerPOST } from '../src/app/api/auth/register/route.ts'
import { GET as meGET } from '../src/app/api/auth/me/route.ts'
import { POST as logoutPOST } from '../src/app/api/auth/logout/route.ts'
import { POST as magicPOST, GET as magicGET } from '../src/app/api/auth/magic-link/route.ts'
import { SESSION_COOKIE_NAME, verifySignedSessionToken } from '../src/lib/auth-server.ts'
import { loadStore, saveStore } from '../src/lib/store.ts'
import { getSupabaseAdminClient } from '../src/lib/supabase.ts'

let passCount = 0
let failCount = 0

function logPass(msg) {
  passCount++
  console.log(`  ✔ PASS: ${msg}`)
}

function logFail(msg, err) {
  failCount++
  console.error(`  ❌ FAIL: ${msg} - ${err}`)
}

async function runTests() {
  console.log('======================================================================')
  console.log('CHOUTUPPAL CRM — COMPLETE AUTHENTICATION & REGISTRATION TEST SUITE')
  console.log('======================================================================\n')

  // -------------------------------------------------------------------------
  // TEST GROUP 1: Super Admin Login via Email & Password
  // -------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Super Admin Login ---')
  try {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@choutuppal.in',
        password: 'Choutuppal@2026',
      }),
    })
    const res = await loginPOST(req)
    const json = await res.json()

    assert.strictEqual(res.status, 200, 'Status should be 200')
    assert.strictEqual(json.success, true, 'success should be true')
    assert.strictEqual(json.user.role, 'SUPER_ADMIN', 'Role should be SUPER_ADMIN')
    assert.strictEqual(json.user.phone, '9441348175', 'Phone should match Super Admin')
    assert.strictEqual(json.redirect, '/admin/dashboard', 'Should redirect to /admin/dashboard')

    const cookieHeader = res.headers.get('set-cookie') || ''
    assert(cookieHeader.includes(SESSION_COOKIE_NAME), 'Must set session_token cookie')
    logPass('Super Admin signs in with email & password, receives SUPER_ADMIN role & session cookie')
  } catch (err) {
    logFail('Super Admin login', err.message)
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 2: Super Admin Login via Phone & Password
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Super Admin Login via Phone ---')
  try {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '9441348175',
        password: 'Choutuppal@2026',
      }),
    })
    const res = await loginPOST(req)
    const json = await res.json()

    assert.strictEqual(res.status, 200)
    assert.strictEqual(json.user.role, 'SUPER_ADMIN')
    logPass('Super Admin signs in with 10-digit phone & password')
  } catch (err) {
    logFail('Super Admin phone login', err.message)
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 3: Franchise Admin Login & Scoping (Nalgonda & Suryapet)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Multi-Tenant Franchise Admin Logins ---')
  let nalgondaCookie = ''
  try {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nalgonda.admin@choutuppal.in',
        password: 'Nalgonda@2026',
      }),
    })
    const res = await loginPOST(req)
    const json = await res.json()

    assert.strictEqual(res.status, 200)
    assert.strictEqual(json.user.role, 'FRANCHISE_ADMIN')
    assert.strictEqual(json.user.territoryId, 'territory_nalgonda')
    nalgondaCookie = res.headers.get('set-cookie')?.split(';')[0] || ''
    logPass('Nalgonda Franchise Admin scoped to territory_nalgonda with FRANCHISE_ADMIN role')
  } catch (err) {
    logFail('Nalgonda admin login', err.message)
  }

  try {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'suryapet.admin@choutuppal.in',
        password: 'Suryapet@2026',
      }),
    })
    const res = await loginPOST(req)
    const json = await res.json()

    assert.strictEqual(res.status, 200)
    assert.strictEqual(json.user.role, 'FRANCHISE_ADMIN')
    assert.strictEqual(json.user.territoryId, 'territory_suryapet')
    logPass('Suryapet Franchise Admin scoped to territory_suryapet with FRANCHISE_ADMIN role')
  } catch (err) {
    logFail('Suryapet admin login', err.message)
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 4: Invalid Credentials Rejection
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Security Invariants & Rejection ---')
  try {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@choutuppal.in',
        password: 'WrongPassword123!',
      }),
    })
    const res = await loginPOST(req)
    assert.strictEqual(res.status, 401)
    const json = await res.json()
    assert.strictEqual(json.success, false)
    logPass('Invalid password rejected with HTTP 401 Unauthorized')
  } catch (err) {
    logFail('Invalid password rejection', err.message)
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 5: Current Session Resolution (/api/auth/me)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Session Verification (/api/auth/me) ---')
  try {
    // Unauthenticated request
    const unauthReq = new Request('http://localhost:3000/api/auth/me')
    const unauthRes = await meGET(unauthReq)
    const unauthJson = await unauthRes.json()
    assert.strictEqual(unauthJson.authenticated, false)
    logPass('Unauthenticated caller returns authenticated: false')

    // Authenticated request with Nalgonda cookie
    if (nalgondaCookie) {
      const authReq = new Request('http://localhost:3000/api/auth/me', {
        headers: { Cookie: nalgondaCookie },
      })
      const authRes = await meGET(authReq)
      const authJson = await authRes.json()
      assert.strictEqual(authJson.authenticated, true)
      assert.strictEqual(authJson.user.role, 'FRANCHISE_ADMIN')
      assert.strictEqual(authJson.user.territoryId, 'territory_nalgonda')
      logPass('Authenticated caller successfully resolves session user role & territory')
    }
  } catch (err) {
    logFail('Session verification', err.message)
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 6: Merchant Registration (/api/auth/register)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Merchant Registration & Auto-Provisioning ---')
  const testPhone = '9848' + Math.floor(100000 + Math.random() * 900000)
  const testEmail = `ravi.test.${testPhone}@gmail.com`
  try {
    const regReq = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ravi Teja Test',
        businessName: 'Ravi Spares & Mechanics',
        phone: testPhone,
        email: testEmail,
        password: 'Password@2026',
        categoryId: 'cat-automotive',
        villageId: 'v-choutuppal',
        villageName: 'చౌటుప్పల్ (Choutuppal)',
      }),
    })
    const regRes = await registerPOST(regReq)
    const regJson = await regRes.json()

    assert.strictEqual(regRes.status, 200)
    assert.strictEqual(regJson.success, true)
    assert.strictEqual(regJson.user.role, 'MERCHANT')
    assert.strictEqual(regJson.redirect, '/admin/listings')
    const regCookie = regRes.headers.get('set-cookie') || ''
    assert(regCookie.includes(SESSION_COOKIE_NAME), 'Registration must issue session cookie')
    logPass('Merchant registers, auto-provisions listing lead, establishes active session & redirects to /admin/listings')
  } catch (err) {
    logFail('Merchant registration', err.message)
  }

  // Test duplicate registration rejection
  try {
    const dupReq = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ravi Duplicate',
        businessName: 'Duplicate Shop',
        phone: testPhone,
        email: 'duplicate@gmail.com',
        password: 'Password@2026',
      }),
    })
    const dupRes = await registerPOST(dupReq)
    assert.strictEqual(dupRes.status, 409)
    logPass('Duplicate phone number registration rejected with HTTP 409 Conflict')
  } catch (err) {
    logFail('Duplicate registration rejection', err.message)
  }

  // Clean up test merchant data from store and database
  try {
    const store = loadStore()
    store.contacts = (store.contacts || []).filter((c) => c.phone !== testPhone)
    store.listings = (store.listings || []).filter((l) => l.phone !== testPhone)
    store.users = (store.users || []).filter((u) => u.phone !== testPhone)
    saveStore(store)

    const supabase = getSupabaseAdminClient()
    if (supabase) {
      await supabase.from('contacts').delete().eq('phone', testPhone)
      await supabase.from('listings').delete().eq('phone', testPhone)
      await supabase.from('profiles').delete().eq('phone', testPhone)
    }
  } catch {}

  // -------------------------------------------------------------------------
  // TEST GROUP 7: Session Logout (/api/auth/logout)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Sign Out & Cookie Clearance ---')
  try {
    const logoutRes = await logoutPOST()
    const logoutJson = await logoutRes.json()
    assert.strictEqual(logoutJson.success, true)
    const setCookie = logoutRes.headers.get('set-cookie') || ''
    assert(setCookie.includes('Max-Age=0') || setCookie.includes('max-age=0') || setCookie.includes('expires='), 'Logout must clear session cookie')
    logPass('Logout successfully clears session cookie and establishes clean signed-out state')
  } catch (err) {
    logFail('Logout', err.message)
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 8: 1-Click WhatsApp Magic Link Authentication
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: WhatsApp 1-Click Magic Link Protocol ---')
  try {
    const genReq = new Request('http://localhost:3000/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9441348175' }),
    })
    const genRes = await magicPOST(genReq)
    const genJson = await genRes.json()
    assert.strictEqual(genRes.status, 200)
    assert(genJson.token, 'Must return cryptographic magic token')

    // Redeem token
    const redeemReq = new Request(`http://localhost:3000/api/auth/magic-link?token=${encodeURIComponent(genJson.token)}`)
    const redeemRes = await magicGET(redeemReq)
    const redeemJson = await redeemRes.json()
    assert.strictEqual(redeemJson.success, true)
    assert.strictEqual(redeemJson.role, 'SUPER_ADMIN')
    const magicCookie = redeemRes.headers.get('set-cookie') || ''
    assert(magicCookie.includes(SESSION_COOKIE_NAME), 'Magic link redemption must establish session cookie')
    logPass('WhatsApp 1-click token generated and redeemed into authenticated Super Admin session')
  } catch (err) {
    logFail('WhatsApp magic link protocol', err.message)
  }

  console.log('\n======================================================================')
  console.log(`AUTH TEST SUITE COMPLETE: ${passCount} PASSED, ${failCount} FAILED`)
  console.log('======================================================================')

  if (failCount > 0) {
    process.exit(1)
  }
}

runTests().catch(console.error)
