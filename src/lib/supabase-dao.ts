/**
 * ============================================================================
 * CHOUTUPPAL SUPERAPP & CRM — UNIFIED SUPABASE DATA ACCESS LAYER (DAO)
 * ============================================================================
 * Provides typed, paginated, safe queries with:
 * 1. Strict multi-tenant territory scoping.
 * 2. Dual-mode runtime: Routes to remote Supabase when configured & available;
 *    gracefully falls back to local store (admin_data.json) if unconfigured.
 * 3. Sanitized error handling, loading, empty, and success states.
 * 4. Zero exposure of server secrets to browser callers.
 * ============================================================================
 */

import { getSupabaseAdminClient, getSupabaseBrowserClient, isSupabaseConfigured } from './supabase'
import { loadStore, saveStore, isListingPublished, FLAGSHIP_TERRITORY_ID } from './store'
import type { Listing, CRMContact, AutomationRule, WhatsAppMessage, CRMDeal } from './types'

export interface PaginatedResult<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
  isRemote: boolean
  error?: string | null
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  territoryId?: string
}

export function mapListingFromDb(row: any): Listing {
  return {
    ...row,
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    status: row.status,
    type: row.type,
    phone: row.phone,
    secondaryPhone: row.secondary_phone ?? row.secondaryPhone,
    whatsapp: row.whatsapp,
    email: row.email,
    website: row.website,
    address: row.address,
    location: row.location,
    price: row.price,
    territoryId: row.territory_id ?? row.territoryId,
    franchiseId: row.franchise_id ?? row.franchiseId,
    categoryId: row.category_id ?? row.categoryId,
    categoryName: row.category_name ?? row.categoryName,
    villageId: row.village_id ?? row.villageId,
    villageName: row.village_name ?? row.villageName,
    coverImage: row.cover_image ?? row.coverImage,
    gallery: Array.isArray(row.gallery) ? row.gallery : [],
    isFeatured: Boolean(row.is_featured ?? row.isFeatured),
    isPremium: Boolean(row.is_premium ?? row.isPremium),
    views: Number(row.views || 0),
    clicks: Number(row.clicks || 0),
    whatsappClicks: Number(row.whatsapp_clicks ?? row.whatsappClicks ?? 0),
    syncedToCrm: Boolean(row.synced_to_crm ?? row.syncedToCrm ?? true),
    crmLeadId: row.crm_lead_id ?? row.crmLeadId,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

export function mapContactFromDb(row: any): CRMContact {
  return {
    ...row,
    id: row.id,
    name: row.name,
    businessName: row.business_name ?? row.businessName,
    phone: row.phone,
    email: row.email,
    tags: Array.isArray(row.tags) ? row.tags : [],
    stage: row.stage,
    territoryId: row.territory_id ?? row.territoryId,
    franchiseId: row.franchise_id ?? row.franchiseId,
    listingId: row.listing_id ?? row.listingId,
    listingTitle: row.listing_title ?? row.listingTitle,
    notes: row.notes,
    messageCount: Number(row.message_count ?? row.messageCount ?? 0),
    lastMessage: row.last_message ?? row.lastMessage,
    lastContactAt: row.last_contact_at ?? row.lastContactAt ?? row.created_at,
    createdAt: row.created_at ?? row.createdAt,
  }
}

export function mapAutomationFromDb(row: any): AutomationRule {
  return {
    ...row,
    id: row.id,
    territoryId: row.territory_id ?? row.territoryId,
    name: row.name,
    triggerType: row.trigger_type ?? row.triggerType,
    triggerValue: row.trigger_value ?? row.triggerValue,
    actionType: row.action_type ?? row.actionType,
    actionValue: row.action_value ?? row.actionValue,
    isActive: Boolean(row.is_active ?? row.isActive),
    status: row.status,
    isGlobal: Boolean(row.is_global ?? row.isGlobal),
    isSupported: Boolean(row.is_supported ?? row.isSupported),
    description: row.description,
    templateSlug: row.template_slug ?? row.templateSlug,
    delayMinutes: Number(row.delay_minutes ?? row.delayMinutes ?? 0),
    executionCount: Number(row.execution_count ?? row.executionCount ?? 0),
    createdAt: row.created_at ?? row.createdAt,
  }
}

export function mapDealFromDb(row: any): CRMDeal {
  return {
    ...row,
    id: row.id,
    title: row.title,
    description: row.description,
    value: Number(row.value || 0),
    currency: row.currency || 'INR',
    stage: row.stage,
    status: row.status,
    phone: row.phone,
    contactId: row.contact_id ?? row.contactId,
    contactName: row.contact_name ?? row.contactName,
    territoryId: row.territory_id ?? row.territoryId,
    franchiseId: row.franchise_id ?? row.franchiseId,
    assignedStaffId: row.assigned_staff_id ?? row.assignedStaffId,
    assignedStaffName: row.assigned_staff_name ?? row.assignedStaffName,
    expectedCloseDate: row.expected_close_date ?? row.expectedCloseDate,
    nextFollowUpDate: row.next_follow_up_date ?? row.nextFollowUpDate,
    notes: row.notes,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

/**
 * Fetches listings with pagination, category filter, and search.
 */
export async function getListingsDAO(params: PaginationParams & {
  categoryId?: string
  status?: string
  publishedOnly?: boolean
  search?: string
}): Promise<PaginatedResult<Listing>> {
  const page = Math.max(1, params.page || 1)
  const pageSize = params.pageSize ? Math.min(1000, Math.max(1, params.pageSize)) : 1000
  const territoryId = params.territoryId ?? FLAGSHIP_TERRITORY_ID

  const client = getSupabaseAdminClient() || getSupabaseBrowserClient()

  if (isSupabaseConfigured && client) {
    try {
      let query = client.from('listings').select('*', { count: 'exact' })

      if (territoryId !== 'all') {
        query = query.eq('territory_id', territoryId)
      }

      if (params.categoryId && params.categoryId !== 'all') {
        query = query.eq('category_id', params.categoryId)
      }

      if (params.publishedOnly) {
        query = query.in('status', ['published', 'approved', 'APPROVED'])
      } else if (params.status && params.status !== 'ALL') {
        query = query.eq('status', params.status)
      }

      if (params.search) {
        query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`)
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      const { data, count, error } = await query.range(from, to).order('created_at', { ascending: false })

      if (!error && data) {
        const total = count || 0
        return {
          data: data.map(mapListingFromDb),
          count: total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
          isRemote: true,
          error: null,
        }
      }
    } catch {
      // Graceful fallback to local store below
    }
  }

  // Local Store Fallback
  const store = loadStore()
  let filtered = store.listings || []

  if (territoryId !== 'all') {
    filtered = filtered.filter(l => (l.territoryId || FLAGSHIP_TERRITORY_ID) === territoryId)
  }

  if (params.publishedOnly) {
    filtered = filtered.filter(l => isListingPublished(l))
  } else if (params.status && params.status !== 'ALL') {
    filtered = filtered.filter(l => l.status === params.status)
  }

  if (params.categoryId && params.categoryId !== 'all') {
    filtered = filtered.filter(l => l.categoryId === params.categoryId)
  }

  if (params.search) {
    const s = params.search.toLowerCase()
    filtered = filtered.filter(l => l.title?.toLowerCase().includes(s) || l.description?.toLowerCase().includes(s))
  }

  const total = filtered.length
  const from = (page - 1) * pageSize
  const paged = filtered.slice(from, from + pageSize)

  return {
    data: paged,
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    isRemote: false,
    error: null,
  }
}

/**
 * Fetches CRM contacts with pagination and stage filtering.
 */
export async function getContactsDAO(params: PaginationParams & {
  stage?: string
  search?: string
}): Promise<PaginatedResult<CRMContact>> {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20))
  const territoryId = params.territoryId || 'territory_choutuppal'

  const client = getSupabaseAdminClient()

  if (isSupabaseConfigured && client) {
    try {
      let query = client
        .from('contacts')
        .select('*', { count: 'exact' })
        .eq('territory_id', territoryId)

      if (params.stage && params.stage !== 'ALL') {
        query = query.eq('stage', params.stage)
      }
      if (params.search) {
        query = query.or(`name.ilike.%${params.search}%,phone.ilike.%${params.search}%`)
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      const { data, count, error } = await query.range(from, to).order('last_contact_at', { ascending: false })

      if (!error && data) {
        const total = count || 0
        return {
          data: data.map(mapContactFromDb),
          count: total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
          isRemote: true,
          error: null,
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  // Local Store Fallback
  const store = loadStore()
  let filtered = (store.contacts || []).filter(c => (c.territoryId || 'territory_choutuppal') === territoryId)

  if (params.stage && params.stage !== 'ALL') {
    filtered = filtered.filter(c => c.stage === params.stage)
  }
  if (params.search) {
    const s = params.search.toLowerCase()
    filtered = filtered.filter(c => c.name?.toLowerCase().includes(s) || c.phone?.toLowerCase().includes(s))
  }

  const total = filtered.length
  const from = (page - 1) * pageSize
  const paged = filtered.slice(from, from + pageSize)

  return {
    data: paged,
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    isRemote: false,
    error: null,
  }
}

/**
 * Fetches WhatsApp automation rules.
 */
export async function getAutomationsDAO(params: {
  territoryId?: string
  isActive?: boolean
}): Promise<{ data: AutomationRule[]; isRemote: boolean; error?: string | null }> {
  const territoryId = params.territoryId || 'territory_choutuppal'
  const client = getSupabaseAdminClient()

  if (isSupabaseConfigured && client) {
    try {
      let query = client.from('automation_rules').select('*').eq('territory_id', territoryId)
      if (typeof params.isActive === 'boolean') {
        query = query.eq('is_active', params.isActive)
      }
      const { data, error } = await query.order('created_at', { ascending: true })
      if (!error && data) {
        return { data: data.map(mapAutomationFromDb), isRemote: true, error: null }
      }
    } catch {
      // Fallback
    }
  }

  const store = loadStore()
  let automations = (store.automations || []).filter(a => (a.territoryId || 'territory_choutuppal') === territoryId)
  if (typeof params.isActive === 'boolean') {
    automations = automations.filter(a => (a.isActive ?? (a as any).is_active) === params.isActive)
  }

  return { data: automations, isRemote: false, error: null }
}

export interface MutationResult<T> {
  success: boolean
  data?: T
  isRemote: boolean
  cacheWarning?: string | null
  error?: string | null
}

/**
 * ============================================================================
 * SAFE DUAL-MODE MUTATION ENGINE
 * ============================================================================
 * Strict Behavioral Rules:
 * 1. Read Failure: Allowed to return cached local data to avoid UI outage.
 * 2. Write Failure: NEVER silently fall back to local JSON!
 *    A failed remote database write must immediately throw/return an error
 *    to prevent database drift and split-brain states.
 * 3. Cache Synchronization: Only after a remote database mutation succeeds,
 *    the local store is synchronized for offline resilience.
 * 4. Cache Failure Resilience: If remote succeeds but local cache fails,
 *    report success with a cacheWarning (do not falsely report remote failure).
 * ============================================================================
 */
export async function safeMutateDAO<T>(options: {
  table: string
  operation: 'INSERT' | 'UPDATE' | 'UPSERT' | 'DELETE'
  data?: any
  match?: Record<string, any>
  localMutation: () => Promise<T> | T
}): Promise<MutationResult<T>> {
  const client = getSupabaseAdminClient()

  if (isSupabaseConfigured && client) {
    try {
      let query: any
      if (options.operation === 'INSERT') {
        query = client.from(options.table).insert(options.data).select().single()
      } else if (options.operation === 'UPSERT') {
        query = client.from(options.table).upsert(options.data, { onConflict: 'id' }).select().single()
      } else if (options.operation === 'UPDATE') {
        let q = client.from(options.table).update(options.data)
        for (const [k, v] of Object.entries(options.match || {})) {
          q = q.eq(k, v)
        }
        query = q.select().single()
      } else if (options.operation === 'DELETE') {
        let q = client.from(options.table).delete()
        for (const [k, v] of Object.entries(options.match || {})) {
          q = q.eq(k, v)
        }
        query = q
      }

      const { data: remoteData, error } = await query
      if (error) {
        // STRICT SAFETY MANDATE: Never silently write to local JSON on remote mutation failure!
        return {
          success: false,
          isRemote: true,
          cacheWarning: null,
          error: `Remote database error on [${options.table}]: ${error.message} (${error.code || 'UNKNOWN'})`,
        }
      }

      // Remote write succeeded! Now safely update local cache
      let cacheWarning: string | null = null
      try {
        await options.localMutation()
      } catch (cacheErr: any) {
        cacheWarning = `Local cache sync failed: ${cacheErr?.message || cacheErr}`
        console.warn(`[DAO Cache Warning] ${cacheWarning}`)
      }

      return {
        success: true,
        data: (remoteData as T) || undefined,
        isRemote: true,
        cacheWarning,
        error: null,
      }
    } catch (networkErr: any) {
      // Remote database unreachable during mutation
      return {
        success: false,
        isRemote: true,
        cacheWarning: null,
        error: `Remote database connection failure on [${options.table}]: ${networkErr.message}`,
      }
    }
  }

  // Supabase is unconfigured: safely execute local-only mutation
  try {
    const localResult = await options.localMutation()
    return {
      success: true,
      data: localResult,
      isRemote: false,
      cacheWarning: null,
      error: null,
    }
  } catch (localErr: any) {
    return {
      success: false,
      isRemote: false,
      cacheWarning: null,
      error: `Local store mutation failed: ${localErr.message}`,
    }
  }
}

/**
 * Upserts a business listing through the safe mutation engine.
 */
export async function upsertListingDAO(listing: Listing): Promise<MutationResult<Listing>> {
  return safeMutateDAO<Listing>({
    table: 'listings',
    operation: 'UPSERT',
    data: {
      id: listing.id,
      territory_id: listing.territoryId || 'territory_choutuppal',
      franchise_id: listing.franchiseId || null,
      title: listing.title,
      slug: listing.slug,
      category_id: listing.categoryId,
      category_name: listing.categoryName,
      village_id: listing.villageId || 'v-choutuppal',
      village_name: listing.villageName || 'చౌటుప్పల్ (Choutuppal)',
      type: listing.type || 'BUSINESS',
      phone: listing.phone,
      secondary_phone: listing.secondaryPhone || null,
      whatsapp: listing.whatsapp || null,
      email: listing.email || null,
      website: listing.website || null,
      address: listing.address,
      location: listing.location || null,
      price: listing.price || null,
      description: listing.description || null,
      cover_image: listing.coverImage,
      gallery: listing.gallery || [],
      status: listing.status || 'published',
      is_featured: Boolean(listing.isFeatured),
      is_premium: Boolean(listing.isPremium),
      views: Number(listing.views || 0),
      clicks: Number(listing.clicks || 0),
      whatsapp_clicks: Number(listing.whatsappClicks || 0),
      synced_to_crm: Boolean(listing.syncedToCrm ?? true),
      crm_lead_id: listing.crmLeadId || null,
      updated_at: new Date().toISOString(),
    },
    localMutation: () => {
      const store = loadStore()
      const idx = (store.listings || []).findIndex(l => l.id === listing.id)
      if (idx >= 0) {
        store.listings[idx] = { ...store.listings[idx], ...listing, updatedAt: new Date().toISOString() }
      } else {
        store.listings = [listing, ...(store.listings || [])]
      }
      saveStore(store)
      return listing
    },
  })
}

/**
 * Deletes a business listing through the safe mutation engine.
 */
export async function deleteListingDAO(id: string, territoryId: string): Promise<MutationResult<boolean>> {
  return safeMutateDAO<boolean>({
    table: 'listings',
    operation: 'DELETE',
    match: { id, territory_id: territoryId },
    localMutation: () => {
      const store = loadStore()
      store.listings = (store.listings || []).filter(l => l.id !== id)
      saveStore(store)
      return true
    },
  })
}

/**
 * Upserts a CRM contact through the safe mutation engine.
 */
export async function upsertContactDAO(contact: CRMContact): Promise<MutationResult<CRMContact>> {
  return safeMutateDAO<CRMContact>({
    table: 'contacts',
    operation: 'UPSERT',
    data: {
      id: contact.id,
      territory_id: contact.territoryId || 'territory_choutuppal',
      franchise_id: contact.franchiseId || null,
      name: contact.name,
      phone: contact.phone,
      email: contact.email || null,
      tags: contact.tags || [],
      stage: contact.stage || 'NEW_LEAD',
      listing_id: contact.listingId || null,
      listing_title: contact.listingTitle || null,
      notes: contact.notes || null,
      message_count: contact.messageCount || 1,
      last_message: contact.lastMessage || null,
      last_contact_at: contact.lastContactAt || new Date().toISOString(),
    },
    localMutation: () => {
      const store = loadStore()
      const idx = (store.contacts || []).findIndex(c => c.id === contact.id)
      if (idx >= 0) {
        store.contacts[idx] = { ...store.contacts[idx], ...contact }
      } else {
        store.contacts = [contact, ...(store.contacts || [])]
      }
      saveStore(store)
      return contact
    },
  })
}

