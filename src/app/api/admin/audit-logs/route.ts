import { NextRequest, NextResponse } from 'next/server'
import { loadStore, getAuditLogs, FLAGSHIP_TERRITORY_ID, logAuditEvent } from '@/lib/store'
import { requireAuth } from '@/lib/auth-server'
import type { AuditLog } from '@/lib/types'

export const dynamic = 'force-dynamic'

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return ''
  let str = String(val)
  // Defense against CSV / Spreadsheet Formula Injection (CWE-1236)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse
    const user = auth.user

    // RBAC: Only Super Admin, Platform Operator, and Franchise Admin can view audit logs
    const isSuperAdmin = user.role === 'SUPER_ADMIN'
    const isOperator = user.role === 'PLATFORM_OPERATOR'
    const isFranchiseAdmin = user.role === 'FRANCHISE_ADMIN'

    if (!isSuperAdmin && !isOperator && !isFranchiseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient privileges to view security audit logs.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '25', 10)
    const requestedTerritory = searchParams.get('territoryId') || undefined
    const action = searchParams.get('action') || undefined
    const actorId = searchParams.get('actorId') || undefined
    const entityType = searchParams.get('entityType') || undefined
    const outcome = (searchParams.get('outcome') as 'SUCCESS' | 'FAILURE') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const search = searchParams.get('search') || undefined
    const isExport = searchParams.get('export') === 'csv'

    // Territory scoping: Franchise Admins are strictly scoped to their assigned territory
    const effectiveTerritoryId = isSuperAdmin || isOperator
      ? (requestedTerritory && requestedTerritory !== 'ALL' ? requestedTerritory : undefined)
      : (user.territoryId || FLAGSHIP_TERRITORY_ID)

    const result = getAuditLogs({
      page: isExport ? 1 : (isNaN(page) ? 1 : page),
      pageSize: isExport ? 500 : (isNaN(pageSize) ? 25 : pageSize),
      territoryId: effectiveTerritoryId,
      isSuperAdmin: isSuperAdmin || isOperator,
      action: action && action !== 'ALL' ? action : undefined,
      actorId: actorId && actorId !== 'ALL' ? actorId : undefined,
      entityType: entityType && entityType !== 'ALL' ? entityType : undefined,
      outcome: outcome && outcome !== ('ALL' as any) ? outcome : undefined,
      startDate,
      endDate,
      search,
    })

    // If CSV export requested:
    if (isExport) {
      const headers = [
        'id',
        'timestamp',
        'actor_id',
        'actor_name',
        'actor_role',
        'territory_id',
        'action',
        'entity_type',
        'entity_id',
        'outcome',
        'details',
      ]
      const rows = [headers.join(',')]

      for (const log of result.logs) {
        const row = [
          escapeCsvField(log.id),
          escapeCsvField(log.createdAt || log.timestamp || ''),
          escapeCsvField(log.actorId),
          escapeCsvField(log.actorName),
          escapeCsvField(log.actorRole),
          escapeCsvField(log.territoryId || 'global'),
          escapeCsvField(log.action),
          escapeCsvField(log.entityType || ''),
          escapeCsvField(log.entityId || ''),
          escapeCsvField(log.outcome || 'SUCCESS'),
          escapeCsvField(log.details),
        ]
        rows.push(row.join(','))
      }

      logAuditEvent({
        actorId: user.userId,
        actorName: user.phone,
        actorRole: user.role,
        territoryId: isSuperAdmin ? undefined : user.territoryId,
        action: 'audit_logs.exported_csv',
        entityType: 'security',
        outcome: 'SUCCESS',
        details: `Exported ${result.logs.length} audit log entries to CSV`,
        metadata: { exportedCount: result.logs.length, filteredTerritory: effectiveTerritoryId },
      })

      return new NextResponse(rows.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="audit_logs_${Date.now()}.csv"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    const store = loadStore()
    const territories = (store.territories || []).map((t) => ({ id: t.id, name: t.name }))

    return NextResponse.json({
      success: true,
      logs: result.logs,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      territories,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
