import { NextResponse } from 'next/server'
import { loadStore, saveStore, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import { AutomationRule, AutomationRuleStatus } from '@/lib/types'
import { requireAuth, requireTerritoryAccess } from '@/lib/auth-server'
import { parseAutomationCsvContent } from '@/lib/parse-automation-csv'

export const dynamic = 'force-dynamic'

const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024 // 2MB

const VALID_STATUSES: AutomationRuleStatus[] = ['draft', 'active', 'paused', 'disabled']

/**
 * GET /api/crm/automations
 * Returns authenticated, tenant-scoped automation rules with search and status filtering.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const { searchParams } = new URL(req.url)
    const territoryIdParam = searchParams.get('territoryId')
    const statusParam = searchParams.get('status') as AutomationRuleStatus | null
    const triggerTypeParam = searchParams.get('triggerType')
    const searchQuery = searchParams.get('search')?.trim().toLowerCase()

    const store = loadStore()
    const allRules = store.automations || []

    // 1. Territory Scoping
    let authorizedRules: AutomationRule[]
    if (auth.user.role === 'SUPER_ADMIN') {
      if (territoryIdParam && territoryIdParam !== 'ALL') {
        authorizedRules = allRules.filter(
          (r) => (r.territoryId || FLAGSHIP_TERRITORY_ID) === territoryIdParam
        )
      } else {
        authorizedRules = allRules
      }
    } else {
      // Franchise user strictly scoped to assigned territory
      authorizedRules = allRules.filter(
        (r) => (r.territoryId || FLAGSHIP_TERRITORY_ID) === auth.user.territoryId
      )
    }

    // 2. Filter by status
    if (statusParam && VALID_STATUSES.includes(statusParam)) {
      authorizedRules = authorizedRules.filter((r) => r.status === statusParam)
    }

    // 3. Filter by triggerType
    if (triggerTypeParam) {
      authorizedRules = authorizedRules.filter(
        (r) => r.triggerType.toLowerCase() === triggerTypeParam.toLowerCase()
      )
    }

    // 4. Search query matching name, triggerValue, actionValue, description
    if (searchQuery) {
      authorizedRules = authorizedRules.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery) ||
          r.triggerValue.toLowerCase().includes(searchQuery) ||
          r.actionValue.toLowerCase().includes(searchQuery) ||
          (r.description && r.description.toLowerCase().includes(searchQuery))
      )
    }

    // Summary metrics
    const summary = {
      total: authorizedRules.length,
      active: authorizedRules.filter((r) => r.status === 'active').length,
      draft: authorizedRules.filter((r) => r.status === 'draft').length,
      paused: authorizedRules.filter((r) => r.status === 'paused').length,
      disabled: authorizedRules.filter((r) => r.status === 'disabled').length,
      unsupported: authorizedRules.filter((r) => r.isSupported === false).length,
    }

    return NextResponse.json({
      success: true,
      count: authorizedRules.length,
      automations: authorizedRules,
      summary,
      territoryId: auth.user.role === 'SUPER_ADMIN' ? (territoryIdParam || 'ALL') : auth.user.territoryId,
    })
  } catch (error: any) {
    console.error('[API Automations GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error fetching automations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/crm/automations
 * Supports:
 * 1. Safe CSV batch import / dry-run preview (with payload size enforcement & validation).
 * 2. Single automation rule creation in draft status.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    // Request size limit check (HTTP 413)
    const contentLength = Number(req.headers.get('content-length') || '0')
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Payload too large. Maximum CSV size is 2MB.' },
        { status: 413 }
      )
    }

    const body = await req.json().catch(() => ({}))

    // ------------------------------------------------------------------------
    // CASE A: BATCH CSV IMPORT OR DRY-RUN PREVIEW
    // ------------------------------------------------------------------------
    if (typeof body.csvContent === 'string') {
      const { csvContent, dryRun = false, territoryId: reqTerritoryId } = body

      // Determine target territory
      let targetTerritoryId = FLAGSHIP_TERRITORY_ID
      if (auth.user.role === 'SUPER_ADMIN') {
        targetTerritoryId = reqTerritoryId || FLAGSHIP_TERRITORY_ID
      } else {
        targetTerritoryId = auth.user.territoryId || FLAGSHIP_TERRITORY_ID
        if (reqTerritoryId && reqTerritoryId !== targetTerritoryId) {
          return NextResponse.json(
            { success: false, error: `Access forbidden: You cannot import rules for territory "${reqTerritoryId}".` },
            { status: 403 }
          )
        }
      }

      const access = await requireTerritoryAccess(req, targetTerritoryId)
      if (access.errorResponse) return access.errorResponse

      // Parse with RFC-compliant parser
      const parseResult = parseAutomationCsvContent(csvContent, {
        territoryId: targetTerritoryId,
        defaultStatus: 'draft',
        isGlobal: auth.user.role === 'SUPER_ADMIN' && targetTerritoryId === FLAGSHIP_TERRITORY_ID,
      })

      if (!parseResult.success && parseResult.rules.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'CSV parsing failed with fatal errors.',
            errors: parseResult.errors,
            summary: parseResult.summary,
          },
          { status: 400 }
        )
      }

      const store = loadStore()
      if (!store.automations) store.automations = []

      const existingIds = new Set(store.automations.map((r) => r.id))
      const newRules: AutomationRule[] = []
      let skippedCount = 0

      for (const rule of parseResult.rules) {
        if (existingIds.has(rule.id)) {
          skippedCount++
        } else {
          newRules.push(rule)
          existingIds.add(rule.id)
        }
      }

      // If dry-run: return simulation preview with ZERO store mutations
      if (dryRun) {
        return NextResponse.json({
          success: true,
          dryRun: true,
          preview: {
            totalParsed: parseResult.rules.length,
            createdCount: newRules.length,
            skippedCount,
            unsupportedCount: parseResult.summary.unsupportedRules,
            sampleRules: parseResult.rules.slice(0, 5),
            warnings: parseResult.warnings,
            errors: parseResult.errors,
          },
        })
      }

      // Confirm import: persist new rules as draft
      if (newRules.length > 0) {
        store.automations.push(...newRules)
        saveStore(store)
      }

      return NextResponse.json(
        {
          success: true,
          message: `Successfully imported ${newRules.length} automation rules as draft (${skippedCount} duplicates skipped).`,
          importedCount: newRules.length,
          skippedCount,
          summary: parseResult.summary,
          warnings: parseResult.warnings,
        },
        { status: 201 }
      )
    }

    // ------------------------------------------------------------------------
    // CASE B: SINGLE RULE CREATION
    // ------------------------------------------------------------------------
    const {
      name,
      triggerType,
      triggerValue,
      actionType,
      actionValue,
      description,
      templateSlug,
      territoryId: reqTerritoryId,
      status = 'draft',
    } = body

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Rule name is required and must be at least 2 characters.' },
        { status: 400 }
      )
    }

    if (!triggerType || typeof triggerType !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Trigger type is required.' },
        { status: 400 }
      )
    }

    if (!actionType || typeof actionType !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Action type is required.' },
        { status: 400 }
      )
    }

    if (!actionValue || typeof actionValue !== 'string' || !actionValue.trim()) {
      return NextResponse.json(
        { success: false, error: 'Action value (message text or tag name) is required.' },
        { status: 400 }
      )
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Determine territory
    let targetTerritoryId = FLAGSHIP_TERRITORY_ID
    if (auth.user.role === 'SUPER_ADMIN') {
      targetTerritoryId = reqTerritoryId || FLAGSHIP_TERRITORY_ID
    } else {
      targetTerritoryId = auth.user.territoryId || FLAGSHIP_TERRITORY_ID
      if (reqTerritoryId && reqTerritoryId !== targetTerritoryId) {
        return NextResponse.json(
          { success: false, error: `Access forbidden: You cannot create rules for territory "${reqTerritoryId}".` },
          { status: 403 }
        )
      }
    }

    const access = await requireTerritoryAccess(req, targetTerritoryId)
    if (access.errorResponse) return access.errorResponse

    const store = loadStore()
    if (!store.automations) store.automations = []

    const now = new Date().toISOString()
    const newRule: AutomationRule = {
      id: `auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      triggerType: triggerType.trim(),
      triggerValue: (triggerValue || '').trim(),
      actionType: actionType.trim(),
      actionValue: actionValue.trim(),
      description: description ? String(description).trim() : undefined,
      templateSlug: templateSlug ? String(templateSlug).trim() : undefined,
      territoryId: targetTerritoryId,
      isGlobal: auth.user.role === 'SUPER_ADMIN' && targetTerritoryId === FLAGSHIP_TERRITORY_ID,
      status: status as AutomationRuleStatus,
      isActive: status === 'active',
      isSupported: true,
      executionCount: 0,
      createdAt: now,
      updatedAt: now,
    }

    store.automations.push(newRule)
    saveStore(store)

    return NextResponse.json(
      {
        success: true,
        message: 'Automation rule created successfully in draft status.',
        rule: newRule,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[API Automations POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error creating automation rule' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/crm/automations
 * Updates an existing automation rule (status, keywords, message/tag actions).
 * Enforces territory isolation against cross-tenant IDOR.
 */
export async function PUT(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const body = await req.json().catch(() => ({}))
    const { id, name, triggerType, triggerValue, actionType, actionValue, description, templateSlug, status } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Rule id is required for updates.' },
        { status: 400 }
      )
    }

    const store = loadStore()
    if (!store.automations) store.automations = []

    const ruleIndex = store.automations.findIndex((r) => r.id === id)
    if (ruleIndex === -1) {
      return NextResponse.json(
        { success: false, error: `Automation rule with ID "${id}" was not found.` },
        { status: 404 }
      )
    }

    const currentRule = store.automations[ruleIndex]

    // Cross-territory IDOR check
    const access = await requireTerritoryAccess(req, currentRule.territoryId || FLAGSHIP_TERRITORY_ID)
    if (access.errorResponse) return access.errorResponse

    // Validations
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json(
          { success: false, error: 'Name must be at least 2 characters.' },
          { status: 400 }
        )
      }
      currentRule.name = name.trim()
    }

    if (triggerType !== undefined) currentRule.triggerType = String(triggerType).trim()
    if (triggerValue !== undefined) currentRule.triggerValue = String(triggerValue).trim()
    if (actionType !== undefined) currentRule.actionType = String(actionType).trim()
    if (actionValue !== undefined) {
      if (!String(actionValue).trim()) {
        return NextResponse.json(
          { success: false, error: 'Action value cannot be empty.' },
          { status: 400 }
        )
      }
      currentRule.actionValue = String(actionValue).trim()
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        )
      }
      currentRule.status = status
      currentRule.isActive = status === 'active'
    }

    if (description !== undefined) currentRule.description = String(description).trim() || undefined
    if (templateSlug !== undefined) currentRule.templateSlug = String(templateSlug).trim() || undefined

    currentRule.updatedAt = new Date().toISOString()
    store.automations[ruleIndex] = currentRule
    saveStore(store)

    return NextResponse.json({
      success: true,
      message: 'Automation rule updated successfully.',
      rule: currentRule,
    })
  } catch (error: any) {
    console.error('[API Automations PUT] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error updating automation rule' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/crm/automations
 * Deletes an automation rule with strict territory authorization.
 */
export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const { searchParams } = new URL(req.url)
    let ruleId = searchParams.get('id')

    if (!ruleId) {
      const body = await req.json().catch(() => ({}))
      ruleId = body.id
    }

    if (!ruleId || typeof ruleId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Rule id parameter is required.' },
        { status: 400 }
      )
    }

    const store = loadStore()
    if (!store.automations) store.automations = []

    const rule = store.automations.find((r) => r.id === ruleId)
    if (!rule) {
      return NextResponse.json(
        { success: false, error: `Automation rule with ID "${ruleId}" was not found.` },
        { status: 404 }
      )
    }

    // Territory IDOR check
    const access = await requireTerritoryAccess(req, rule.territoryId || FLAGSHIP_TERRITORY_ID)
    if (access.errorResponse) return access.errorResponse

    store.automations = store.automations.filter((r) => r.id !== ruleId)
    saveStore(store)

    return NextResponse.json({
      success: true,
      message: 'Automation rule deleted successfully.',
      deletedId: ruleId,
    })
  } catch (error: any) {
    console.error('[API Automations DELETE] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error deleting automation rule' },
      { status: 500 }
    )
  }
}
