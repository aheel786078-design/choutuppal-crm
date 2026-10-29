import { NextResponse } from 'next/server'
import { loadStore, saveStore, logAuditEvent, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import type { Listing } from '@/lib/types'
import { requireAuth } from '@/lib/auth-server'
import { STANDARD_CATEGORIES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const ALLOWED_BULK_ACTIONS = ['publish', 'archive', 'set_category', 'set_featured'] as const
type BulkAction = typeof ALLOWED_BULK_ACTIONS[number]

// In-memory set for idempotency guard against double-submits
const processedIdempotencyKeys = new Set<string>()

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const isSuperAdmin = auth.user.role === 'SUPER_ADMIN'
    const isFranchiseAdmin = auth.user.role === 'FRANCHISE_ADMIN'
    const isOperator = auth.user.role === 'PLATFORM_OPERATOR'

    if (!isSuperAdmin && !isFranchiseAdmin && !isOperator) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient privileges to perform bulk operations.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { action, listingIds, categoryId, isFeatured, idempotencyKey } = body

    // 1. Strict Bulk Delete Prohibition Guard
    if (action === 'delete') {
      return NextResponse.json(
        {
          success: false,
          error: 'Bulk delete is strictly prohibited to prevent irreversible data loss. Use individual deletion if required.',
        },
        { status: 400 }
      )
    }

    // 2. Validate Action
    if (!action || !ALLOWED_BULK_ACTIONS.includes(action as BulkAction)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid bulk action "${action}". Supported actions: ${ALLOWED_BULK_ACTIONS.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // 3. Validate Listing IDs
    if (!Array.isArray(listingIds) || listingIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please provide a non-empty array of listingIds.' },
        { status: 400 }
      )
    }

    if (listingIds.length > 250) {
      return NextResponse.json(
        { success: false, error: 'Bulk operations are capped at 250 listings per request.' },
        { status: 400 }
      )
    }

    // 4. Validate categoryId if action is set_category
    if (action === 'set_category') {
      if (!categoryId || typeof categoryId !== 'string') {
        return NextResponse.json(
          { success: false, error: 'A valid categoryId is required for "set_category" action.' },
          { status: 400 }
        )
      }
      const categoryExists = STANDARD_CATEGORIES.some((c) => c.id === categoryId || c.slug === categoryId)
      if (!categoryExists) {
        return NextResponse.json(
          { success: false, error: `Category "${categoryId}" not found in standard categories.` },
          { status: 400 }
        )
      }
    }

    // 5. Idempotency Check
    if (idempotencyKey && typeof idempotencyKey === 'string') {
      if (processedIdempotencyKeys.has(idempotencyKey)) {
        return NextResponse.json({
          success: true,
          action,
          isDuplicateSubmission: true,
          message: 'Operation was already processed via this idempotency key.',
          totalRequested: listingIds.length,
          succeededCount: 0,
          skippedCount: listingIds.length,
          failedCount: 0,
          succeeded: [],
          skipped: listingIds.map((id: string) => ({ id, reason: 'Already processed (idempotency)' })),
          failed: [],
        })
      }
      processedIdempotencyKeys.add(idempotencyKey)
      // Limit memory cache size
      if (processedIdempotencyKeys.size > 2000) {
        processedIdempotencyKeys.clear()
      }
    }

    const store = loadStore()
    const listings = store.listings || []

    const succeeded: Array<{ id: string; title: string }> = []
    const skipped: Array<{ id: string; reason: string }> = []
    const failed: Array<{ id: string; reason: string }> = []

    const timestamp = new Date().toISOString()
    const callerTerritory = auth.user.territoryId || FLAGSHIP_TERRITORY_ID

    for (const id of listingIds) {
      if (!id || typeof id !== 'string') {
        failed.push({ id: String(id), reason: 'Invalid listing ID format' })
        continue
      }

      const listing = listings.find((l) => l.id === id)
      if (!listing) {
        failed.push({ id, reason: 'Listing not found in database' })
        continue
      }

      // Territory & Franchise Authorization Guard:
      // Non-Super Admins can only modify listings within their own franchise territory
      const listingTerritory = listing.territoryId || FLAGSHIP_TERRITORY_ID
      if (!isSuperAdmin && listingTerritory !== callerTerritory) {
        skipped.push({
          id,
          reason: `Forbidden: Listing belongs to territory "${listingTerritory}", caller territory is "${callerTerritory}".`,
        })
        continue
      }

      // Execute Action
      switch (action) {
        case 'publish': {
          if (listing.status === 'APPROVED' || listing.status === 'approved' || listing.status === 'published') {
            skipped.push({ id, reason: 'Listing is already published/approved' })
          } else {
            listing.status = 'APPROVED'
            ;(listing as any).isPublished = true
            listing.updatedAt = timestamp
            succeeded.push({ id, title: listing.title })
          }
          break
        }

        case 'archive': {
          if (listing.status === 'archived') {
            skipped.push({ id, reason: 'Listing is already archived' })
          } else {
            listing.status = 'archived'
            ;(listing as any).isPublished = false
            listing.updatedAt = timestamp
            succeeded.push({ id, title: listing.title })
          }
          break
        }

        case 'set_category': {
          if (listing.categoryId === categoryId) {
            skipped.push({ id, reason: 'Listing is already in this category' })
          } else {
            listing.categoryId = categoryId
            listing.updatedAt = timestamp
            succeeded.push({ id, title: listing.title })
          }
          break
        }

        case 'set_featured': {
          const targetFeatured = Boolean(isFeatured)
          if (listing.isFeatured === targetFeatured) {
            skipped.push({
              id,
              reason: targetFeatured ? 'Already featured' : 'Already unfeatured',
            })
          } else {
            listing.isFeatured = targetFeatured
            ;(listing as any).featured = targetFeatured
            listing.updatedAt = timestamp
            succeeded.push({ id, title: listing.title })
          }
          break
        }
      }
    }

    if (succeeded.length > 0) {
      saveStore(store)

      logAuditEvent({
        actorId: auth.user.userId,
        actorName: auth.user.phone,
        actorRole: auth.user.role,
        action: 'listings.bulk_operation',
        entityType: 'listing',
        outcome: 'SUCCESS',
        details: `Bulk ${action}: ${succeeded.length} succeeded, ${skipped.length} skipped, ${failed.length} failed. Affected: [${succeeded.map((s) => s.id).join(', ')}]`,
        metadata: {
          action,
          totalRequested: listingIds.length,
          succeededCount: succeeded.length,
          skippedCount: skipped.length,
          failedCount: failed.length,
          idempotencyKey,
        },
        territoryId: isSuperAdmin ? undefined : callerTerritory,
      })
    } else {
      logAuditEvent({
        actorId: auth.user.userId,
        actorName: auth.user.phone,
        actorRole: auth.user.role,
        action: 'listings.bulk_operation',
        entityType: 'listing',
        outcome: 'FAILURE',
        details: `Bulk ${action} had 0 successes: ${skipped.length} skipped, ${failed.length} failed.`,
        metadata: {
          action,
          totalRequested: listingIds.length,
          succeededCount: 0,
          skippedCount: skipped.length,
          failedCount: failed.length,
          skippedReasons: skipped.map((s) => s.reason),
          idempotencyKey,
        },
        territoryId: isSuperAdmin ? undefined : callerTerritory,
      })
    }

    return NextResponse.json({
      success: true,
      action,
      totalRequested: listingIds.length,
      succeededCount: succeeded.length,
      skippedCount: skipped.length,
      failedCount: failed.length,
      succeeded,
      skipped,
      failed,
      message: `Bulk ${action} completed: ${succeeded.length} updated, ${skipped.length} skipped, ${failed.length} failed.`,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
