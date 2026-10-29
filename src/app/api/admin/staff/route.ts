import { NextResponse } from 'next/server'
import { loadStore, saveStore, logAuditEvent, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import type { FranchiseStaff } from '@/lib/types'
import { requireAuth, requireTerritoryAccess } from '@/lib/auth-server'
import { normalizeIndianPhoneNumber, maskPhoneNumber } from '@/lib/crm-duplicates'

export const dynamic = 'force-dynamic'

const VALID_ROLES = ['FRANCHISE_ADMIN', 'FRANCHISE_REVIEWER', 'FRANCHISE_STAFF'] as const
const VALID_STATUSES = ['ACTIVE', 'INVITED', 'SUSPENDED'] as const

/**
 * GET /api/admin/staff
 * Lists franchise staff with search, role, status filtering, and pagination.
 * Scoped strictly to the caller's territory for Franchise Admins.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const isSuperAdmin = auth.user.role === 'SUPER_ADMIN'
    const isFranchiseAdmin = auth.user.role === 'FRANCHISE_ADMIN'

    if (!isSuperAdmin && !isFranchiseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient privileges to view staff accounts.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const search = (searchParams.get('search') || '').trim().toLowerCase()
    const roleFilter = searchParams.get('role')
    const statusFilter = searchParams.get('status')
    const franchiseFilter = searchParams.get('franchiseId')
    const territoryFilter = searchParams.get('territoryId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)))

    const store = loadStore()
    let staffList = [...(store.franchiseStaff || [])]

    // Territory Scoping: Non-super admins can only see staff in their assigned territory
    if (!isSuperAdmin) {
      staffList = staffList.filter((s) => (s.territoryId || FLAGSHIP_TERRITORY_ID) === auth.user.territoryId)
    } else if (territoryFilter && territoryFilter !== 'all') {
      staffList = staffList.filter((s) => (s.territoryId || FLAGSHIP_TERRITORY_ID) === territoryFilter)
    }

    // Franchise Filter
    if (franchiseFilter && franchiseFilter !== 'all') {
      staffList = staffList.filter((s) => s.franchiseId === franchiseFilter)
    }

    // Role Filter
    if (roleFilter && roleFilter !== 'all') {
      staffList = staffList.filter((s) => s.role === roleFilter)
    }

    // Status Filter
    if (statusFilter && statusFilter !== 'all') {
      staffList = staffList.filter((s) => s.status === statusFilter)
    }

    // Text Search
    if (search) {
      staffList = staffList.filter((s) => {
        const nameMatch = (s.name || '').toLowerCase().includes(search)
        const phoneMatch = (s.phone || '').includes(search)
        const emailMatch = (s.email || '').toLowerCase().includes(search)
        return nameMatch || phoneMatch || emailMatch
      })
    }

    const total = staffList.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const paginatedStaff = staffList.slice(startIndex, startIndex + limit)

    // Provide relevant franchises and territories for filter dropdowns
    const accessibleTerritories = isSuperAdmin
      ? store.territories || []
      : (store.territories || []).filter((t) => t.id === auth.user.territoryId)

    const accessibleFranchises = isSuperAdmin
      ? store.franchises || []
      : (store.franchises || []).filter((f) => f.territoryId === auth.user.territoryId)

    return NextResponse.json({
      success: true,
      staff: paginatedStaff,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      meta: {
        isSuperAdmin,
        callerTerritoryId: auth.user.territoryId,
        franchises: accessibleFranchises.map((f) => ({ id: f.id, name: f.name, territoryId: f.territoryId })),
        territories: accessibleTerritories.map((t) => ({ id: t.id, name: t.name })),
        authMechanism: 'Phone-based session token. Outbound SMTP invitation email is not configured.',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

/**
 * POST /api/admin/staff
 * Creates a new franchise staff member account.
 * Enforces role restrictions, territory boundary checks, and privilege escalation guards.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const isSuperAdmin = auth.user.role === 'SUPER_ADMIN'
    const isFranchiseAdmin = auth.user.role === 'FRANCHISE_ADMIN'

    if (!isSuperAdmin && !isFranchiseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient privileges to create staff accounts.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const name = (body.name || '').trim()
    const rawPhone = (body.phone || '').trim()
    const email = (body.email || '').trim().toLowerCase()
    const role = body.role as FranchiseStaff['role']
    let franchiseId = (body.franchiseId || '').trim()
    let territoryId = (body.territoryId || '').trim()

    // 1. Validate Name
    if (!name || name.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Staff Name must be at least 2 characters.' },
        { status: 400 }
      )
    }

    // 2. Validate Phone
    const normalizedPhone = normalizeIndianPhoneNumber(rawPhone)
    if (!normalizedPhone || normalizedPhone.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid 10-digit Indian phone number.' },
        { status: 400 }
      )
    }

    // 3. Validate Role
    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid role "${role}". Allowed roles: ${VALID_ROLES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // 4. Privilege Escalation Prevention:
    // Franchise Admin can only create FRANCHISE_STAFF or FRANCHISE_REVIEWER, or another FRANCHISE_ADMIN in their own franchise
    // And cannot create global roles
    const store = loadStore()

    // If franchiseId not provided, locate first franchise in caller's territory
    if (!franchiseId) {
      const matchFranchise = (store.franchises || []).find((f) =>
        isSuperAdmin ? true : f.territoryId === auth.user.territoryId
      )
      if (matchFranchise) {
        franchiseId = matchFranchise.id
        territoryId = matchFranchise.territoryId
      } else {
        franchiseId = isSuperAdmin ? 'fr_default' : `fr_${auth.user.territoryId}`
        territoryId = auth.user.territoryId || FLAGSHIP_TERRITORY_ID
      }
    } else {
      // Find matching franchise to verify territory
      const targetFranchise = (store.franchises || []).find((f) => f.id === franchiseId)
      if (targetFranchise) {
        territoryId = targetFranchise.territoryId
      }
    }

    if (!territoryId) {
      territoryId = isSuperAdmin ? FLAGSHIP_TERRITORY_ID : auth.user.territoryId
    }

    // Enforce territory isolation
    if (!isSuperAdmin && territoryId !== auth.user.territoryId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: You cannot assign staff to a franchise outside your territory.',
        },
        { status: 403 }
      )
    }

    // 5. Check if staff with this phone already exists in this franchise/territory
    const existingStaff = (store.franchiseStaff || []).find(
      (s) => normalizeIndianPhoneNumber(s.phone) === normalizedPhone
    )

    if (existingStaff) {
      return NextResponse.json(
        {
          success: false,
          error: `A staff member with phone ${maskPhoneNumber(normalizedPhone)} already exists (${existingStaff.name} - ${existingStaff.role}).`,
        },
        { status: 409 }
      )
    }

    // 6. Assign default permissions based on role
    const permissions: string[] = Array.isArray(body.permissions) && body.permissions.length > 0
      ? body.permissions
      : role === 'FRANCHISE_ADMIN'
      ? ['listings.manage', 'listings.approve', 'contacts.manage', 'deals.manage', 'staff.manage', 'reports.view']
      : role === 'FRANCHISE_REVIEWER'
      ? ['listings.review', 'listings.view', 'contacts.view']
      : ['listings.create', 'listings.edit', 'contacts.manage']

    const status: FranchiseStaff['status'] = VALID_STATUSES.includes(body.status) ? body.status : 'ACTIVE'

    const newStaff: FranchiseStaff = {
      id: `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      franchiseId,
      territoryId,
      userId: `usr_${normalizedPhone}`,
      name,
      phone: normalizedPhone,
      email,
      role,
      permissions,
      status,
      createdAt: new Date().toISOString(),
    }

    if (!store.franchiseStaff) {
      store.franchiseStaff = []
    }
    store.franchiseStaff.unshift(newStaff)
    saveStore(store)

    // Audit Log
    logAuditEvent({
      actorId: auth.user.userId,
      actorName: auth.user.phone,
      actorRole: auth.user.role,
      action: 'staff.created',
      entityType: 'staff',
      entityId: newStaff.id,
      outcome: 'SUCCESS',
      details: `Created staff member ${name} (${maskPhoneNumber(normalizedPhone)}) with role ${role} for franchise ${franchiseId}`,
      territoryId,
      metadata: { staffId: newStaff.id, role, franchiseId },
    })

    return NextResponse.json({
      success: true,
      message: 'Staff member account created successfully.',
      staff: newStaff,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

/**
 * PUT /api/admin/staff
 * Updates staff member details, role, permissions, or status.
 */
export async function PUT(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const isSuperAdmin = auth.user.role === 'SUPER_ADMIN'
    const isFranchiseAdmin = auth.user.role === 'FRANCHISE_ADMIN'

    if (!isSuperAdmin && !isFranchiseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient privileges to update staff accounts.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Staff ID is required.' }, { status: 400 })
    }

    const store = loadStore()
    const staffList = store.franchiseStaff || []
    const idx = staffList.findIndex((s) => s.id === id)

    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 })
    }

    const existing = staffList[idx]
    const targetTerritory = existing.territoryId || FLAGSHIP_TERRITORY_ID

    // Territory Access Guard
    const access = await requireTerritoryAccess(req, targetTerritory)
    if (access.errorResponse) return access.errorResponse

    // Franchise Admin cannot reassign staff to a different territory or franchise
    if (!isSuperAdmin) {
      delete updates.territoryId
      delete updates.franchiseId
    }

    // Role validation
    if (updates.role && !VALID_ROLES.includes(updates.role)) {
      return NextResponse.json(
        { success: false, error: `Invalid role "${updates.role}".` },
        { status: 400 }
      )
    }

    // Status validation
    if (updates.status && !VALID_STATUSES.includes(updates.status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status "${updates.status}".` },
        { status: 400 }
      )
    }

    // Phone normalization & uniqueness check if phone is being changed
    if (updates.phone) {
      const normPhone = normalizeIndianPhoneNumber(updates.phone)
      if (!normPhone || normPhone.length !== 10) {
        return NextResponse.json(
          { success: false, error: 'Please provide a valid 10-digit Indian phone number.' },
          { status: 400 }
        )
      }
      const duplicate = staffList.find(
        (s) => s.id !== id && normalizeIndianPhoneNumber(s.phone) === normPhone
      )
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: `Phone number is already assigned to another staff member (${duplicate.name}).` },
          { status: 409 }
        )
      }
      updates.phone = normPhone
      updates.userId = `usr_${normPhone}`
    }

    const updatedStaff: FranchiseStaff = {
      ...existing,
      ...updates,
    }

    store.franchiseStaff[idx] = updatedStaff
    saveStore(store)

    logAuditEvent({
      actorId: auth.user.userId,
      actorName: auth.user.phone,
      actorRole: auth.user.role,
      action: 'staff.updated',
      entityType: 'staff',
      entityId: id,
      outcome: 'SUCCESS',
      details: `Updated staff ${existing.name} (${id}) - status: ${updatedStaff.status}, role: ${updatedStaff.role}`,
      territoryId: targetTerritory,
      metadata: { staffId: id, status: updatedStaff.status, role: updatedStaff.role },
    })

    return NextResponse.json({
      success: true,
      message: 'Staff account updated successfully.',
      staff: updatedStaff,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/staff?id=...
 * Removes a staff member account.
 */
export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const isSuperAdmin = auth.user.role === 'SUPER_ADMIN'
    const isFranchiseAdmin = auth.user.role === 'FRANCHISE_ADMIN'

    if (!isSuperAdmin && !isFranchiseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient privileges.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Staff ID is required.' }, { status: 400 })
    }

    const store = loadStore()
    const staffList = store.franchiseStaff || []
    const existing = staffList.find((s) => s.id === id)

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 })
    }

    const targetTerritory = existing.territoryId || FLAGSHIP_TERRITORY_ID
    const access = await requireTerritoryAccess(req, targetTerritory)
    if (access.errorResponse) return access.errorResponse

    // Prevent self-deletion
    if (auth.user.phone === existing.phone || auth.user.userId === existing.userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own active administrator account.' },
        { status: 400 }
      )
    }

    store.franchiseStaff = staffList.filter((s) => s.id !== id)
    saveStore(store)

    logAuditEvent({
      actorId: auth.user.userId,
      actorName: auth.user.phone,
      actorRole: auth.user.role,
      action: 'staff.deleted',
      entityType: 'staff',
      entityId: id,
      outcome: 'SUCCESS',
      details: `Removed staff member ${existing.name} (${id}) from franchise ${existing.franchiseId}`,
      territoryId: targetTerritory,
      metadata: { staffId: id, franchiseId: existing.franchiseId },
    })

    return NextResponse.json({
      success: true,
      message: 'Staff member removed successfully.',
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
