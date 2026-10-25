import { NextResponse } from 'next/server'
import { loadStore, saveStore, logAuditEvent, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import { Franchise, Territory, TerritoryDomain, FranchiseStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const store = loadStore()
    const { searchParams } = new URL(req.url)
    const territoryId = searchParams.get('territoryId')

    let franchises = store.franchises || []
    if (territoryId && territoryId !== 'all') {
      franchises = franchises.filter((f) => f.territoryId === territoryId)
    }

    // Network-wide stats
    const totalFranchises = franchises.length
    const activeFranchises = franchises.filter((f) => f.status === 'active').length
    const pendingFranchises = franchises.filter(
      (f) => f.status === 'application_submitted' || f.status === 'under_review' || f.status === 'approved_pending_setup'
    ).length
    const suspendedFranchises = franchises.filter((f) => f.status === 'suspended').length

    return NextResponse.json({
      success: true,
      stats: {
        totalFranchises,
        activeFranchises,
        pendingFranchises,
        suspendedFranchises,
        totalTerritories: (store.territories || []).length,
      },
      franchises,
      territories: store.territories || [],
      domains: store.territoryDomains || [],
      auditLogs: (store.auditLogs || []).slice(0, 50),
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, ...data } = body
    const store = loadStore()

    // ------------------------------------------------------------------------
    // 1. CREATE NEW FRANCHISE & TERRITORY
    // ------------------------------------------------------------------------
    if (action === 'create') {
      const {
        townName,
        district,
        state = 'Telangana',
        pincodes = [],
        localities = [],
        applicantName,
        applicantPhone,
        email,
        experience,
        planTier = 'PRO',
        domain,
        setupFee = 25000,
        monthlyFee = 5000,
        revSharePct = 20,
      } = data

      if (!townName || !applicantName || !applicantPhone) {
        return NextResponse.json(
          { success: false, error: 'Town name, applicant name, and phone are required.' },
          { status: 400 }
        )
      }

      const slug = townName.toLowerCase().replace(/[^a-z0-9]/g, '-')
      const territoryId = `territory_${slug}`

      // COLLISION CHECK 1: Protect Flagship Choutuppal
      if (slug === 'choutuppal' || territoryId === FLAGSHIP_TERRITORY_ID) {
        return NextResponse.json(
          {
            success: false,
            error: 'Choutuppal is the protected flagship company territory and cannot be created as a secondary franchise.',
          },
          { status: 400 }
        )
      }

      // COLLISION CHECK 2: Check territory collision
      const existingTerritory = (store.territories || []).find(
        (t) => t.id === territoryId || t.slug === slug
      )
      if (existingTerritory) {
        return NextResponse.json(
          {
            success: false,
            error: `Territory "${townName}" (${slug}) is already registered and assigned to another franchise.`,
          },
          { status: 400 }
        )
      }

      // COLLISION CHECK 3: Check domain collision
      const primaryDomain = domain?.trim() || `${slug}.choutuppal.in`
      const existingDomain = (store.territoryDomains || []).find(
        (d) => d.domain.toLowerCase() === primaryDomain.toLowerCase()
      )
      if (existingDomain) {
        return NextResponse.json(
          {
            success: false,
            error: `Domain "${primaryDomain}" is already claimed by another territory.`,
          },
          { status: 400 }
        )
      }

      // Create Territory Record
      const newTerritory: Territory = {
        id: territoryId,
        name: `${townName} Town & Region`,
        slug,
        type: 'franchise_operated',
        status: 'active',
        district: district || 'Telangana',
        state,
        pincodes: Array.isArray(pincodes) ? pincodes : [pincodes],
        localities: Array.isArray(localities) ? localities : [localities],
        primaryDomain,
        subdomain: `${slug}.choutuppal.in`,
        isFlagship: false,
        branding: {
          primaryColor: '#0ea5e9',
          tagline: `${townName} Local Business & Services Hub`,
          heroTitle: `${townName} లోకల్ బిజినెస్ & సర్వీసెస్`,
        },
        contactPhone: applicantPhone,
        whatsappNumber: applicantPhone,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Create Franchise Record
      const franchiseId = `fr_${slug}_${Date.now()}`
      const newFranchise: Franchise = {
        id: franchiseId,
        territoryId,
        territoryName: townName,
        territorySlug: slug,
        name: `${townName} SuperApp Franchise`,
        applicantName,
        applicantPhone,
        email,
        experience: experience || 'Business Operator',
        status: 'approved_pending_setup',
        planTier,
        featureLimits: {
          maxListings: planTier === 'ENTERPRISE' ? 2500 : planTier === 'PRO' ? 1000 : 500,
          maxStaff: planTier === 'ENTERPRISE' ? 15 : planTier === 'PRO' ? 8 : 4,
          maxMonthlyBroadcasts: planTier === 'ENTERPRISE' ? 5000 : planTier === 'PRO' ? 2500 : 1000,
          customDomainAllowed: planTier !== 'STARTER',
          aiChatEnabled: true,
        },
        commercialModel: {
          type: 'setup_recurring',
          setupFee: Number(setupFee),
          monthlyFee: Number(monthlyFee),
          revSharePct: Number(revSharePct),
          currency: 'INR',
        },
        assignedDomain: primaryDomain,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Create Territory Domain Record
      const newDomainRecord: TerritoryDomain = {
        id: `dom_${Date.now()}`,
        territoryId,
        domain: primaryDomain,
        type: primaryDomain.endsWith('choutuppal.in') ? 'SUBDOMAIN' : 'PRIMARY',
        isVerified: true,
        sslStatus: 'active',
        createdAt: new Date().toISOString(),
      }

      store.territories.push(newTerritory)
      store.franchises.unshift(newFranchise)
      store.territoryDomains.push(newDomainRecord)

      logAuditEvent({
        actorId: 'super_admin_01',
        actorName: 'Super Administrator',
        actorRole: 'SUPER_ADMIN',
        territoryId,
        action: 'FRANCHISE_CREATED',
        details: `Created franchise "${newFranchise.name}" for territory "${newTerritory.name}" with plan ${planTier}.`,
        metadata: { franchiseId, territoryId, primaryDomain },
      })

      saveStore(store)

      return NextResponse.json({
        success: true,
        message: `Franchise "${townName}" created successfully!`,
        franchise: newFranchise,
        territory: newTerritory,
      })
    }

    // ------------------------------------------------------------------------
    // 2. UPDATE FRANCHISE LIFECYCLE STATUS (ACTIVATE, SUSPEND, REJECT, CLOSE)
    // ------------------------------------------------------------------------
    if (action === 'update_status') {
      const { franchiseId, newStatus, reason } = data

      const franchise = (store.franchises || []).find((f) => f.id === franchiseId)
      if (!franchise) {
        return NextResponse.json({ success: false, error: 'Franchise not found.' }, { status: 404 })
      }

      // Protect flagship
      if (franchise.territoryId === FLAGSHIP_TERRITORY_ID) {
        return NextResponse.json(
          { success: false, error: 'Flagship Choutuppal cannot be suspended or modified.' },
          { status: 403 }
        )
      }

      const oldStatus = franchise.status
      franchise.status = newStatus as FranchiseStatus
      franchise.updatedAt = new Date().toISOString()

      // If activating, set activation timestamp and 1-year expiry
      if (newStatus === 'active' && !franchise.activatedAt) {
        franchise.activatedAt = new Date().toISOString()
        const oneYear = new Date()
        oneYear.setFullYear(oneYear.getFullYear() + 1)
        franchise.expiresAt = oneYear.toISOString()
      }

      // Synchronize territory status
      const territory = (store.territories || []).find((t) => t.id === franchise.territoryId)
      if (territory) {
        if (newStatus === 'suspended' || newStatus === 'closed' || newStatus === 'expired') {
          territory.status = 'suspended'
        } else if (newStatus === 'active') {
          territory.status = 'active'
        }
        territory.updatedAt = new Date().toISOString()
      }

      logAuditEvent({
        actorId: 'super_admin_01',
        actorName: 'Super Administrator',
        actorRole: 'SUPER_ADMIN',
        territoryId: franchise.territoryId,
        action: `FRANCHISE_STATUS_${newStatus.toUpperCase()}`,
        details: `Changed status of franchise "${franchise.name}" from ${oldStatus} to ${newStatus}.${reason ? ` Reason: ${reason}` : ''}`,
        metadata: { franchiseId, oldStatus, newStatus, reason },
      })

      saveStore(store)

      return NextResponse.json({
        success: true,
        message: `Franchise status updated to "${newStatus}".`,
        franchise,
      })
    }

    // ------------------------------------------------------------------------
    // 3. UPDATE PLAN TIER & FEATURE LIMITS
    // ------------------------------------------------------------------------
    if (action === 'update_plan') {
      const { franchiseId, planTier, featureLimits, commercialModel } = data

      const franchise = (store.franchises || []).find((f) => f.id === franchiseId)
      if (!franchise) {
        return NextResponse.json({ success: false, error: 'Franchise not found.' }, { status: 404 })
      }

      if (planTier) franchise.planTier = planTier
      if (featureLimits) franchise.featureLimits = { ...franchise.featureLimits, ...featureLimits }
      if (commercialModel) franchise.commercialModel = { ...franchise.commercialModel, ...commercialModel }
      franchise.updatedAt = new Date().toISOString()

      logAuditEvent({
        actorId: 'super_admin_01',
        actorName: 'Super Administrator',
        actorRole: 'SUPER_ADMIN',
        territoryId: franchise.territoryId,
        action: 'FRANCHISE_PLAN_UPDATED',
        details: `Updated plan for franchise "${franchise.name}" to ${franchise.planTier}.`,
        metadata: { franchiseId, planTier, featureLimits },
      })

      saveStore(store)

      return NextResponse.json({
        success: true,
        message: 'Franchise plan updated successfully.',
        franchise,
      })
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
