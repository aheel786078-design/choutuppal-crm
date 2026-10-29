import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { loadStore, saveStore, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import {
  filterAndSortGovtContacts,
  findGovtContactDuplicates,
  isValidIndianPhoneNumber,
  isContactVerificationOverdue,
} from '@/lib/government-contacts'
import { requireAuth, requireTerritoryAccess } from '@/lib/auth-server'
import { GOVT_CONTACT_CATEGORIES, CHOUTUPPAL_MANDAL_VILLAGES } from '@/lib/constants'
import type { GovernmentContact, AuditLog, GovtContactCategory, GovtContactStatus, GovtSourceType } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse
    const user = auth.user

    const store = loadStore()
    const url = new URL(req.url)

    const category = url.searchParams.get('category') || undefined
    const village = url.searchParams.get('village') || undefined
    const search = url.searchParams.get('search') || undefined
    const statusParam = (url.searchParams.get('status') as GovtContactStatus | 'all') || 'all'
    const requestedTerritory = url.searchParams.get('territoryId') || undefined

    // Super Admin can see all territories; Franchise Admins are restricted to their territory
    const territoryId = user.role === 'SUPER_ADMIN' ? requestedTerritory : user.territoryId

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '50', 10) || 50))

    const allContacts = store.governmentContacts || []

    const result = filterAndSortGovtContacts(allContacts, {
      publicOnly: false,
      status: statusParam,
      category,
      village,
      search,
      territoryId,
      page,
      pageSize,
    })

    // Compute status counts for Admin metrics
    const scopedList = territoryId && territoryId !== 'all'
      ? allContacts.filter((c) => (c.territoryId || FLAGSHIP_TERRITORY_ID) === territoryId)
      : allContacts

    const stats = {
      total: scopedList.length,
      published: scopedList.filter((c) => c.status === 'published').length,
      verified: scopedList.filter((c) => c.status === 'verified').length,
      pending: scopedList.filter((c) => c.status === 'pending_verification').length,
      draft: scopedList.filter((c) => c.status === 'draft').length,
      archived: scopedList.filter((c) => c.status === 'archived').length,
      overdue: scopedList.filter((c) => isContactVerificationOverdue(c)).length,
      emergency: scopedList.filter((c) => c.isEmergency).length,
    }

    return NextResponse.json({
      success: true,
      contacts: result.items,
      stats,
      categories: GOVT_CONTACT_CATEGORIES,
      villages: CHOUTUPPAL_MANDAL_VILLAGES,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse
    const user = auth.user

    const body = await req.json()
    const {
      name,
      designation,
      category,
      subcategory,
      phoneNumber,
      alternatePhoneNumber,
      email,
      officeAddress,
      district = 'Yadadri Bhuvanagiri',
      mandal = 'Choutuppal',
      village,
      ward,
      officeHours,
      availability = 'office_hours',
      sourceType = 'official_website',
      sourceUrl,
      sourceReference,
      status = 'draft',
      isEmergency = false,
      isPublicContact = true,
      displayOrder = 100,
      territoryId = FLAGSHIP_TERRITORY_ID,
      notes,
    } = body

    // 1. Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 })
    }
    if (!designation || typeof designation !== 'string' || !designation.trim()) {
      return NextResponse.json({ success: false, error: 'Designation is required' }, { status: 400 })
    }
    if (!category || !GOVT_CONTACT_CATEGORIES.some((c) => c.id === category)) {
      return NextResponse.json({ success: false, error: 'Valid category is required' }, { status: 400 })
    }

    // Phone number format validation if provided
    if (phoneNumber && !isValidIndianPhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number or emergency short code format' },
        { status: 400 }
      )
    }

    // 2. Territory permission check
    const targetTerritory = user.role === 'SUPER_ADMIN' ? (territoryId || FLAGSHIP_TERRITORY_ID) : user.territoryId
    const terrCheck = await requireTerritoryAccess(req, targetTerritory)
    if (terrCheck.errorResponse) return terrCheck.errorResponse

    const store = loadStore()
    if (!store.governmentContacts) store.governmentContacts = []
    if (!store.auditLogs) store.auditLogs = []

    // 3. Duplicate check warning
    const candidate: Partial<GovernmentContact> = {
      name: name.trim(),
      category: category as GovtContactCategory,
      village,
      phoneNumber,
      alternatePhoneNumber,
    }
    const duplicates = findGovtContactDuplicates(candidate, store.governmentContacts)

    const now = new Date().toISOString()
    const id = `govt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`

    // New contacts are created as 'draft' or 'pending_verification' by default
    // Cannot directly create as 'published' without verification
    const safeInitialStatus: GovtContactStatus =
      status === 'published' ? 'pending_verification' : (status as GovtContactStatus) || 'draft'

    const newContact: GovernmentContact = {
      id,
      name: name.trim(),
      designation: designation.trim(),
      category: category as GovtContactCategory,
      subcategory: subcategory?.trim(),
      phoneNumber: phoneNumber?.trim(),
      alternatePhoneNumber: alternatePhoneNumber?.trim(),
      email: email?.trim(),
      officeAddress: officeAddress?.trim(),
      district: district.trim(),
      mandal: mandal.trim(),
      village: village?.trim(),
      ward: ward?.trim(),
      officeHours: officeHours?.trim(),
      availability,
      sourceType: sourceType as GovtSourceType,
      sourceUrl: sourceUrl?.trim(),
      sourceReference: sourceReference?.trim(),
      status: safeInitialStatus,
      isEmergency: Boolean(isEmergency),
      isPublicContact: Boolean(isPublicContact),
      displayOrder: Number(displayOrder) || 100,
      territoryId: targetTerritory,
      notes: notes?.trim(),
      createdAt: now,
      updatedAt: now,
      createdBy: user.userId || user.phone,
      updatedBy: user.userId || user.phone,
    }

    store.governmentContacts.push(newContact)

    // Append audit log
    const audit: AuditLog = {
      id: `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      actorId: user.userId || user.phone,
      actorName: user.phone,
      actorRole: user.role,
      territoryId: targetTerritory,
      action: 'GOVT_CONTACT_CREATED',
      details: `Created government contact ${newContact.name} (${newContact.designation}) in ${newContact.category}`,
      metadata: { contactId: id, status: safeInitialStatus, duplicatesCount: duplicates.length },
      createdAt: now,
    }
    store.auditLogs.push(audit)

    saveStore(store)

    return NextResponse.json({
      success: true,
      contact: newContact,
      hasDuplicates: duplicates.length > 0,
      duplicateWarnings: duplicates.map((d) => ({ id: d.id, name: d.name, phone: d.phoneNumber })),
      message: 'Government contact created successfully',
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create government contact' },
      { status: 500 }
    )
  }
}
