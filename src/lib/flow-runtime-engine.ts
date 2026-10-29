/**
 * Deterministic Flow Runtime Evaluator
 * Evaluates inbound WhatsApp messages & interactive button clicks against published flows.
 * Handles variable substitution, directory listing bindings, node transitions, and interactive components.
 */

import type { WhatsAppFlow, FlowNode, FlowButton, FlowListSection, FlowListRow, Territory, CRMContact, Listing, ListingSortMode, GovernmentContact } from './types'
import { FLAGSHIP_CHOUTUPPAL_TERRITORY, FLAGSHIP_TERRITORY_ID, loadStore } from './store'
import { resolveListingEntitlements } from './entitlement-resolver'
import {
  isContactEligibleForPublic,
  sanitizeGovtContactForPublic,
  filterAndSortGovtContacts,
  type PublicGovernmentContact,
} from './government-contacts'
import { GOVT_CONTACT_CATEGORIES, CHOUTUPPAL_MANDAL_VILLAGES } from './constants'

export interface FlowEvaluationParams {
  incomingText?: string
  senderPhone?: string
  senderName?: string
  territory?: Territory
  contact?: CRMContact
  storeFlows?: WhatsAppFlow[]
  storeListings?: Listing[]
  inStore?: any
  asOf?: Date | string | number
  buttonPayload?: string
  buttonTitle?: string
  activeFlowId?: string
  activeNodeId?: string
  allowDraft?: boolean
  filterFlowId?: string
  listingPage?: number
}

export interface FlowExecutionResult {
  matched: boolean
  matchedTrigger?: string
  flowId?: string
  flowName?: string
  nodeId?: string
  nodeType?: string
  messageText?: string
  renderedBody?: string
  body?: string
  imageUrl?: string
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'document'
  selectedMedia?: string
  buttons?: Array<{ id: string; title: string; payload?: string; nextNodeId?: string }>
  listSections?: FlowListSection[]
  renderedListOptions?: Array<{ id: string; title: string; description?: string }>
  listButtonText?: string
  footerText?: string
  templateSlug?: string
  nextNodeId?: string
  nextNodeTransition?: string
  attachedListing?: {
    id: string
    title: string
    slug: string
    phone: string
    address: string
    url: string
    coverImage?: string
  }
  listing?: {
    id: string
    title: string
    slug: string
    phone: string
    address: string
    url: string
    coverImage?: string
  }
  sortedListings?: Array<{
    id: string
    title: string
    slug: string
    categoryName?: string
    categoryId?: string
    phone: string
    address: string
    url: string
    coverImage?: string
    isFeatured?: boolean
    isPremium?: boolean
    createdAt?: string
  }>
  pagination?: {
    currentPage: number
    totalPages: number
    pageSize: number
    totalCount: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  tagToAdd?: string
  stageToUpdate?: string
  attachedGovtContact?: PublicGovernmentContact
  govtContacts?: PublicGovernmentContact[]
  reason?: string
}

export interface ResolvedListingOrderSettings {
  sortMode: ListingSortMode
  manualOrder: string[]
  categoryPriority: string[]
  pageSize: number
  category?: string
}

/**
 * Precedence Rule:
 * 1. Node-level configuration overrides flow-level defaults.
 * 2. Missing node settings inherit flow settings.
 * 3. Missing flow settings use safe defaults.
 * 4. Explicit manual ordering must not silently fall back to alphabetical order.
 */
export function resolveListingSettings(
  nodeOrFlow?: FlowNode | WhatsAppFlow | any,
  flowOrNode?: WhatsAppFlow | FlowNode | any
): ResolvedListingOrderSettings {
  let node: FlowNode | undefined
  let flow: WhatsAppFlow | undefined

  if (nodeOrFlow && ('nodes' in nodeOrFlow || 'type' in nodeOrFlow) && !('config' in nodeOrFlow)) {
    flow = nodeOrFlow as WhatsAppFlow
    node = flowOrNode as FlowNode | undefined
  } else if (flowOrNode && ('nodes' in flowOrNode || 'type' in flowOrNode) && !('config' in flowOrNode)) {
    flow = flowOrNode as WhatsAppFlow
    node = nodeOrFlow as FlowNode | undefined
  } else {
    node = nodeOrFlow as FlowNode | undefined
    flow = flowOrNode as WhatsAppFlow | undefined
  }

  const nodeCfg: any = node?.config || (node && !('nodes' in node) ? node : {})
  const flowCfg: any = (flow as any) || {}

  const category = (nodeCfg.listingCategory || flowCfg.listingCategory || '').trim() || undefined

  const manualOrder = (
    Array.isArray(nodeCfg.listingSortOrder) && nodeCfg.listingSortOrder.length > 0
      ? nodeCfg.listingSortOrder
      : (Array.isArray(flowCfg.listingSortOrder) && flowCfg.listingSortOrder.length > 0
          ? flowCfg.listingSortOrder
          : [])
  ).map((id: any) => String(id).trim()).filter(Boolean)

  const categoryPriority = (
    Array.isArray(nodeCfg.categoryPriority) && nodeCfg.categoryPriority.length > 0
      ? nodeCfg.categoryPriority
      : (Array.isArray(flowCfg.categoryPriority) && flowCfg.categoryPriority.length > 0
          ? flowCfg.categoryPriority
          : (Array.isArray(flowCfg.categoriesOrder) && flowCfg.categoriesOrder.length > 0
              ? flowCfg.categoriesOrder
              : []))
  ).map((c: any) => String(c).trim()).filter(Boolean)

  let sortMode: ListingSortMode
  if (nodeCfg.listingSortMode) {
    sortMode = nodeCfg.listingSortMode
  } else if (flowCfg.listingSortMode) {
    sortMode = flowCfg.listingSortMode
  } else if (manualOrder.length > 0) {
    sortMode = 'manual'
  } else if (categoryPriority.length > 0) {
    sortMode = 'category_priority'
  } else {
    sortMode = 'manual'
  }

  const rawPageSize = nodeCfg.listingPageSize !== undefined && nodeCfg.listingPageSize !== null
    ? nodeCfg.listingPageSize
    : (flowCfg.listingPageSize !== undefined && flowCfg.listingPageSize !== null
        ? flowCfg.listingPageSize
        : 10)
  const numPageSize = Number(rawPageSize)
  const pageSize = (isNaN(numPageSize) || numPageSize <= 0) ? 10 : Math.min(Math.max(numPageSize, 1), 10)

  return {
    sortMode,
    manualOrder,
    categoryPriority,
    pageSize,
    category,
  }
}

/**
 * Deterministically sorts and filters business listings for WhatsApp flows.
 * Enforces strict publication checks and multi-tenant territory scoping.
 */
export function sortAndFilterListings(
  listings: Listing[],
  options: {
    territoryId?: string
    category?: string
    sortMode?: ListingSortMode
    manualOrder?: string[]
    categoryPriority?: string[]
    requirePublished?: boolean
    store?: any
    asOf?: Date | string | number
  }
): Listing[] {
  const requirePublished = options.requirePublished !== false
  const targetTerritory = options.territoryId || 'territory_choutuppal'
  const sortMode: ListingSortMode = options.sortMode || 'manual'

  // Step 1: Strict publication and territory isolation
  let candidates = (listings || []).filter((l) => {
    if (requirePublished && !['published', 'approved', 'APPROVED'].includes(l.status)) {
      return false
    }
    const lTerritory = l.territoryId || 'territory_choutuppal'
    if (targetTerritory !== 'ALL' && lTerritory !== targetTerritory) {
      return false
    }
    return true
  })

  // Step 2: Category filtering if specified
  if (options.category) {
    const cat = options.category.toLowerCase().trim()
    candidates = candidates.filter(
      (l) =>
        (l.categoryId && l.categoryId.toLowerCase() === cat) ||
        (l.categoryName && l.categoryName.toLowerCase() === cat) ||
        (l.slug && l.slug.toLowerCase().includes(cat))
    )
  }

  // Step 3: Deterministic sorting
  const sorted = [...candidates]

  if (sortMode === 'manual') {
    const manualOrder = options.manualOrder || []
    if (manualOrder.length > 0) {
      const orderMap = new Map<string, number>()
      manualOrder.forEach((idOrSlug, idx) => {
        orderMap.set(idOrSlug.toLowerCase(), idx)
      })

      sorted.sort((a, b) => {
        const keyA = orderMap.has(a.id.toLowerCase())
          ? a.id.toLowerCase()
          : (a.slug && orderMap.has(a.slug.toLowerCase()) ? a.slug.toLowerCase() : null)
        const keyB = orderMap.has(b.id.toLowerCase())
          ? b.id.toLowerCase()
          : (b.slug && orderMap.has(b.slug.toLowerCase()) ? b.slug.toLowerCase() : null)

        const posA = keyA !== null ? orderMap.get(keyA)! : 999999
        const posB = keyB !== null ? orderMap.get(keyB)! : 999999

        if (posA !== posB) return posA - posB
        return (a.title || '').localeCompare(b.title || '', 'en', { sensitivity: 'base' })
      })
    } else {
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'en', { sensitivity: 'base' }))
    }
  } else if (sortMode === 'category_priority') {
    const catPriority = options.categoryPriority || []
    const matchCat = (catId?: string, catName?: string, slug?: string): number => {
      const s = (catId || '').toLowerCase().trim()
      const n = (catName || '').toLowerCase().trim()
      const sl = (slug || '').toLowerCase().trim()
      const strippedS = s.replace(/^cat-/, '')
      for (let i = 0; i < catPriority.length; i++) {
        const target = catPriority[i].toLowerCase().trim().replace(/^cat-/, '')
        if (
          s === target ||
          strippedS === target ||
          n === target ||
          n.includes(target) ||
          target.includes(strippedS) ||
          sl.includes(target)
        ) {
          return i
        }
      }
      return 999999
    }

    sorted.sort((a, b) => {
      const posA = matchCat(a.categoryId, a.categoryName, a.slug)
      const posB = matchCat(b.categoryId, b.categoryName, b.slug)

      if (posA !== posB) return posA - posB
      return (a.title || '').localeCompare(b.title || '', 'en', { sensitivity: 'base' })
    })
  } else if (sortMode === 'newest') {
    sorted.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime()
      const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime()
      if (timeB !== timeA) return timeB - timeA
      return (a.title || '').localeCompare(b.title || '', 'en', { sensitivity: 'base' })
    })
  } else if (sortMode === 'alphabetical') {
    sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'en', { sensitivity: 'base' }))
  } else if (sortMode === 'featured') {
    sorted.sort((a, b) => {
      let featA = 0
      let featB = 0
      let prioA = 0
      let prioB = 0

      if (options.store) {
        const entA = resolveListingEntitlements(a.id, options.store, options.asOf)
        const entB = resolveListingEntitlements(b.id, options.store, options.asOf)
        featA = entA.isFeatured || entA.isPremium ? 1 : 0
        featB = entB.isFeatured || entB.isPremium ? 1 : 0
        prioA = entA.featuredPriority || 0
        prioB = entB.featuredPriority || 0
      } else {
        featA = Boolean(a.isFeatured || a.isPremium) ? 1 : 0
        featB = Boolean(b.isFeatured || b.isPremium) ? 1 : 0
        prioA = featA ? 10 : 0
        prioB = featB ? 10 : 0
      }

      if (featB !== featA) return featB - featA
      if (prioB !== prioA) return prioB - prioA
      return (a.title || '').localeCompare(b.title || '', 'en', { sensitivity: 'base' })
    })
  }

  return sorted
}

/**
 * Variable interpolation helper for WhatsApp message text
 */
export function interpolateVariables(
  templateText: string,
  context: {
    contactName?: string
    contactPhone?: string
    territoryName?: string
    townUrl?: string
    townPhone?: string
    listing?: Listing
  }
): string {
  if (!templateText) return ''

  let text = templateText

  const contactName = context.contactName || 'మిత్రమా'
  const contactPhone = context.contactPhone || ''
  const territoryName = context.territoryName || 'Choutuppal'
  const townUrl = context.townUrl || 'https://choutuppal.in'
  const townPhone = context.townPhone || '9441348175'

  text = text.replace(/\{\{\s*contact\.name\s*\}\}/gi, contactName)
  text = text.replace(/\{\{\s*contact\.phone\s*\}\}/gi, contactPhone)
  text = text.replace(/\{\{\s*(?:town|territory)\.name\s*\}\}/gi, territoryName)
  text = text.replace(/\{\{\s*(?:town|territory)\.url\s*\}\}/gi, townUrl)
  text = text.replace(/\{\{\s*(?:town|territory)\.phone\s*\}\}/gi, townPhone)

  if (context.listing) {
    const l = context.listing
    text = text.replace(/\{\{\s*listing\.(?:title|name)\s*\}\}/gi, l.title)
    text = text.replace(/\{\{\s*listing\.phone\s*\}\}/gi, l.phone)
    text = text.replace(/\{\{\s*listing\.address\s*\}\}/gi, l.address)
    text = text.replace(/\{\{\s*listing\.price\s*\}\}/gi, l.price || '')
    text = text.replace(/\{\{\s*listing\.category\s*\}\}/gi, l.categoryName || l.categoryId)
    text = text.replace(/\{\{\s*listing\.url\s*\}\}/gi, `${townUrl}/business/${l.slug}`)
    text = text.replace(/\{\{\s*listing\.(?:cover_image|image)\s*\}\}/gi, l.coverImage || '')
  }

  return text
}

export function evaluateFlow(
  param1: FlowEvaluationParams | WhatsAppFlow,
  param2?: {
    probe?: string
    from?: string
    senderPhone?: string
    senderName?: string
    activeNodeId?: string
    allowDraft?: boolean
    storeListings?: Listing[]
    territory?: Territory
  }
): FlowExecutionResult {
  let params: FlowEvaluationParams

  if (param1 && ('nodes' in param1 || 'triggers' in param1)) {
    const flow = param1 as WhatsAppFlow
    const opts = param2 || {}
    params = {
      incomingText: opts.probe || '',
      senderPhone: opts.from || opts.senderPhone || '919876543210',
      senderName: opts.senderName || 'Customer',
      territory: opts.territory || FLAGSHIP_CHOUTUPPAL_TERRITORY,
      storeFlows: [flow],
      storeListings: opts.storeListings && opts.storeListings.length > 0 ? opts.storeListings : loadStore().listings,
      allowDraft: opts.allowDraft ?? true,
      activeNodeId: opts.activeNodeId,
      filterFlowId: flow.id,
      listingPage: (opts as any).listingPage,
    }
  } else if (param1 && 'flow' in param1) {
    const p = param1 as any
    const flow = p.flow as WhatsAppFlow
    params = {
      incomingText: p.incomingText || p.incomingMessage || p.probe || '',
      buttonPayload: p.buttonPayload,
      buttonTitle: p.buttonTitle,
      senderPhone: p.senderPhone || p.from || '919876543210',
      senderName: p.senderName || 'Customer',
      territory: p.territory || FLAGSHIP_CHOUTUPPAL_TERRITORY,
      storeFlows: flow ? [flow] : (p.storeFlows || []),
      storeListings: p.storeListings && p.storeListings.length > 0 ? p.storeListings : loadStore().listings,
      allowDraft: p.allowDraft ?? true,
      activeNodeId: p.activeNodeId,
      filterFlowId: flow?.id,
      listingPage: p.listingPage,
    }
  } else {
    params = (param1 as FlowEvaluationParams) || {}
    if ((params as any).incomingMessage && !params.incomingText) {
      params.incomingText = (params as any).incomingMessage
    }
  }

  const {
    incomingText,
    senderPhone = '919876543210',
    senderName = 'Customer',
    territory = FLAGSHIP_CHOUTUPPAL_TERRITORY,
    contact,
    storeFlows: initialStoreFlows,
    storeListings = params.storeListings && params.storeListings.length > 0 ? params.storeListings : loadStore().listings,
    buttonPayload,
    buttonTitle,
    activeFlowId,
    activeNodeId,
    allowDraft = false,
    filterFlowId,
  } = params

  const effectiveStore = params.inStore || (typeof loadStore === 'function' ? loadStore() : undefined)

  const resolvedFlows = initialStoreFlows && initialStoreFlows.length > 0
    ? initialStoreFlows
    : (effectiveStore?.flows && effectiveStore.flows.length > 0 ? effectiveStore.flows : (typeof loadStore === 'function' ? loadStore().flows : []) || [])

  const cleanText = (incomingText || '').trim()
  const lowerText = cleanText.toLowerCase()
  const cleanPayload = (buttonPayload || '').trim()
  const cleanButtonTitle = (buttonTitle || '').trim()

  const townDomain = territory.primaryDomain || `${territory.slug}.choutuppal.in`
  const townUrl = territory.isFlagship ? 'https://choutuppal.in' : `https://${townDomain}`
  const territoryName = (territory.name || 'Choutuppal').split(' ')[0]

  // 2. Button & List Reply Matching (Highest priority: direct user choice)
  const probe = cleanPayload || cleanButtonTitle || cleanText

  const pageMatch = probe.match(/^(?:next_page_|prev_page_|page_)(\d+)$/i)
  let requestedPage = pageMatch ? parseInt(pageMatch[1], 10) : (params.listingPage || 1)

  // Direct Listing Detail Interception (e.g. listing_123 or listing_detail_123)
  const listingSelectMatch = probe.match(/^(?:listing_|listing_detail_|show_listing_)(.+)$/i)
  if (listingSelectMatch) {
    const selId = listingSelectMatch[1].trim()
    const candidate = storeListings.find(
      (l) => l.id.toLowerCase() === selId.toLowerCase() || (l.slug && l.slug.toLowerCase() === selId.toLowerCase())
    )
    if (candidate) {
      const isPublished = ['published', 'approved', 'APPROVED'].includes(candidate.status)
      const candidateTerritory = candidate.territoryId || 'territory_choutuppal'
      const isAccessible = territory.id === 'ALL' || candidateTerritory === territory.id

      if (!isPublished) {
        return {
          matched: true,
          matchedTrigger: probe,
          flowId: activeFlowId || 'flow_listing_detail',
          nodeId: 'listing_detail',
          nodeType: 'send_listing',
          messageText: `Listing "${candidate.title}" is in ${candidate.status} status (not published/approved) and withheld from public bot.`,
          renderedBody: `Listing "${candidate.title}" is in ${candidate.status} status (not published/approved) and withheld from public bot.`,
          reason: `Listing "${candidate.title}" is in ${candidate.status} status (not published/approved) and withheld from public bot.`,
        }
      }

      if (!isAccessible) {
        return {
          matched: true,
          matchedTrigger: probe,
          flowId: activeFlowId || 'flow_listing_detail',
          nodeId: 'listing_detail',
          nodeType: 'send_listing',
          messageText: `Listing "${candidate.title}" belongs to different territory "${candidateTerritory}" and is inaccessible from "${territory.id}".`,
          renderedBody: `Listing "${candidate.title}" belongs to different territory "${candidateTerritory}" and is inaccessible from "${territory.id}".`,
          reason: `Listing "${candidate.title}" belongs to different territory "${candidateTerritory}" and is inaccessible from "${territory.id}".`,
        }
      }

      const detailText = `*${candidate.title}*\n📂 కేటగిరీ: ${candidate.categoryName || candidate.categoryId}\n📍 చిరునామా: ${candidate.address || 'చౌటుప్పల్'}\n📞 ఫోన్: ${candidate.phone}\n🌐 లింక్: ${townUrl}/business/${candidate.slug}\n\n${candidate.description || 'చౌటుప్పల్ లోకల్ బిజినెస్ వివరాలు.'}`
      const detailButtons = [
        { id: 'btn_call', title: '📞 Call Now', payload: candidate.phone },
        { id: 'btn_chat', title: '💬 WhatsApp', payload: candidate.whatsapp || candidate.phone },
        { id: 'btn_back', title: '🔙 Back to List', payload: 'page_1', nextNodeId: activeNodeId || 'entry_message' },
      ]

      return {
        matched: true,
        matchedTrigger: probe,
        flowId: activeFlowId || 'flow_listing_detail',
        nodeId: `listing_detail_${candidate.id}`,
        nodeType: 'send_listing',
        messageText: detailText,
        renderedBody: detailText,
        body: detailText,
        imageUrl: candidate.coverImage,
        selectedMedia: candidate.coverImage,
        mediaType: 'image',
        buttons: detailButtons,
        attachedListing: {
          id: candidate.id,
          title: candidate.title,
          slug: candidate.slug,
          phone: candidate.phone,
          address: candidate.address,
          url: `${townUrl}/business/${candidate.slug}`,
          coverImage: candidate.coverImage,
        },
        listing: {
          id: candidate.id,
          title: candidate.title,
          slug: candidate.slug,
          phone: candidate.phone,
          address: candidate.address,
          url: `${townUrl}/business/${candidate.slug}`,
          coverImage: candidate.coverImage,
        },
      }
    } else {
      return {
        matched: true,
        matchedTrigger: probe,
        flowId: activeFlowId || 'flow_listing_detail',
        nodeId: 'listing_detail_not_found',
        nodeType: 'send_listing',
        messageText: 'This business listing is unavailable or does not exist.',
        renderedBody: 'This business listing is unavailable or does not exist.',
        body: 'This business listing is unavailable or does not exist.',
        reason: `Listing "${selId}" not found in database.`,
      }
    }
  }

  // Direct Government Contact Selection (e.g. govt_emergency_112 or govt_112)
  const isGovtCatOrVillage = probe.match(/^(?:govt_cat_|govt_category_|govt_village_)/i)
  const govtSelectMatch = !isGovtCatOrVillage ? probe.match(/^(?:govt_contact_|show_govt_|govt_)(.+)$/i) : null
  if (govtSelectMatch) {
    const selId = govtSelectMatch[1].trim()
    const allGovtContacts: GovernmentContact[] = effectiveStore?.governmentContacts || []
    const candidate = allGovtContacts.find(
      (c) =>
        c.id.toLowerCase() === selId.toLowerCase() ||
        c.id.toLowerCase() === `govt_${selId.toLowerCase()}` ||
        (c.phoneNumber && c.phoneNumber === selId) ||
        (c.name && c.name.toLowerCase().includes(selId.toLowerCase()))
    )

    if (candidate) {
      const asOfDate = params.asOf ? new Date(params.asOf) : new Date()
      const isEligible = isContactEligibleForPublic(candidate, asOfDate)
      const candidateTerritory = candidate.territoryId || FLAGSHIP_TERRITORY_ID
      const isAccessible = territory.id === 'ALL' || candidateTerritory === territory.id

      if (!isEligible) {
        return {
          matched: true,
          matchedTrigger: probe,
          flowId: activeFlowId || 'flow_govt_directory',
          nodeId: 'govt_detail_withheld',
          nodeType: 'send_message',
          messageText: `Government contact "${candidate.name}" is in ${candidate.status} status and withheld from public directory.`,
          renderedBody: `Government contact "${candidate.name}" is in ${candidate.status} status and withheld from public directory.`,
          body: `Government contact "${candidate.name}" is in ${candidate.status} status and withheld from public directory.`,
          reason: `Government contact "${candidate.name}" is not eligible for public release.`,
        }
      }

      if (!isAccessible) {
        return {
          matched: true,
          matchedTrigger: probe,
          flowId: activeFlowId || 'flow_govt_directory',
          nodeId: 'govt_detail_cross_territory',
          nodeType: 'send_message',
          messageText: `Government contact "${candidate.name}" belongs to territory "${candidateTerritory}" and is inaccessible from "${territory.id}".`,
          renderedBody: `Government contact "${candidate.name}" belongs to territory "${candidateTerritory}" and is inaccessible from "${territory.id}".`,
          body: `Government contact "${candidate.name}" belongs to territory "${candidateTerritory}" and is inaccessible from "${territory.id}".`,
          reason: `Territory mismatch for government contact.`,
        }
      }

      const catMeta = GOVT_CONTACT_CATEGORIES.find((c) => c.id === candidate.category)
      const detailLines = [
        `*${candidate.name}*`,
        `📋 హోదా: ${candidate.designation}`,
        `🏛️ విభాగం: ${catMeta ? catMeta.name : candidate.category}`,
        candidate.village ? `📍 గ్రామం: ${candidate.village}, ${candidate.mandal} మండలం` : `📍 మండలం: ${candidate.mandal}`,
        candidate.officeAddress ? `🏢 చిరునామా: ${candidate.officeAddress}` : null,
        candidate.officeHours ? `⏰ వేళలు: ${candidate.officeHours}` : (candidate.availability === '24x7' ? '⏰ వేళలు: 24x7 అత్యవసరం' : null),
        candidate.phoneNumber ? `📞 ఫోన్: ${candidate.phoneNumber}` : '📞 ఫోన్: అందుబాటులో లేదు',
        candidate.sourceUrl ? `🛡️ అధికారిక మూలం: ${candidate.sourceUrl}` : null,
      ].filter(Boolean)

      const detailText = detailLines.join('\n')
      const detailButtons: FlowButton[] = []
      if (candidate.phoneNumber) {
        detailButtons.push({
          id: 'btn_call',
          title: `📞 Call ${candidate.phoneNumber}`.slice(0, 20),
          payload: candidate.phoneNumber,
        })
      }
      detailButtons.push({
        id: 'btn_govt_menu',
        title: '🏛️ Govt Menu',
        payload: 'govt_directory',
      })

      return {
        matched: true,
        matchedTrigger: probe,
        flowId: activeFlowId || 'flow_govt_directory',
        nodeId: `govt_detail_${candidate.id}`,
        nodeType: 'send_message',
        messageText: detailText,
        renderedBody: detailText,
        body: detailText,
        buttons: detailButtons,
        attachedGovtContact: sanitizeGovtContactForPublic(candidate, asOfDate),
      }
    } else {
      return {
        matched: true,
        matchedTrigger: probe,
        flowId: activeFlowId || 'flow_govt_directory',
        nodeId: 'govt_detail_not_found',
        nodeType: 'send_message',
        messageText: 'This government contact is unavailable or does not exist.',
        renderedBody: 'This government contact is unavailable or does not exist.',
        body: 'This government contact is unavailable or does not exist.',
        reason: `Government contact "${selId}" not found in directory.`,
      }
    }
  }

  // Government Directory Category Selection (e.g. govt_cat_police)
  const govtCatMatch = probe.match(/^(?:govt_cat_|govt_category_)(.+)$/i)
  if (govtCatMatch) {
    const catId = govtCatMatch[1].trim().toLowerCase()
    const allGovtContacts: GovernmentContact[] = effectiveStore?.governmentContacts || []
    const asOfDate = params.asOf ? new Date(params.asOf) : new Date()

    const { items: catContacts } = filterAndSortGovtContacts(allGovtContacts, {
      publicOnly: true,
      category: catId,
      territoryId: territory.id,
      asOf: asOfDate,
      pageSize: 9,
    })

    const catMeta = GOVT_CONTACT_CATEGORIES.find((c) => c.id.toLowerCase() === catId)
    const catName = catMeta ? catMeta.name : catId

    if (catContacts.length === 0) {
      return {
        matched: true,
        matchedTrigger: probe,
        flowId: activeFlowId || 'flow_govt_directory',
        nodeId: `govt_cat_empty_${catId}`,
        nodeType: 'send_message',
        messageText: `ప్రస్తుతం "${catName}" విభాగానికి సంబంధించి ధృవీకరించబడిన సంప్రదింపు వివరాలు నమోదు కాలేదు.`,
        renderedBody: `ప్రస్తుతం "${catName}" విభాగానికి సంబంధించి ధృవీకరించబడిన సంప్రదింపు వివరాలు నమోదు కాలేదు.`,
        body: `ప్రస్తుతం "${catName}" విభాగానికి సంబంధించి ధృవీకరించబడిన సంప్రదింపు వివరాలు నమోదు కాలేదు.`,
        buttons: [
          { id: 'btn_govt_menu', title: '🏛️ Govt Menu', payload: 'govt_directory' },
        ],
        reason: `No verified contacts found for category "${catId}".`,
      }
    }

    const rows: FlowListRow[] = catContacts.map((c) => ({
      id: `govt_${c.id}`,
      title: c.name.slice(0, 24),
      description: `${c.phoneNumber ? c.phoneNumber + ' • ' : ''}${c.designation}`.slice(0, 72),
      nextNodeId: `govt_detail_${c.id}`,
    }))

    const listSections: FlowListSection[] = [
      {
        title: `${catName}`.slice(0, 24),
        rows,
      },
    ]

    const header = `🏛️ ${catName} — చౌటుప్పల్`
    const bodyText = `చౌటుప్పల్ మండలంలోని "${catName}" విభాగం వివరాలు క్రింద ఇవ్వబడ్డాయి. పూర్తి సమాచారం కోసం సంబంధిత అధికారిని ఎంచుకోండి:`

    return {
      matched: true,
      matchedTrigger: probe,
      flowId: activeFlowId || 'flow_govt_directory',
      nodeId: `govt_cat_list_${catId}`,
      nodeType: 'send_list',
      messageText: `${header}\n\n${bodyText}`,
      renderedBody: `${header}\n\n${bodyText}`,
      body: `${header}\n\n${bodyText}`,
      listSections,
      listButtonText: 'సెలెక్ట్ చేయండి',
      footerText: 'Mana Choutuppal Official Directory',
      govtContacts: catContacts.map((c) => sanitizeGovtContactForPublic(c, asOfDate)),
    }
  }

  // Government Directory Village Search (e.g. govt_village_panthangi)
  const govtVillageMatch = probe.match(/^(?:govt_village_)(.+)$/i)
  if (govtVillageMatch) {
    const rawVillage = govtVillageMatch[1].trim()
    const allGovtContacts: GovernmentContact[] = effectiveStore?.governmentContacts || []
    const asOfDate = params.asOf ? new Date(params.asOf) : new Date()

    const { items: villageContacts } = filterAndSortGovtContacts(allGovtContacts, {
      publicOnly: true,
      village: rawVillage,
      territoryId: territory.id,
      asOf: asOfDate,
      pageSize: 9,
    })

    if (villageContacts.length === 0) {
      return {
        matched: true,
        matchedTrigger: probe,
        flowId: activeFlowId || 'flow_govt_directory',
        nodeId: `govt_village_empty_${rawVillage}`,
        nodeType: 'send_message',
        messageText: `ప్రస్తుతం "${rawVillage}" గ్రామానికి సంబంధించి ధృవీకరించబడిన స్థానిక ప్రజాప్రతినిధులు లేదా ప్రభుత్వ వివరాలు నమోదు కాలేదు.`,
        renderedBody: `ప్రస్తుతం "${rawVillage}" గ్రామానికి సంబంధించి ధృవీకరించబడిన స్థానిక ప్రజాప్రతినిధులు లేదా ప్రభుత్వ వివరాలు నమోదు కాలేదు.`,
        body: `ప్రస్తుతం "${rawVillage}" గ్రామానికి సంబంధించి ధృవీకరించబడిన స్థానిక ప్రజాప్రతినిధులు లేదా ప్రభుత్వ వివరాలు నమోదు కాలేదు.`,
        buttons: [
          { id: 'btn_govt_menu', title: '🏛️ Govt Menu', payload: 'govt_directory' },
        ],
        reason: `No verified contacts found for village "${rawVillage}".`,
      }
    }

    const rows: FlowListRow[] = villageContacts.map((c) => ({
      id: `govt_${c.id}`,
      title: c.name.slice(0, 24),
      description: `${c.phoneNumber ? c.phoneNumber + ' • ' : ''}${c.designation}`.slice(0, 72),
      nextNodeId: `govt_detail_${c.id}`,
    }))

    const listSections: FlowListSection[] = [
      {
        title: `గ్రామం: ${rawVillage}`.slice(0, 24),
        rows,
      },
    ]

    return {
      matched: true,
      matchedTrigger: probe,
      flowId: activeFlowId || 'flow_govt_directory',
      nodeId: `govt_village_list_${rawVillage}`,
      nodeType: 'send_list',
      messageText: `📍 ${rawVillage} ప్రభుత్వ & ప్రజాప్రతినిధుల సంప్రదింపు వివరాలు:`,
      renderedBody: `📍 ${rawVillage} ప్రభుత్వ & ప్రజాప్రతినిధుల సంప్రదింపు వివరాలు:`,
      body: `📍 ${rawVillage} ప్రభుత్వ & ప్రజాప్రతినిధుల సంప్రదింపు వివరాలు:`,
      listSections,
      listButtonText: 'సెలెక్ట్ చేయండి',
      footerText: 'Mana Choutuppal Official Directory',
      govtContacts: villageContacts.map((c) => sanitizeGovtContactForPublic(c, asOfDate)),
    }
  }

  // General Government & Emergency Menu Matching
  const isGovtGeneralQuery =
    probe.toLowerCase() === 'govt' ||
    probe.toLowerCase() === 'government' ||
    probe.toLowerCase() === 'emergency' ||
    probe.toLowerCase() === 'govt_directory' ||
    probe.toLowerCase() === 'అత్యవసరం' ||
    probe.toLowerCase() === 'ప్రభుత్వ' ||
    probe.toLowerCase() === '112' ||
    probe.toLowerCase() === 'police' ||
    probe.toLowerCase() === 'పోలీస్'

  if (isGovtGeneralQuery) {
    const allGovtContacts: GovernmentContact[] = effectiveStore?.governmentContacts || []
    const asOfDate = params.asOf ? new Date(params.asOf) : new Date()

    const emergencyItems = allGovtContacts
      .filter((c) => c.status === 'published' && c.isPublicContact && c.isEmergency)
      .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99))
      .slice(0, 4)

    const emergencyRows: FlowListRow[] = emergencyItems.map((c) => ({
      id: `govt_${c.id}`,
      title: `${c.phoneNumber ? c.phoneNumber + ' ' : ''}${c.name}`.slice(0, 24),
      description: c.designation.slice(0, 72),
      nextNodeId: `govt_detail_${c.id}`,
    }))

    const categoryRows: FlowListRow[] = [
      { id: 'govt_cat_police', title: '🚓 Police & Safety', description: 'పోలీస్ స్టేషన్ మరియు రక్షణ సేవలు' },
      { id: 'govt_cat_ambulance_health', title: '🏥 Health & Hospital', description: 'ప్రభుత్వ ఆసుపత్రులు & అంబులెన్స్' },
      { id: 'govt_cat_revenue_tahsildar', title: '🏛️ Revenue & MRO', description: 'తహశీల్దార్ మరియు రెవెన్యూ కార్యాలయం' },
    ]

    const villageRows: FlowListRow[] = [
      { id: 'govt_village_choutuppal', title: '📍 Choutuppal Town', description: 'చౌటుప్పల్ టౌన్ పరిధిలోని కార్యాలయాలు' },
      { id: 'govt_village_panthangi', title: '📍 Panthangi', description: 'పంతంగి గ్రామ పంచాయతీ పరిధి' },
      { id: 'govt_village_malkapur', title: '📍 Malkapur', description: 'మల్కాపూర్ గ్రామ పంచాయతీ పరిధి' },
    ]

    const listSections: FlowListSection[] = [
      { title: '🚨 అత్యవసర సేవలు (24x7)', rows: emergencyRows },
      { title: '🏛️ ప్రభుత్వ విభాగాలు', rows: categoryRows },
      { title: '📍 గ్రామాల వారీగా', rows: villageRows },
    ]

    const menuText =
      `🏛️ *చౌటుప్పల్ ప్రభుత్వ & అత్యవసర డైరెక్టరీ*\n\n` +
      `నమస్కారం! చౌటుప్పల్ మండలంలోని అధికారిక ప్రభుత్వ కార్యాలయాలు, ప్రజాప్రతినిధులు మరియు 24x7 అత్యవసర సేవల వివరాల కోసం క్రింది ఆప్షన్లలో ఒకదాన్ని ఎంచుకోండి:`

    return {
      matched: true,
      matchedTrigger: probe,
      flowId: 'flow_govt_directory',
      flowName: 'Government & Emergency Directory',
      nodeId: 'node_govt_menu',
      nodeType: 'send_list',
      messageText: menuText,
      renderedBody: menuText,
      body: menuText,
      listSections,
      listButtonText: 'ఆప్షన్స్ చూడండి',
      footerText: 'Mana Choutuppal Official Directory',
    }
  }

  // Filter eligible flows for this territory
  const eligibleFlows = (resolvedFlows || []).filter((f) => {
    // If testing a specific flow
    if (filterFlowId && f.id !== filterFlowId) return false

    // Live mode vs What-If draft mode
    if (!allowDraft) {
      const isLive = f.status === 'published' || (f.isActive === true && f.status !== 'draft' && f.status !== 'paused')
      if (!isLive) return false
    } else {
      if (f.status === 'archived') return false
    }

    // Territory scoping
    if (f.territoryId && f.territoryId !== 'ALL' && f.territoryId !== territory.id) {
      return false
    }

    return true
  })

  if (eligibleFlows.length === 0) {
    return {
      matched: false,
      reason: allowDraft
        ? 'No candidate flows found for territory'
        : 'No published flows eligible for territory (draft/paused flows are inactive)',
    }
  }

  let matchedFlow: WhatsAppFlow | undefined
  let targetNodeId: string | undefined
  let matchedTrigger: string | undefined

  // Helper to find button or list row transition in a node
  const findTransitionInNode = (node: FlowNode): { nextNodeId: string; triggerText: string } | null => {
    if (!probe) return null

    // 1. Check buttons
    const btn = (node.config?.buttons || []).find(
      (b) =>
        b.id === probe ||
        b.payload === probe ||
        b.title.toLowerCase() === probe.toLowerCase()
    )
    if (btn && btn.nextNodeId) {
      return { nextNodeId: btn.nextNodeId, triggerText: btn.payload || btn.title }
    }

    // 2. Check list sections & rows
    const listRow = (node.config?.listSections || [])
      .flatMap((s) => s.rows || [])
      .find(
        (r) =>
          r.id === probe ||
          r.title.toLowerCase() === probe.toLowerCase()
      )
    if (listRow && listRow.nextNodeId) {
      return { nextNodeId: listRow.nextNodeId, triggerText: listRow.title || listRow.id }
    }

    return null
  }

  // A. Check if activeNodeId has a matching transition (interactive conversation context)
  if (activeNodeId) {
    const activeFlow = eligibleFlows.find((f) =>
      filterFlowId ? f.id === filterFlowId : (f.nodes || []).some((n) => n.id === activeNodeId)
    )
    if (activeFlow && activeFlow.nodes) {
      const currentNode = activeFlow.nodes.find((n) => n.id === activeNodeId)
      if (currentNode) {
        const tr = findTransitionInNode(currentNode)
        if (tr) {
          matchedFlow = activeFlow
          targetNodeId = tr.nextNodeId
          matchedTrigger = tr.triggerText
        } else if (pageMatch) {
          // Pagination stay on active listing node
          matchedFlow = activeFlow
          targetNodeId = currentNode.id
          matchedTrigger = probe
        }
      }
    }
  }

  if (!matchedFlow && (cleanPayload || cleanButtonTitle)) {
    // B. Check if active flow has a matching button/list transition
    if (activeFlowId) {
      const activeFlow = eligibleFlows.find((f) => f.id === activeFlowId)
      if (activeFlow && activeFlow.nodes) {
        // If activeNodeId is specified, check that specific node first
        if (activeNodeId) {
          const currentNode = activeFlow.nodes.find((n) => n.id === activeNodeId)
          if (currentNode) {
            const tr = findTransitionInNode(currentNode)
            if (tr) {
              matchedFlow = activeFlow
              targetNodeId = tr.nextNodeId
              matchedTrigger = tr.triggerText
            }
          }
        }

        if (!matchedFlow) {
          for (const n of activeFlow.nodes) {
            const tr = findTransitionInNode(n)
            if (tr) {
              matchedFlow = activeFlow
              targetNodeId = tr.nextNodeId
              matchedTrigger = tr.triggerText
              break
            }
          }
        }
      }
    }

    // B. Search across all eligible flows for a button, list, or trigger matching this payload/title
    if (!matchedFlow) {
      for (const flow of eligibleFlows) {
        for (const n of flow.nodes || []) {
          const tr = findTransitionInNode(n)
          if (tr) {
            matchedFlow = flow
            targetNodeId = tr.nextNodeId
            matchedTrigger = tr.triggerText
            break
          }
        }
        if (matchedFlow) break

        const matchedTrigObj = (flow.triggers || []).find(
          (t) => t.value.toLowerCase() === probe.toLowerCase()
        )
        if (matchedTrigObj) {
          matchedFlow = flow
          targetNodeId = flow.entryNodeId || flow.nodes?.[0]?.id || 'start'
          matchedTrigger = matchedTrigObj.value
          break
        }
      }
    }
  }

  // 3. Keyword Trigger Matching
  if (!matchedFlow && cleanText) {
    const getFlowTriggers = (f: WhatsAppFlow): Array<{ value: string }> => {
      const trigs: Array<{ value: string }> = [...(f.triggers || [])]
      if (f.trigger_keywords) {
        const kws = Array.isArray(f.trigger_keywords)
          ? f.trigger_keywords
          : String(f.trigger_keywords).split(/[,;]/).map((k) => k.trim())
        kws.forEach((kw) => {
          if (kw && !trigs.some((t) => t.value.toLowerCase() === kw.toLowerCase())) {
            trigs.push({ value: kw })
          }
        })
      }
      return trigs
    }

    // Exact match passes first
    for (const flow of eligibleFlows) {
      const exactMatch = getFlowTriggers(flow).find((t) => {
        const val = t.value.trim().toLowerCase()
        return val === lowerText || val === cleanText
      })
      if (exactMatch) {
        matchedFlow = flow
        targetNodeId = flow.entryNodeId || flow.nodes?.[0]?.id || 'start'
        matchedTrigger = exactMatch.value
        break
      }
    }

    // Keyword inclusion passes second
    if (!matchedFlow) {
      for (const flow of eligibleFlows) {
        const keywordMatch = getFlowTriggers(flow).find((t) => {
          const val = t.value.trim().toLowerCase()
          if (!val) return false
          if (val.length <= 3) {
            return lowerText === val || lowerText.split(/\s+/).includes(val)
          }
          return lowerText.includes(val)
        })
        if (keywordMatch) {
          matchedFlow = flow
          targetNodeId = flow.entryNodeId || flow.nodes?.[0]?.id || 'start'
          matchedTrigger = keywordMatch.value
          break
        }
      }
    }
  }

  if (!matchedFlow) {
    return { matched: false, reason: 'No matching flow triggers found' }
  }

  // 4. Resolve Node & Graph Navigation
  const nodes = matchedFlow.nodes || []
  let activeNode: FlowNode | undefined

  if (targetNodeId) {
    activeNode = nodes.find((n) => n.id === targetNodeId)
  }

  // If active node was 'start' or not found, advance to entry message
  if (!activeNode || activeNode.type === 'start') {
    const entryId = activeNode?.config?.nextNodeId || matchedFlow.entryNodeId || 'entry_message'
    activeNode = nodes.find((n) => n.id === entryId) || nodes[0]
  }

  // Handle cross-flow routing (goto_flow_...)
  if (activeNode?.config?.targetFlowId) {
    const targetFlow = eligibleFlows.find((f) => f.id === activeNode?.config?.targetFlowId)
    if (targetFlow) {
      matchedFlow = targetFlow
      const targetEntry = targetFlow.entryNodeId || 'entry_message'
      activeNode = (targetFlow.nodes || []).find((n) => n.id === targetEntry) || targetFlow.nodes?.[0]
    }
  }

  if (!activeNode) {
    // Fallback to flow initial_message
    const rawMsg = matchedFlow.initial_message || matchedFlow.description || 'Welcome!'
    const text = interpolateVariables(rawMsg, {
      contactName: senderName,
      contactPhone: senderPhone,
      territoryName,
      townUrl,
      townPhone: territory.contactPhone,
    })

    const buttons = (matchedFlow.button_options || []).slice(0, 3).map((b, i) => ({
      id: `btn_${i + 1}`,
      title: b,
      payload: b,
      nextNodeId: `action_node_${i + 1}`,
    }))

    return {
      matched: true,
      matchedTrigger,
      flowId: matchedFlow.id,
      flowName: matchedFlow.name,
      nodeId: 'entry_fallback',
      nodeType: 'send_message',
      messageText: text,
      renderedBody: text,
      imageUrl: matchedFlow.imageUrl,
      selectedMedia: matchedFlow.imageUrl,
      buttons,
      nextNodeTransition: buttons[0]?.nextNodeId,
    }
  }

  // 5. Directory Listing Lookup & Sequence Ordering (Strict Publication & Territory Isolation)
  let attachedListing: Listing | undefined
  let listingNotice: string | undefined
  let sortedListingsResult: Array<{
    id: string
    title: string
    slug: string
    categoryName?: string
    categoryId?: string
    phone: string
    address: string
    url: string
    coverImage?: string
    isFeatured?: boolean
    isPremium?: boolean
    createdAt?: string
  }> | undefined
  let paginationResult: {
    currentPage: number
    totalPages: number
    pageSize: number
    totalCount: number
    hasNextPage: boolean
    hasPrevPage: boolean
  } | undefined
  let dynamicListSections: FlowListSection[] | undefined

  if (activeNode.config.listingId || activeNode.config.listingSlug) {
    const candidate = storeListings.find(
      (l) => l.id === activeNode?.config.listingId || l.slug === activeNode?.config.listingSlug
    )
    if (candidate) {
      const isPublished = ['published', 'approved', 'APPROVED'].includes(candidate.status)
      const candidateTerritory = candidate.territoryId || 'territory_choutuppal'
      const isAccessible = territory.id === 'ALL' || candidateTerritory === territory.id

      if (isPublished && isAccessible) {
        attachedListing = candidate
      } else if (!isPublished) {
        listingNotice = `Listing "${candidate.title}" is in ${candidate.status} status (not published/approved) and withheld from public bot.`
      } else {
        listingNotice = `Listing "${candidate.title}" belongs to different territory "${candidateTerritory}" and is inaccessible from "${territory.id}".`
      }
    } else {
      listingNotice = `Listing ID "${activeNode.config.listingId || activeNode.config.listingSlug}" not found in directory.`
    }
  } else {
    // Check if listing sequence / order / category browsing is configured
    const isListingSequence =
      Boolean(activeNode.config.listingCategory) ||
      Boolean(activeNode.config.listingSortOrder && activeNode.config.listingSortOrder.length > 0) ||
      Boolean(activeNode.config.listingSortMode) ||
      Boolean(activeNode.config.categoryPriority && activeNode.config.categoryPriority.length > 0) ||
      activeNode.type === 'send_list' ||
      activeNode.type === 'send_listing' ||
      Boolean(matchedFlow.listingSortMode) ||
      Boolean(matchedFlow.listingSortOrder && matchedFlow.listingSortOrder.length > 0) ||
      Boolean(matchedFlow.categoryPriority && matchedFlow.categoryPriority.length > 0) ||
      matchedFlow.type === 'LISTINGS_WITH_PHOTOS'

    if (isListingSequence) {
      const settings = resolveListingSettings(activeNode, matchedFlow)
      const sorted = sortAndFilterListings(storeListings, {
        territoryId: territory.id,
        category: settings.category,
        sortMode: settings.sortMode,
        manualOrder: settings.manualOrder,
        categoryPriority: settings.categoryPriority,
        requirePublished: true,
        store: effectiveStore,
        asOf: params.asOf,
      })

      const totalCount = sorted.length
      const pageSize = settings.pageSize
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
      const currentPage = Math.min(Math.max(requestedPage, 1), totalPages)
      const pageStart = (currentPage - 1) * pageSize
      const pageEnd = pageStart + pageSize
      const pageItems = sorted.slice(pageStart, pageEnd)
      const hasNextPage = currentPage < totalPages
      const hasPrevPage = currentPage > 1

      paginationResult = {
        currentPage,
        totalPages,
        pageSize,
        totalCount,
        hasNextPage,
        hasPrevPage,
      }

      sortedListingsResult = sorted.map((l) => {
        let isFeatured = l.isFeatured
        let isPremium = l.isPremium
        if (effectiveStore) {
          const ent = resolveListingEntitlements(l.id, effectiveStore, params.asOf)
          isFeatured = ent.isFeatured
          isPremium = ent.isPremium
        }
        return {
          id: l.id,
          title: l.title,
          slug: l.slug,
          categoryName: l.categoryName || l.categoryId,
          categoryId: l.categoryId,
          phone: l.phone,
          address: l.address,
          url: `${townUrl}/business/${l.slug}`,
          coverImage: l.coverImage,
          isFeatured,
          isPremium,
          createdAt: l.createdAt,
        }
      })

      if (pageItems.length > 0) {
        attachedListing = pageItems[0]
      }

      // If listSections is not statically configured, construct dynamic list rows
      if (!activeNode.config.listSections || activeNode.config.listSections.length === 0) {
        const rows: FlowListRow[] = pageItems.map((item) => {
          let badge = ''
          if (effectiveStore) {
            const ent = resolveListingEntitlements(item.id, effectiveStore, params.asOf)
            if (ent.isFeatured) badge = '⭐ '
            else if (ent.isPremium) badge = '💎 '
          } else if (item.isFeatured) {
            badge = '⭐ '
          }
          const rawTitle = `${badge}${item.title || ''}`
          return {
            id: `listing_${item.id}`,
            title: rawTitle.slice(0, 24),
            description: `${item.categoryName || item.categoryId || ''} • ${item.phone || item.address || ''}`.slice(0, 72),
            nextNodeId: `listing_detail_${item.id}`,
          }
        })

        if (hasNextPage) {
          rows.push({
            id: `page_${currentPage + 1}`,
            title: `➡️ Next (${currentPage + 1}/${totalPages})`.slice(0, 24),
            description: `View next ${Math.min(pageSize, totalCount - pageEnd)} businesses`,
            nextNodeId: activeNode.id,
          })
        }

        if (hasPrevPage) {
          rows.push({
            id: `page_${currentPage - 1}`,
            title: `⬅️ Previous (${currentPage - 1}/${totalPages})`.slice(0, 24),
            description: `View previous batch of businesses`,
            nextNodeId: activeNode.id,
          })
        }

        if (rows.length > 0) {
          const catLabel = settings.category ? ` - ${settings.category}` : ''
          dynamicListSections = [
            {
              title: `Businesses (${currentPage}/${totalPages})${catLabel}`.slice(0, 24),
              rows,
            },
          ]
        }
      }
    }
  }

  // 6. Interpolate Text Variables
  const rawBody = activeNode.config.text || matchedFlow.initial_message || matchedFlow.description || ''
  let resolvedText = interpolateVariables(rawBody, {
    contactName: senderName,
    contactPhone: senderPhone,
    territoryName,
    townUrl,
    townPhone: territory.contactPhone,
    listing: attachedListing,
  })

  // If text is empty/default and sequence is paginated, provide clear overview
  if (!resolvedText.trim() && paginationResult && sortedListingsResult) {
    const pageStart = (paginationResult.currentPage - 1) * paginationResult.pageSize
    const pageItems = sortedListingsResult.slice(pageStart, pageStart + paginationResult.pageSize)
    const listLines = pageItems.map((l, i) => `${pageStart + i + 1}. *${l.title}* (${l.categoryName || l.categoryId})\n   📍 ${l.address || 'చౌటుప్పల్'} | 📞 ${l.phone}`).join('\n\n')
    resolvedText = `*చౌటుప్పల్ వ్యాపారాలు & సేవలు (Page ${paginationResult.currentPage}/${paginationResult.totalPages}):*\n\n${listLines}\n\n🌐 https://choutuppal.in`
  }

  const resolvedFooter = activeNode.config.footerText
    ? interpolateVariables(activeNode.config.footerText, {
        contactName: senderName,
        contactPhone: senderPhone,
        territoryName,
        townUrl,
        townPhone: territory.contactPhone,
      })
    : undefined

  // Media resolution (Image or Video)
  let imageUrl = activeNode.config.mediaUrl || matchedFlow.imageUrl
  if (!imageUrl && attachedListing?.coverImage) {
    imageUrl = attachedListing.coverImage
  }

  const mediaType: 'image' | 'video' | 'document' =
    activeNode.config.mediaType ||
    (imageUrl && /\.(mp4|mov|avi|webm)(\?.*)?$/i.test(imageUrl) ? 'video' : 'image')

  // Interactive buttons
  const buttons: Array<{ id: string; title: string; payload?: string; nextNodeId?: string }> = []
  if (Array.isArray(activeNode.config.buttons) && activeNode.config.buttons.length > 0) {
    activeNode.config.buttons.slice(0, 3).forEach((btn) => {
      buttons.push({
        id: btn.id || btn.payload || btn.title,
        title: btn.title.slice(0, 20),
        payload: btn.payload || btn.title,
        nextNodeId: btn.nextNodeId,
      })
    })
  } else if (Array.isArray(matchedFlow.button_options) && matchedFlow.button_options.length > 0) {
    matchedFlow.button_options.slice(0, 3).forEach((label, i) => {
      buttons.push({
        id: `btn_${i + 1}`,
        title: label.slice(0, 20),
        payload: label,
        nextNodeId: `action_node_${i + 1}`,
      })
    })
  } else if (
    !activeNode.config.listSections &&
    !dynamicListSections &&
    sortedListingsResult &&
    paginationResult &&
    paginationResult.pageSize <= 3
  ) {
    const pageStart = (paginationResult.currentPage - 1) * paginationResult.pageSize
    const pageItems = sortedListingsResult.slice(pageStart, pageStart + paginationResult.pageSize)
    pageItems.slice(0, 2).forEach((b) => {
      buttons.push({
        id: `listing_${b.id}`,
        title: b.title.slice(0, 20),
        payload: `listing_${b.id}`,
        nextNodeId: `listing_detail_${b.id}`,
      })
    })
    if (paginationResult.hasNextPage) {
      buttons.push({
        id: `page_${paginationResult.currentPage + 1}`,
        title: `➡️ Next (${paginationResult.currentPage + 1}/${paginationResult.totalPages})`.slice(0, 20),
        payload: `page_${paginationResult.currentPage + 1}`,
        nextNodeId: activeNode.id,
      })
    } else if (paginationResult.hasPrevPage) {
      buttons.push({
        id: `page_${paginationResult.currentPage - 1}`,
        title: `⬅️ Prev (${paginationResult.currentPage - 1}/${paginationResult.totalPages})`.slice(0, 20),
        payload: `page_${paginationResult.currentPage - 1}`,
        nextNodeId: activeNode.id,
      })
    }
  }

  const nextNodeTransition =
    activeNode.config.nextNodeId || (buttons.length > 0 ? buttons[0].nextNodeId : undefined)

  return {
    matched: true,
    matchedTrigger,
    flowId: matchedFlow.id,
    flowName: matchedFlow.name,
    nodeId: activeNode.id,
    nodeType: activeNode.type,
    messageText: resolvedText,
    renderedBody: resolvedText,
    body: resolvedText,
    imageUrl,
    mediaUrl: imageUrl,
    mediaType,
    selectedMedia: imageUrl,
    buttons: buttons.length > 0 ? buttons : undefined,
    listSections: activeNode.config.listSections || dynamicListSections,
    renderedListOptions: (activeNode.config.listSections || dynamicListSections || []).flatMap((s) =>
      (s.rows || []).map((r) => ({ id: r.id, title: r.title, description: r.description }))
    ),
    listButtonText: activeNode.config.listButtonText || (dynamicListSections ? 'వ్యాపారాలు చూడండి (View)' : undefined),
    footerText: resolvedFooter,
    templateSlug: matchedFlow.template_slug,
    nextNodeId: activeNode.config.nextNodeId,
    nextNodeTransition,
    attachedListing: attachedListing
      ? {
          id: attachedListing.id,
          title: attachedListing.title,
          slug: attachedListing.slug,
          phone: attachedListing.phone,
          address: attachedListing.address,
          url: `${townUrl}/business/${attachedListing.slug}`,
          coverImage: attachedListing.coverImage,
        }
      : undefined,
    listing: attachedListing
      ? {
          id: attachedListing.id,
          title: attachedListing.title,
          slug: attachedListing.slug,
          phone: attachedListing.phone,
          address: attachedListing.address,
          url: `${townUrl}/business/${attachedListing.slug}`,
          coverImage: attachedListing.coverImage,
        }
      : undefined,
    sortedListings: sortedListingsResult,
    pagination: paginationResult,
    tagToAdd: activeNode.config.tagToAdd,
    stageToUpdate: activeNode.config.stageToUpdate,
    reason: listingNotice || undefined,
  }
}
