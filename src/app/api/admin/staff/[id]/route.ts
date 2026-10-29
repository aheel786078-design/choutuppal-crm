import { NextRequest, NextResponse } from 'next/server'
import { loadStore, saveStore, logAuditEvent, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import type { FranchiseStaff } from '@/lib/types'
import { requireAuth, requireTerritoryAccess } from '@/lib/auth-server'
import { normalizeIndianPhoneNumber } from '@/lib/crm-duplicates'

export const dynamic = 'force-dynamic'

const VALID_ROLES = ['FRANCHISE_ADMIN', 'FRANCHISE_REVIEWER', 'FRANCHISE_STAFF'] as const
const VALID_STATUSES = ['ACTIVE', 'INVITED', 'SUSPENDED'] as const

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const { id } = await params
    const store = loadStore()
    const staff = (store.franchiseStaff || []).find((s) => s.id === id)

    if (!staff) {
      return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 })
    }

    const territoryCheck = await requireTerritoryAccess(req, staff.territoryId || FLAGSHIP_TERRITORY_ID)
    if (territoryCheck.errorResponse) return territoryCheck.errorResponse

    return NextResponse.json({ success: true, staff })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdate(req, params)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdate(req, params)
}

async function handleUpdate(
  req: NextRequest,
  paramsPromise: Promise<{ id: string }>
) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const { id } = await paramsPromise
    const isSuperAdmin = auth.user.role === 'SUPER_ADMIN'
    const isFranchiseAdmin = auth.user.role === 'FRANCHISE_ADMIN'

    if (!isSuperAdmin && !isFranchiseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient privileges.' },
        { status: 403 }
      )
    }

    const store = loadStore()
    const staffList = store.franchiseStaff || []
    const idx = staffList.findIndex((s) => s.id === id)

    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 })
    }

    const existing = staffList[idx]
    const targetTerritory = existing.territoryId || FLAGSHIP_TERRITORY_ID

    const access = await requireTerritoryAccess(req, targetTerritory)
    if (access.errorResponse) return access.errorResponse

    const body = await req.json()
    const updates: Partial<FranchiseStaff> = {}

    if (body.name && typeof body.name === 'string' && body.name.trim().length >= 2) {
      updates.name = body.name.trim()
    }

    if (body.email !== undefined) {
      updates.email = String(body.email).trim().toLowerCase()
    }

    if (body.role && VALID_ROLES.includes(body.role)) {
      updates.role = body.role
    }

    if (body.status && VALID_STATUSES.includes(body.status)) {
      updates.status = body.status
    }

    if (Array.isArray(body.permissions)) {
      updates.permissions = body.permissions
    }

    if (body.phone) {
      const normPhone = normalizeIndianPhoneNumber(body.phone)
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
          { success: false, error: 'Phone number already registered to another staff member.' },
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
      details: `Updated staff ${existing.name} (${id}): status=${updatedStaff.status}, role=${updatedStaff.role}`,
      territoryId: targetTerritory,
      metadata: { staffId: id, status: updatedStaff.status, role: updatedStaff.role },
    })

    return NextResponse.json({
      success: true,
      message: 'Staff member updated successfully.',
      staff: updatedStaff,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const store = loadStore()
    const staffList = store.franchiseStaff || []
    const existing = staffList.find((s) => s.id === id)

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 })
    }

    const targetTerritory = existing.territoryId || FLAGSHIP_TERRITORY_ID
    const access = await requireTerritoryAccess(req, targetTerritory)
    if (access.errorResponse) return access.errorResponse

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
      details: `Removed staff member ${existing.name} (${id})`,
      territoryId: targetTerritory,
      metadata: { staffId: id },
    })

    return NextResponse.json({
      success: true,
      message: 'Staff member removed successfully.',
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
