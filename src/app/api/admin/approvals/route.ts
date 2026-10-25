import { NextResponse } from 'next/server'
import { loadStore, saveStore, syncListingToCrm, generateMagicToken, FLAGSHIP_TERRITORY_ID, logAuditEvent } from '@/lib/store'
import { ApprovalItem, Listing, Territory, Franchise, TerritoryDomain } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const store = loadStore()
    const { searchParams } = new URL(req.url)
    const territoryId = searchParams.get('territoryId')

    let approvals = store.approvals || []
    if (territoryId && territoryId !== 'all') {
      approvals = approvals.filter((a) => (a.territoryId || FLAGSHIP_TERRITORY_ID) === territoryId)
    }

    const pendingApprovals = approvals.filter((a) => a.status === 'pending')

    return NextResponse.json({
      success: true,
      approvals,
      pendingCount: pendingApprovals.length,
      counts: {
        pending: pendingApprovals.length,
        approved: approvals.filter((a) => a.status === 'approved').length,
        rejected: approvals.filter((a) => a.status === 'rejected').length,
        changes_requested: approvals.filter((a) => a.status === 'changes_requested').length,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, action, adminNotes } = body

    if (!id || !action) {
      return NextResponse.json({ success: false, error: 'ID and action are required' }, { status: 400 })
    }

    const store = loadStore()
    const item = store.approvals.find((a) => a.id === id)

    if (!item) {
      return NextResponse.json({ success: false, error: 'Approval item not found' }, { status: 404 })
    }

    item.reviewedAt = new Date().toISOString()
    item.adminNotes = adminNotes || ''
    const itemTerritoryId = item.territoryId || FLAGSHIP_TERRITORY_ID

    if (action === 'approve') {
      item.status = 'approved'

      // Execute specific publication by type
      if (item.type === 'NEW_LISTING') {
        const d = item.data
        const townSuffix = itemTerritoryId.replace('territory_', '')
        const cleanSlug = `${d.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${townSuffix}`
        const newListing: Listing = {
          id: `lst_${Date.now()}`,
          territoryId: itemTerritoryId,
          slug: cleanSlug,
          title: d.title,
          description: d.description || '',
          status: 'published',
          type: 'BUSINESS',
          isFeatured: true,
          isPremium: false,
          coverImage: item.mediaUrl || 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=800',
          gallery: [item.mediaUrl || 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=800'],
          phone: d.phone,
          whatsapp: d.whatsapp || d.phone,
          address: d.address || 'Town Center',
          price: d.price || 'Available',
          categoryId: 'cat-services',
          categoryName: d.category || 'Services',
          villageId: `v-${townSuffix}`,
          villageName: `${townSuffix.toUpperCase()} Region`,
          views: 0,
          clicks: 0,
          whatsappClicks: 0,
          syncedToCrm: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        syncListingToCrm(newListing)

        // Log WhatsApp confirmation
        store.messages.unshift({
          id: `msg_${Date.now()}`,
          phone: item.submitterPhone,
          contactName: item.submitterName,
          direction: 'outbound',
          messageText: `🎉 అభినందనలు ${item.submitterName} గారు! మీ '${d.title}' లిస్టింగ్ అడ్మిన్ ఆమోదం పొంది వెబ్‌సైట్ మరియు వాట్సాప్ బాట్‌లో లైవ్ చేయబడింది!\n\n🌐 లైవ్ ప్రొఫైల్: https://choutuppal.in/business/${cleanSlug}`,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        logAuditEvent({
          actorId: 'admin',
          actorName: 'Admin',
          actorRole: 'FRANCHISE_ADMIN',
          territoryId: itemTerritoryId,
          action: 'LISTING_APPROVED',
          details: `Approved listing "${d.title}" in territory ${itemTerritoryId}`,
          metadata: { listingId: newListing.id, title: d.title },
        })
      } else if (item.type === 'STORY') {
        store.stories.unshift({
          id: `st_${Date.now()}`,
          territoryId: itemTerritoryId,
          businessId: 'lst_user',
          businessName: item.data.businessName || item.title,
          ownerPhone: item.submitterPhone,
          mediaUrl: item.mediaUrl || '',
          caption: item.data.caption || '',
          status: 'published',
          expiresAt: item.data.expiresAt || new Date(Date.now() + 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        })

        store.messages.unshift({
          id: `msg_${Date.now()}`,
          phone: item.submitterPhone,
          contactName: item.submitterName,
          direction: 'outbound',
          messageText: `✅ మీ స్టోరీ ప్రమోషన్ ఆమోదించబడింది మరియు 24 గంటల పాటు యాప్‌లో లైవ్ చేయబడింది!`,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })
      } else if (item.type === 'FRANCHISE_APP') {
        const proposedTown = item.data.proposedArea || 'New Town'
        const slug = proposedTown.toLowerCase().replace(/[^a-z0-9]/g, '-')
        const newTerritoryId = `territory_${slug}`
        const magicToken = generateMagicToken(item.submitterPhone)

        // Check if territory doesn't collide with existing
        const existingTerritory = (store.territories || []).find((t) => t.id === newTerritoryId || t.slug === slug)
        if (!existingTerritory) {
          const newTerr: Territory = {
            id: newTerritoryId,
            name: `${proposedTown} Town & Region`,
            slug,
            type: 'franchise_operated',
            status: 'active',
            district: item.data.district || 'Telangana',
            state: 'Telangana',
            pincodes: [],
            localities: [proposedTown],
            primaryDomain: `${slug}.choutuppal.in`,
            subdomain: `${slug}.choutuppal.in`,
            isFlagship: false,
            branding: {
              primaryColor: '#0ea5e9',
              tagline: `${proposedTown} SuperApp Hub`,
              heroTitle: `${proposedTown} లోకల్ బిజినెస్`,
            },
            contactPhone: item.submitterPhone,
            whatsappNumber: item.submitterPhone,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          store.territories.push(newTerr)
        }

        const newFranchise: Franchise = {
          id: `fr_${slug}_${Date.now()}`,
          territoryId: newTerritoryId,
          territoryName: proposedTown,
          territorySlug: slug,
          name: `${proposedTown} SuperApp Franchise`,
          applicantName: item.submitterName,
          applicantPhone: item.submitterPhone,
          email: item.data.email || '',
          experience: item.data.experience || 'Business Operator',
          status: 'active',
          planTier: 'PRO',
          featureLimits: {
            maxListings: 1000,
            maxStaff: 8,
            maxMonthlyBroadcasts: 2500,
            customDomainAllowed: true,
            aiChatEnabled: true,
          },
          commercialModel: {
            type: 'setup_recurring',
            setupFee: 25000,
            monthlyFee: 5000,
            revSharePct: 20,
            currency: 'INR',
          },
          assignedDomain: `${slug}.choutuppal.in`,
          activatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        store.franchises.unshift(newFranchise)

        store.messages.unshift({
          id: `msg_${Date.now()}`,
          phone: item.submitterPhone,
          contactName: item.submitterName,
          direction: 'outbound',
          messageText: `🚀 అభినందనలు! మీ '${proposedTown}' ఫ్రాంచైజీ దరఖాస్తు ఆమోదించబడింది మరియు యాక్టివేట్ చేయబడింది.\n\nమీ ఫ్రాంచైజీ అడ్మిన్ డ్యాష్‌బోర్డ్ తెరవడానికి క్రింది సురక్షిత లాగిన్ లింక్ ఉపయోగించండి (15 నిమిషాల వ్యవధి):\n🔑 https://choutuppal.in/login?magic=${magicToken}&territory=${slug}`,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        logAuditEvent({
          actorId: 'super_admin_01',
          actorName: 'Super Administrator',
          actorRole: 'SUPER_ADMIN',
          territoryId: newTerritoryId,
          action: 'FRANCHISE_APPLICATION_APPROVED',
          details: `Approved franchise application for ${proposedTown} from ${item.submitterName}`,
          metadata: { applicantPhone: item.submitterPhone, territoryId: newTerritoryId },
        })
      }
    } else if (action === 'request_changes') {
      item.status = 'changes_requested'
      store.messages.unshift({
        id: `msg_${Date.now()}`,
        phone: item.submitterPhone,
        contactName: item.submitterName,
        direction: 'outbound',
        messageText: `⚠️ గమనిక: మీ '${item.title}' సబ్మిషన్‌లో కొన్ని మార్పులు అవసరమయ్యాయి.\nకారణం: ${adminNotes || 'దయచేసి సరైన ఫోటో మరియు స్పష్టమైన అడ్రస్ అందించండి'}\n\nదయచేసి వాట్సాప్‌లో వివరాలను మళ్లీ పంపండి.`,
        status: 'sent',
        createdAt: new Date().toISOString(),
      })
    } else if (action === 'reject') {
      item.status = 'rejected'
      store.messages.unshift({
        id: `msg_${Date.now()}`,
        phone: item.submitterPhone,
        contactName: item.submitterName,
        direction: 'outbound',
        messageText: `❌ మీ '${item.title}' సబ్మిషన్ నిబంధనల ప్రకారం ఆమోదించబడలేదు.\nకారణం: ${adminNotes || 'సరైన ధృవీకరణ వివరాలు లేవు'}. మరిన్ని వివరాల కోసం మా సపోర్ట్‌ను సంప్రదించండి.`,
        status: 'sent',
        createdAt: new Date().toISOString(),
      })
    }

    saveStore(store)
    return NextResponse.json({
      success: true,
      message: `Item marked as ${item.status} and WhatsApp status notification dispatched!`,
      item,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
