/**
 * Canonical Flow CSV Parser & Graph Linker
 * Parses WhatsApp Flow CSVs, preserves Telugu Unicode & custom message text,
 * builds canonical FlowNode graphs, and deterministically links multi-row conversational trees.
 */

import type { WhatsAppFlow, FlowNode, FlowNodeType, FlowButton, FlowListSection, FlowTrigger, FlowStatus, ListingSortMode } from './types'

export interface ParsedFlowRecord extends WhatsAppFlow {
  rawLineIndex?: number
}

export interface ParseFlowCsvOptions {
  defaultStatus?: FlowStatus
  defaultTerritoryId?: string
  autoLinkNodes?: boolean
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/**
 * Tokenize a CSV string into rows of columns, properly handling:
 * - Multiline quoted fields
 * - Escaped double quotes ("")
 * - UTF-8 BOM
 * - Windows (\r\n) and Unix (\n) line endings
 */
export function tokenizeCsv(csvText: string): Array<{ row: string[]; lineNum: number }> {
  const clean = csvText.replace(/^\uFEFF/, '')
  const results: Array<{ row: string[]; lineNum: number }> = []

  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  let startLine = 1
  let currentLine = 1

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    const nextChar = clean[i + 1]

    if (char === '\n') {
      currentLine++
    }

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentField += '"'
          i++
        } else {
          // Closing quote
          inQuotes = false
        }
      } else {
        currentField += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        currentRow.push(currentField)
        currentField = ''
      } else if (char === '\r') {
        // Ignore standalone \r or handled by \n
        if (nextChar === '\n') {
          i++
          currentLine++
        }
        currentRow.push(currentField)
        results.push({ row: currentRow, lineNum: startLine })
        currentRow = []
        currentField = ''
        startLine = currentLine
      } else if (char === '\n') {
        currentRow.push(currentField)
        results.push({ row: currentRow, lineNum: startLine })
        currentRow = []
        currentField = ''
        startLine = currentLine
      } else {
        currentField += char
      }
    }
  }

  // Push final field/row if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField)
    results.push({ row: currentRow, lineNum: startLine })
  }

  return results
}

export function parseFlowCsvContent(
  text: string,
  options?: ParseFlowCsvOptions
): {
  flows: WhatsAppFlow[]
  errors: Array<{ line: number; message: string }>
  warnings: Array<{ line: number; message: string }>
  detectedMappings?: Record<string, string | null>
} {
  const defaultStatus: FlowStatus = options?.defaultStatus || 'draft'
  const defaultTerritoryId: string = options?.defaultTerritoryId || 'territory_choutuppal'
  const autoLink: boolean = options?.autoLinkNodes !== false

  const tokenized = tokenizeCsv(text)
  const firstNonEmptyIdx = tokenized.findIndex((t) => t.row.some((cell) => cell.trim().length > 0))

  if (firstNonEmptyIdx === -1 || tokenized.length < 2) {
    return {
      flows: [],
      errors: [{ line: 1, message: 'CSV file is empty or missing data rows.' }],
      warnings: [],
      detectedMappings: {},
    }
  }

  const headerItem = tokenized[firstNonEmptyIdx]
  const headers = headerItem.row.map((h) => h.trim().toLowerCase().replace(/["']/g, ''))

  // Check for duplicate headers
  const headerCounts = new Map<string, number>()
  const duplicateHeaders: string[] = []
  headers.forEach((h) => {
    if (!h) return
    const count = (headerCounts.get(h) || 0) + 1
    headerCounts.set(h, count)
    if (count === 2) duplicateHeaders.push(h)
  })

  const findHeaderIdx = (aliases: string[]): number => {
    for (const alias of aliases) {
      const idx = headers.indexOf(alias)
      if (idx >= 0) return idx
    }
    return -1
  }

  const nameIdx = findHeaderIdx(['name', 'flow_name', 'flowname', 'title', 'flow_title'])
  const triggerTypeIdx = findHeaderIdx(['trigger_type', 'triggertype', 'type', 'trigger_kind'])
  const triggerKeywordsIdx = findHeaderIdx(['trigger_keywords', 'triggerkeywords', 'keywords', 'triggers', 'trigger_keyword', 'triggerkeyword'])
  const initialMessageIdx = findHeaderIdx(['initial_message', 'initialmessage', 'message', 'body', 'message_body', 'text', 'message_text'])
  const buttonOptionsIdx = findHeaderIdx(['button_options', 'buttonoptions', 'buttons', 'options', 'quick_replies', 'quickreplies'])
  const templateSlugIdx = findHeaderIdx(['template_slug', 'templateslug', 'template', 'meta_template'])
  const descriptionIdx = findHeaderIdx(['description', 'desc', 'notes', 'workflow_description'])
  const imageUrlIdx = findHeaderIdx(['image_url', 'imageurl', 'image', 'photo_url', 'photo'])
  const mediaUrlIdx = findHeaderIdx(['media_url', 'mediaurl', 'video_url', 'videourl', 'video', 'media'])
  const mediaTypeIdx = findHeaderIdx(['media_type', 'mediatype', 'media_kind', 'mediakind', 'type_media'])
  const listingIdIdx = findHeaderIdx(['listing_id', 'listingid', 'listing', 'business_id'])
  const listingSlugIdx = findHeaderIdx(['listing_slug', 'listingslug', 'slug', 'business_slug'])
  const buttonPayloadsIdx = findHeaderIdx(['button_payloads', 'buttonpayloads', 'payloads', 'button_ids', 'buttonids'])
  const nextNodeIdx = findHeaderIdx(['next_node_ids', 'next_node_id', 'next_nodes', 'nextnodeid', 'next_node', 'target_nodes'])
  const listOptionsIdx = findHeaderIdx(['list_options', 'listoptions', 'list_sections', 'menu_options', 'list_rows'])
  const listingSortModeIdx = findHeaderIdx(['listing_sort_mode', 'listingsortmode', 'sort_mode', 'sortmode', 'listing_order_mode'])
  const categoryPriorityIdx = findHeaderIdx(['category_priority', 'categorypriority', 'category_order', 'categories_order', 'categoriesorder'])
  const listingSortOrderIdx = findHeaderIdx(['listing_sort_order', 'listingsortorder', 'listing_order', 'listingorder', 'listing_ids', 'listingids'])
  const listingPageSizeIdx = findHeaderIdx(['listing_page_size', 'listingpagesize', 'page_size', 'pagesize', 'batch_size'])
  const statusIdx = findHeaderIdx(['status', 'flow_status', 'state'])
  const territoryIdx = findHeaderIdx(['territory_id', 'territoryid', 'territory', 'town_id', 'townid'])

  if (duplicateHeaders.length > 0) {
    return {
      flows: [],
      errors: [
        {
          line: headerItem.lineNum,
          message: `Duplicate headers detected in CSV: ${duplicateHeaders.join(', ')}. Each column header must be unique.`,
        },
      ],
      warnings: [],
      detectedMappings: {},
    }
  }

  if (nameIdx === -1) {
    return {
      flows: [],
      errors: [
        {
          line: headerItem.lineNum,
          message: 'Missing required header: "name" (or "flow_name") must be present.',
        },
      ],
      warnings: [],
      detectedMappings: {},
    }
  }

  const rawFlows: Array<{
    lineNum: number
    id: string
    name: string
    triggerType: 'keyword' | 'first_inbound_message' | 'manual'
    keywords: string[]
    message: string
    buttons: string[]
    buttonPayloads?: string[]
    explicitNextNodes?: string[]
    listOptions?: string[]
    templateSlug?: string
    description: string
    imageUrl?: string
    mediaUrl?: string
    mediaType?: 'image' | 'video'
    listingId?: string
    listingSlug?: string
    listingSortMode?: ListingSortMode
    categoryPriority?: string[]
    listingSortOrder?: string[]
    listingPageSize?: number
    status: FlowStatus
    territoryId: string
  }> = []

  const errors: Array<{ line: number; message: string }> = []
  const warnings: Array<{ line: number; message: string }> = []
  const usedIds = new Set<string>()

  // Pass 1: Parse and validate rows
  for (let i = firstNonEmptyIdx + 1; i < tokenized.length; i++) {
    const item = tokenized[i]
    const row = item.row
    if (row.every((cell) => cell.trim().length === 0)) continue

    if (row.length !== headers.length) {
      warnings.push({
        line: item.lineNum,
        message: `Row column count (${row.length}) differs from header count (${headers.length}). Some fields may be shifted or empty.`,
      })
    }

    const name = row[nameIdx]?.trim()
    const rawTrigger = triggerTypeIdx >= 0 ? row[triggerTypeIdx]?.trim().toLowerCase() : 'keyword'

    if (!name) {
      errors.push({ line: item.lineNum, message: 'Missing flow name.' })
      continue
    }

    const triggerType: 'keyword' | 'first_inbound_message' | 'manual' =
      rawTrigger === 'first_inbound_message' || rawTrigger === 'manual' ? rawTrigger : 'keyword'

    const rawKeywords = triggerKeywordsIdx >= 0 ? row[triggerKeywordsIdx]?.trim() : ''
    const keywords: string[] = rawKeywords
      ? rawKeywords
          .split(/[,;]/)
          .map((k) => k.trim())
          .filter(Boolean)
      : ['hi', 'menu']

    const rawMsg = initialMessageIdx >= 0 ? row[initialMessageIdx]?.trim() : ''
    const message = rawMsg ? rawMsg.replace(/\\n/g, '\n') : 'Welcome to Choutuppal App!'

    const rawButtons = buttonOptionsIdx >= 0 ? row[buttonOptionsIdx]?.trim() : ''
    const buttons: string[] = rawButtons
      ? rawButtons
          .split(/[,;]/)
          .map((b) => b.trim())
          .filter(Boolean)
      : []

    const rawButtonPayloads = buttonPayloadsIdx >= 0 ? row[buttonPayloadsIdx]?.trim() : ''
    const buttonPayloads: string[] = rawButtonPayloads
      ? rawButtonPayloads.split(/[,;]/).map((p) => p.trim()).filter(Boolean)
      : []

    const rawNextNodes = nextNodeIdx >= 0 ? row[nextNodeIdx]?.trim() : ''
    const explicitNextNodes: string[] = rawNextNodes
      ? rawNextNodes.split(/[,;]/).map((n) => n.trim()).filter(Boolean)
      : []

    const rawListOptions = listOptionsIdx >= 0 ? row[listOptionsIdx]?.trim() : ''
    const listOptions: string[] = rawListOptions
      ? rawListOptions.split(/[,;]/).map((o) => o.trim()).filter(Boolean)
      : []

    const templateSlug = templateSlugIdx >= 0 ? row[templateSlugIdx]?.trim() || undefined : undefined
    const description = descriptionIdx >= 0 ? row[descriptionIdx]?.trim() || '' : ''

    let imageUrl: string | undefined = imageUrlIdx >= 0 ? row[imageUrlIdx]?.trim() : undefined
    if (!imageUrl) {
      const match = message.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp))/i)
      if (match) imageUrl = match[1]
    }

    let mediaUrl: string | undefined = mediaUrlIdx >= 0 ? row[mediaUrlIdx]?.trim() : undefined
    if (!mediaUrl) {
      const match = message.match(/(https?:\/\/[^\s]+\.(?:mp4|mov|avi|webm))/i)
      if (match) mediaUrl = match[1]
    }
    if (!mediaUrl && imageUrl) {
      mediaUrl = imageUrl
    }

    if (buttons.length > 3) {
      warnings.push({
        line: item.lineNum,
        message: `Flow "${name}" defines ${buttons.length} buttons (Meta WhatsApp allows max 3 quick-replies). Automatically converted to interactive list format.`,
      })
    }
    buttons.forEach((btn) => {
      if (btn.length > 20) {
        warnings.push({
          line: item.lineNum,
          message: `Button "${btn}" exceeds Meta limit (20 characters). It will be truncated to 20 characters.`,
        })
      }
    })
    if (mediaUrl && !/^https:\/\//i.test(mediaUrl)) {
      warnings.push({
        line: item.lineNum,
        message: `Media URL "${mediaUrl}" is not secure HTTPS. Meta WhatsApp API requires HTTPS; non-HTTPS URLs will fall back to text message.`,
      })
    }

    const rawMediaType = mediaTypeIdx >= 0 ? row[mediaTypeIdx]?.trim().toLowerCase() : undefined
    const isVideo =
      rawMediaType === 'video' ||
      (mediaUrl && /\.(mp4|mov|avi|webm)(\?.*)?$/i.test(mediaUrl))
    const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image'

    const listingId = listingIdIdx >= 0 ? row[listingIdIdx]?.trim() || undefined : undefined
    const listingSlug = listingSlugIdx >= 0 ? row[listingSlugIdx]?.trim() || undefined : undefined

    const rawSortMode = listingSortModeIdx >= 0 ? row[listingSortModeIdx]?.trim().toLowerCase() : ''
    const validSortModes: ListingSortMode[] = ['manual', 'category_priority', 'newest', 'alphabetical', 'featured']
    const listingSortMode: ListingSortMode | undefined = validSortModes.includes(rawSortMode as ListingSortMode)
      ? (rawSortMode as ListingSortMode)
      : undefined

    const rawCatPriority = categoryPriorityIdx >= 0 ? row[categoryPriorityIdx]?.trim() : ''
    const categoryPriority: string[] = rawCatPriority
      ? rawCatPriority.split(/[,;]/).map((c) => c.trim()).filter(Boolean)
      : []

    const rawSortOrder = listingSortOrderIdx >= 0 ? row[listingSortOrderIdx]?.trim() : ''
    const listingSortOrder: string[] = rawSortOrder
      ? rawSortOrder.split(/[,;]/).map((l) => l.trim()).filter(Boolean)
      : []

    const rawPageSize = listingPageSizeIdx >= 0 ? parseInt(row[listingPageSizeIdx]?.trim(), 10) : NaN
    const listingPageSize: number | undefined = !isNaN(rawPageSize) && rawPageSize > 0 ? Math.min(rawPageSize, 10) : undefined

    let status: FlowStatus = defaultStatus
    if (statusIdx >= 0 && row[statusIdx]?.trim()) {
      const s = row[statusIdx].trim().toLowerCase()
      if (s === 'published' || s === 'active') status = 'published'
      else if (s === 'paused') status = 'paused'
      else if (s === 'archived') status = 'archived'
      else if (s === 'draft') status = 'draft'
    }

    const territoryId = territoryIdx >= 0 && row[territoryIdx]?.trim() ? row[territoryIdx].trim() : defaultTerritoryId

    // Generate deterministic slug ID
    let baseId = `flow_${slugify(name) || 'item'}`
    let uniqueId = baseId
    let counter = 1
    while (usedIds.has(uniqueId)) {
      counter++
      uniqueId = `${baseId}_${counter}`
    }
    usedIds.add(uniqueId)

    rawFlows.push({
      lineNum: item.lineNum,
      id: uniqueId,
      name,
      triggerType,
      keywords,
      message,
      buttons,
      buttonPayloads,
      explicitNextNodes,
      listOptions,
      templateSlug,
      description,
      imageUrl,
      mediaUrl,
      mediaType,
      listingId,
      listingSlug,
      listingSortMode,
      categoryPriority: categoryPriority.length > 0 ? categoryPriority : undefined,
      listingSortOrder: listingSortOrder.length > 0 ? listingSortOrder : undefined,
      listingPageSize,
      status,
      territoryId,
    })
  }

  // Pass 2: Keyword index for intelligent conversational multi-row graph auto-linking
  const keywordToFlowMap = new Map<string, string>()
  if (autoLink) {
    for (const rf of rawFlows) {
      for (const kw of rf.keywords) {
        const normalized = kw.trim().toLowerCase()
        if (normalized && !keywordToFlowMap.has(normalized)) {
          keywordToFlowMap.set(normalized, rf.id)
        }
      }
    }
  }

  // Pass 3: Construct canonical WhatsAppFlow models with rich FlowNode graphs
  const flows: WhatsAppFlow[] = rawFlows.map((rf) => {
    const triggers: FlowTrigger[] = rf.keywords.map((kw) => ({
      type: 'keyword',
      value: kw,
      territoryId: rf.territoryId,
    }))

    const nodes: FlowNode[] = [
      {
        id: 'start',
        type: 'start',
        name: 'Flow Entry Trigger',
        config: { nextNodeId: 'entry_message' },
        positionX: 100,
        positionY: 100,
      },
    ]

    const flowButtons: FlowButton[] = []
    const actionNodes: FlowNode[] = []

    if (rf.buttons.length > 0) {
      rf.buttons.slice(0, 3).forEach((btnLabel, idx) => {
        const btnId = `btn_${idx + 1}`
        const normalizedLabel = btnLabel.trim().toLowerCase()
        const targetFlowId = autoLink ? keywordToFlowMap.get(normalizedLabel) : undefined

        const explicitPayload = rf.buttonPayloads?.[idx]
        const explicitNextNode = rf.explicitNextNodes?.[idx]

        let nextNodeId: string = explicitNextNode || ''
        if (!nextNodeId) {
          if (targetFlowId && targetFlowId !== rf.id) {
            // Auto-linked to destination flow
            nextNodeId = `goto_${targetFlowId}`
            actionNodes.push({
              id: nextNodeId,
              type: 'send_message',
              name: `Route to ${btnLabel}`,
              config: {
                targetFlowId,
                text: `Navigating to ${btnLabel}...`,
                nextNodeId: 'end_terminal',
              },
              positionX: 100 + (idx - 1) * 260,
              positionY: 380,
            })
          } else {
            // Standard response node
            nextNodeId = `action_node_${idx + 1}`
            actionNodes.push({
              id: nextNodeId,
              type: 'send_message',
              name: `Action ${btnLabel}`,
              config: {
                text: `ధన్యవాదాలు! మీరు "${btnLabel}" ఎంచుకున్నారు. వివరాలు త్వరలో రానున్నాయి.\n\n🌐 https://choutuppal.in`,
                nextNodeId: 'end_terminal',
              },
              positionX: 100 + (idx - 1) * 260,
              positionY: 380,
            })
          }
        }

        flowButtons.push({
          id: btnId,
          title: btnLabel.slice(0, 20),
          action: 'BUTTON_REPLY',
          payload: explicitPayload || btnLabel,
          nextNodeId,
        })
      })

      // If more than 3 options were provided, or listOptions specified, construct list sections
      const listSections: FlowListSection[] = []
      const listItems = rf.listOptions && rf.listOptions.length > 0 ? rf.listOptions : (rf.buttons.length > 3 ? rf.buttons : [])
      if (listItems.length > 0) {
        listSections.push({
          title: 'Options',
          rows: listItems.slice(0, 10).map((label, lIdx) => ({
            id: `row_${lIdx + 1}`,
            title: label.slice(0, 24),
            description: `Select ${label}`,
            nextNodeId: `action_node_${lIdx + 1}`,
          })),
        })
      }

      let entryNodeType: FlowNodeType = 'send_buttons'
      if (rf.buttons.length > 3 || listSections.length > 0) {
        entryNodeType = 'send_list'
      }

      nodes.push({
        id: 'entry_message',
        type: entryNodeType,
        name: 'Interactive Message',
        config: {
          text: rf.message,
          buttons: flowButtons,
          mediaUrl: rf.mediaUrl || rf.imageUrl,
          mediaType: rf.mediaType,
          listingId: rf.listingId,
          listingSlug: rf.listingSlug,
          listingSortMode: rf.listingSortMode,
          listingSortOrder: rf.listingSortOrder,
          categoryPriority: rf.categoryPriority,
          listingPageSize: rf.listingPageSize,
          listSections: listSections.length > 0 ? listSections : undefined,
          listButtonText: 'మెనూ ఎంచుకోండి',
          footerText: 'చౌటుప్పల్ యాప్ 24/7 బాట్',
        },
        positionX: 100,
        positionY: 220,
      })

      nodes.push(...actionNodes)
    } else {
      let entryNodeType: FlowNodeType = 'send_message'
      if (rf.listingId || rf.listingSlug) {
        entryNodeType = 'send_listing'
      } else if (rf.mediaUrl || rf.imageUrl) {
        entryNodeType = 'send_media'
      }

      nodes.push({
        id: 'entry_message',
        type: entryNodeType,
        name: 'Message Display',
        config: {
          text: rf.message,
          mediaUrl: rf.mediaUrl || rf.imageUrl,
          mediaType: rf.mediaType,
          listingId: rf.listingId,
          listingSlug: rf.listingSlug,
          listingSortMode: rf.listingSortMode,
          listingSortOrder: rf.listingSortOrder,
          categoryPriority: rf.categoryPriority,
          listingPageSize: rf.listingPageSize,
          nextNodeId: 'end_terminal',
          footerText: 'చౌటుప్పల్ యాప్',
        },
        positionX: 100,
        positionY: 220,
      })
    }

    nodes.push({
      id: 'end_terminal',
      type: 'end',
      name: 'Flow Terminal',
      config: {},
      positionX: 100,
      positionY: 520,
    })

    const canonicalFlow: WhatsAppFlow = {
      id: rf.id,
      name: rf.name,
      description: rf.description,
      status: rf.status,
      territoryId: rf.territoryId,
      version: 1,
      triggers,
      nodes,
      entryNodeId: 'start',
      initial_message: rf.message,
      imageUrl: rf.imageUrl,
      template_slug: rf.templateSlug,
      listingSortMode: rf.listingSortMode,
      listingSortOrder: rf.listingSortOrder,
      categoryPriority: rf.categoryPriority,
      listingPageSize: rf.listingPageSize,
      // Backward-compatibility fields
      triggerKeyword: rf.keywords[0]?.toUpperCase() || 'FLOW',
      trigger_keywords: rf.keywords,
      trigger_type: rf.triggerType,
      button_options: rf.buttons,
      isActive: rf.status === 'published',
      type: rf.buttons.length > 0 ? 'CATEGORY_BUTTONS' : 'AUTO_REPLY',
      sendPhotos: Boolean(rf.imageUrl || rf.mediaUrl),
      actionButtons: flowButtons.map((b) => ({ id: b.id, title: b.title, action: b.action || 'BUTTON_REPLY' })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return canonicalFlow
  })

  const rawHeaders = headerItem.row
  const detectedMappings: Record<string, string | null> = {
    name: nameIdx >= 0 ? rawHeaders[nameIdx]?.trim() : null,
    triggerType: triggerTypeIdx >= 0 ? rawHeaders[triggerTypeIdx]?.trim() : null,
    triggerKeywords: triggerKeywordsIdx >= 0 ? rawHeaders[triggerKeywordsIdx]?.trim() : null,
    initialMessage: initialMessageIdx >= 0 ? rawHeaders[initialMessageIdx]?.trim() : null,
    buttonOptions: buttonOptionsIdx >= 0 ? rawHeaders[buttonOptionsIdx]?.trim() : null,
    templateSlug: templateSlugIdx >= 0 ? rawHeaders[templateSlugIdx]?.trim() : null,
    description: descriptionIdx >= 0 ? rawHeaders[descriptionIdx]?.trim() : null,
    imageUrl: imageUrlIdx >= 0 ? rawHeaders[imageUrlIdx]?.trim() : null,
    mediaUrl: mediaUrlIdx >= 0 ? rawHeaders[mediaUrlIdx]?.trim() : null,
    mediaType: mediaTypeIdx >= 0 ? rawHeaders[mediaTypeIdx]?.trim() : null,
    listingId: listingIdIdx >= 0 ? rawHeaders[listingIdIdx]?.trim() : null,
    listingSlug: listingSlugIdx >= 0 ? rawHeaders[listingSlugIdx]?.trim() : null,
    buttonPayloads: buttonPayloadsIdx >= 0 ? rawHeaders[buttonPayloadsIdx]?.trim() : null,
    nextNodeIds: nextNodeIdx >= 0 ? rawHeaders[nextNodeIdx]?.trim() : null,
    listOptions: listOptionsIdx >= 0 ? rawHeaders[listOptionsIdx]?.trim() : null,
    listingSortMode: listingSortModeIdx >= 0 ? rawHeaders[listingSortModeIdx]?.trim() : null,
    categoryPriority: categoryPriorityIdx >= 0 ? rawHeaders[categoryPriorityIdx]?.trim() : null,
    listingSortOrder: listingSortOrderIdx >= 0 ? rawHeaders[listingSortOrderIdx]?.trim() : null,
    listingPageSize: listingPageSizeIdx >= 0 ? rawHeaders[listingPageSizeIdx]?.trim() : null,
    status: statusIdx >= 0 ? rawHeaders[statusIdx]?.trim() : null,
    territoryId: territoryIdx >= 0 ? rawHeaders[territoryIdx]?.trim() : null,
  }

  return { flows, errors, warnings, detectedMappings }
}

export const parseFlowCsv = parseFlowCsvContent

/**
 * Serializes an array of WhatsAppFlow records to canonical CSV format.
 * Includes configured listing order, sort mode, category priority, and pagination batch size.
 */
export function exportFlowsToCsv(flows: WhatsAppFlow[]): string {
  const headers = [
    'name',
    'trigger_type',
    'trigger_keywords',
    'initial_message',
    'button_options',
    'media_url',
    'media_type',
    'listing_id',
    'listing_sort_mode',
    'category_priority',
    'listing_sort_order',
    'listing_page_size',
    'status',
    'territory_id',
  ]

  const escapeCell = (val: any): string => {
    if (val === undefined || val === null) return ''
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = flows.map((f) => {
    const entryNode = f.nodes?.find((n) => n.id === 'entry_message' || n.id === f.entryNodeId)
    const keywords = f.trigger_keywords && f.trigger_keywords.length > 0
      ? f.trigger_keywords.join(';')
      : (f.triggers?.map((t) => t.value).join(';') || f.triggerKeyword || '')
    const buttons = f.button_options && f.button_options.length > 0
      ? f.button_options.join(';')
      : (entryNode?.config?.buttons?.map((b) => b.title).join(';') || '')
    const mediaUrl = f.mediaUrl || f.imageUrl || entryNode?.config?.mediaUrl || ''
    const mediaType = f.mediaType || entryNode?.config?.mediaType || ''
    const listingId = f.listingId || entryNode?.config?.listingId || ''
    const listingSortMode = f.listingSortMode || entryNode?.config?.listingSortMode || ''
    const categoryPriority = (f.categoryPriority || entryNode?.config?.categoryPriority || []).join(';')
    const listingSortOrder = (f.listingSortOrder || entryNode?.config?.listingSortOrder || []).join(';')
    const listingPageSize = f.listingPageSize || entryNode?.config?.listingPageSize || ''
    const initialMsg = f.initial_message || entryNode?.config?.text || f.description || ''

    return [
      escapeCell(f.name),
      escapeCell(f.trigger_type || 'keyword'),
      escapeCell(keywords),
      escapeCell(initialMsg),
      escapeCell(buttons),
      escapeCell(mediaUrl),
      escapeCell(mediaType),
      escapeCell(listingId),
      escapeCell(listingSortMode),
      escapeCell(categoryPriority),
      escapeCell(listingSortOrder),
      escapeCell(listingPageSize),
      escapeCell(f.status || 'draft'),
      escapeCell(f.territoryId || 'territory_choutuppal'),
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}
