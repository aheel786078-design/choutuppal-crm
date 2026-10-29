'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  Lock,
  RefreshCw,
  Info,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import type { FranchiseStaff } from '@/lib/types'

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  FRANCHISE_ADMIN: { label: 'Franchise Admin', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  FRANCHISE_REVIEWER: { label: 'Franchise Reviewer', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  FRANCHISE_STAFF: { label: 'Franchise Staff', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
}

const ALL_PERMISSIONS = [
  { key: 'listings.manage', label: 'Manage All Listings' },
  { key: 'listings.approve', label: 'Approve & Reject Listings' },
  { key: 'listings.review', label: 'Review Content' },
  { key: 'contacts.manage', label: 'Manage CRM Contacts' },
  { key: 'deals.manage', label: 'Manage Sales Deals' },
  { key: 'staff.manage', label: 'Manage Staff Accounts' },
  { key: 'reports.view', label: 'View Analytics & Reports' },
]

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState<FranchiseStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [franchiseFilter, setFranchiseFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Dropdown options from API
  const [franchises, setFranchises] = useState<Array<{ id: string; name: string; territoryId: string }>>([])
  const [territories, setTerritories] = useState<Array<{ id: string; name: string }>>([])
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // Feedback Toast
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<FranchiseStaff | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'suspend' | 'activate' | 'delete'
    staff: FranchiseStaff
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'FRANCHISE_STAFF' as FranchiseStaff['role'],
    franchiseId: '',
    permissions: ['listings.manage', 'contacts.manage'],
    status: 'ACTIVE' as FranchiseStaff['status'],
  })

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 4000)
  }

  const fetchStaff = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (roleFilter !== 'all') params.set('role', roleFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (franchiseFilter !== 'all') params.set('franchiseId', franchiseFilter)
      params.set('page', String(page))
      params.set('limit', '10')

      const res = await fetch(`/api/admin/staff?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setStaffList(data.staff || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotalCount(data.pagination?.total || 0)
        if (data.meta) {
          setFranchises(data.meta.franchises || [])
          setTerritories(data.meta.territories || [])
          setIsSuperAdmin(Boolean(data.meta.isSuperAdmin))
          if (!formData.franchiseId && data.meta.franchises?.length > 0) {
            setFormData((prev) => ({ ...prev, franchiseId: data.meta.franchises[0].id }))
          }
        }
      } else {
        showToast(data.error || 'Failed to load staff list', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Network error fetching staff', 'error')
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, statusFilter, franchiseFilter, page, formData.franchiseId])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      role: 'FRANCHISE_STAFF',
      franchiseId: franchises.length > 0 ? franchises[0].id : '',
      permissions: ['listings.manage', 'contacts.manage'],
      status: 'ACTIVE',
    })
    setIsAddModalOpen(true)
  }

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.phone.trim()) {
      showToast('Name and phone number are required', 'error')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (data.success) {
        showToast('Staff member created successfully!')
        setIsAddModalOpen(false)
        fetchStaff()
      } else {
        showToast(data.error || 'Failed to create staff member', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error creating staff', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStaff) return

    try {
      setIsSubmitting(true)
      const res = await fetch('/api/admin/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingStaff.id,
          name: editingStaff.name,
          phone: editingStaff.phone,
          email: editingStaff.email,
          role: editingStaff.role,
          status: editingStaff.status,
          permissions: editingStaff.permissions,
        }),
      })
      const data = await res.json()

      if (data.success) {
        showToast('Staff account updated successfully!')
        setEditingStaff(null)
        fetchStaff()
      } else {
        showToast(data.error || 'Failed to update staff account', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating staff', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExecuteConfirmAction = async () => {
    if (!confirmAction) return

    try {
      setIsSubmitting(true)
      const { type, staff } = confirmAction

      if (type === 'delete') {
        const res = await fetch(`/api/admin/staff?id=${staff.id}`, { method: 'DELETE' })
        const data = await res.json()
        if (data.success) {
          showToast('Staff member removed successfully!')
          setConfirmAction(null)
          fetchStaff()
        } else {
          showToast(data.error || 'Failed to remove staff member', 'error')
        }
      } else {
        const nextStatus = type === 'suspend' ? 'SUSPENDED' : 'ACTIVE'
        const res = await fetch('/api/admin/staff', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: staff.id, status: nextStatus }),
        })
        const data = await res.json()
        if (data.success) {
          showToast(`Staff member marked as ${nextStatus}!`)
          setConfirmAction(null)
          fetchStaff()
        } else {
          showToast(data.error || 'Status update failed', 'error')
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Error performing action', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const togglePermission = (permKey: string, isEditing: boolean) => {
    if (isEditing && editingStaff) {
      const perms = editingStaff.permissions || []
      const updated = perms.includes(permKey) ? perms.filter((p) => p !== permKey) : [...perms, permKey]
      setEditingStaff({ ...editingStaff, permissions: updated })
    } else {
      const perms = formData.permissions
      const updated = perms.includes(permKey) ? perms.filter((p) => p !== permKey) : [...perms, permKey]
      setFormData({ ...formData, permissions: updated })
    }
  }

  const activeCount = staffList.filter((s) => s.status === 'ACTIVE').length
  const suspendedCount = staffList.filter((s) => s.status === 'SUSPENDED').length

  return (
    <div className="flex-1 bg-slate-950 min-h-screen text-slate-100 flex flex-col">
      <AdminHeader
        title="Franchise Staff & Roles"
        subtitle="Manage territory operators, reviewers, and role-based access control."
        onRefresh={fetchStaff}
        onAddClick={handleOpenAddModal}
        addLabel="Add Staff Member"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Toast Alert */}
        {toastMsg && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
              toastMsg.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMsg.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              <span>{toastMsg.text}</span>
            </div>
            <button
              onClick={() => setToastMsg(null)}
              className="text-xs opacity-70 hover:opacity-100 underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Security & Authentication Info Banner */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3.5">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-200/90 leading-relaxed space-y-1">
            <p className="font-semibold text-blue-100">
              🔐 Phone-Based Authentication &amp; Zero SMTP Notice
            </p>
            <p>
              Staff accounts sign in securely via 10-digit Indian phone numbers with cryptographic session tokens. Outbound SMTP invitation email service is not configured on this environment; staff members log in directly using verified phone authorization.
            </p>
          </div>
        </div>

        {/* Executive Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Staff Accounts</p>
              <h3 className="text-2xl font-bold text-white mt-1">{totalCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Active Staff</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{activeCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Suspended Accounts</p>
              <h3 className="text-2xl font-bold text-rose-400 mt-1">{suspendedCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <XCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Franchise Territories</p>
              <h3 className="text-2xl font-bold text-purple-400 mt-1">{franchises.length || 1}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search by name, phone, or email..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="FRANCHISE_ADMIN">Franchise Admin</option>
              <option value="FRANCHISE_REVIEWER">Franchise Reviewer</option>
              <option value="FRANCHISE_STAFF">Franchise Staff</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INVITED">Invited</option>
              <option value="SUSPENDED">Suspended</option>
            </select>

            {/* Franchise Filter (for Super Admin) */}
            {isSuperAdmin && (
              <select
                value={franchiseFilter}
                onChange={(e) => {
                  setFranchiseFilter(e.target.value)
                  setPage(1)
                }}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Franchises</option>
                {franchises.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={fetchStaff}
              disabled={loading}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
          {loading ? (
            <div className="p-16 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <span>Loading franchise staff accounts...</span>
            </div>
          ) : staffList.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-400">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-400">No staff members found.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No staff members match the selected filters. Click &quot;Add Staff Member&quot; above to create a new operator account.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th scope="col" className="py-3 px-4 font-bold">
                      Staff Member
                    </th>
                    <th scope="col" className="py-3 px-4 font-bold">
                      Assigned Franchise
                    </th>
                    <th scope="col" className="py-3 px-4 font-bold">
                      Role &amp; Permissions
                    </th>
                    <th scope="col" className="py-3 px-4 font-bold">
                      Status
                    </th>
                    <th scope="col" className="py-3 px-4 font-bold">
                      Created Date
                    </th>
                    <th scope="col" className="py-3 px-4 text-right font-bold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {staffList.map((staff) => {
                    const roleInfo = ROLE_LABELS[staff.role] || {
                      label: staff.role,
                      color: 'bg-slate-800 text-slate-300 border-slate-700',
                    }
                    const franchise = franchises.find((f) => f.id === staff.franchiseId)
                    const territory = territories.find((t) => t.id === staff.territoryId)

                    return (
                      <tr key={staff.id} className="hover:bg-slate-950/40 transition-colors">
                        {/* Name & Contact */}
                        <td className="py-3.5 px-4 align-top space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{staff.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({staff.userId || staff.id})
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-500" />
                              {staff.phone}
                            </span>
                            {staff.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-500" />
                                {staff.email}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Franchise & Territory */}
                        <td className="py-3.5 px-4 align-top space-y-1">
                          <p className="font-medium text-slate-200">
                            {franchise ? franchise.name : staff.franchiseId || 'Default'}
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-500" />
                            {territory ? territory.name : staff.territoryId}
                          </p>
                        </td>

                        {/* Role & Permissions */}
                        <td className="py-3.5 px-4 align-top space-y-1.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${roleInfo.color}`}
                          >
                            {roleInfo.label}
                          </span>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(staff.permissions || []).slice(0, 3).map((p) => (
                              <span
                                key={p}
                                className="px-1.5 py-0.2 rounded bg-slate-800 text-[9px] text-slate-400"
                              >
                                {p.replace('.', ': ')}
                              </span>
                            ))}
                            {(staff.permissions || []).length > 3 && (
                              <span className="text-[9px] text-slate-500">
                                +{(staff.permissions || []).length - 3} more
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 align-top">
                          {staff.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Active
                            </span>
                          ) : staff.status === 'SUSPENDED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              Suspended
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock className="w-3 h-3" />
                              Invited
                            </span>
                          )}
                        </td>

                        {/* Created Date */}
                        <td className="py-3.5 px-4 align-top text-slate-400 text-[11px]">
                          {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : 'N/A'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 align-top text-right space-x-1">
                          <button
                            onClick={() => setEditingStaff(staff)}
                            className="p-1.5 rounded hover:bg-slate-800 text-blue-400 hover:text-blue-300 transition-colors"
                            title="Edit Staff Account"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {staff.status === 'ACTIVE' ? (
                            <button
                              onClick={() => setConfirmAction({ type: 'suspend', staff })}
                              className="p-1.5 rounded hover:bg-slate-800 text-amber-400 hover:text-amber-300 transition-colors"
                              title="Suspend Account"
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmAction({ type: 'activate', staff })}
                              className="p-1.5 rounded hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 transition-colors"
                              title="Activate Account"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setConfirmAction({ type: 'delete', staff })}
                            className="p-1.5 rounded hover:bg-slate-800 text-rose-400 hover:text-rose-300 transition-colors"
                            title="Remove Staff Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
              <span>
                Showing page {page} of {totalPages} ({totalCount} total staff)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ============================================================ */}
      {/* ADD STAFF MODAL                                              */}
      {/* ============================================================ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-white">Add Franchise Staff Member</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Staff Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Reddy"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">10-Digit Indian Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9848012345"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="staff@choutuppal.in"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="FRANCHISE_STAFF">Franchise Staff (Standard)</option>
                    <option value="FRANCHISE_REVIEWER">Franchise Reviewer</option>
                    <option value="FRANCHISE_ADMIN">Franchise Administrator</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Franchise Unit *</label>
                  <select
                    value={formData.franchiseId}
                    onChange={(e) => setFormData({ ...formData, franchiseId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {franchises.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">Role Permissions</label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950 rounded-lg border border-slate-800 max-h-36 overflow-y-auto">
                  {ALL_PERMISSIONS.map((perm) => {
                    const isChecked = formData.permissions.includes(perm.key)
                    return (
                      <label
                        key={perm.key}
                        className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer hover:text-white"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(perm.key, false)}
                          className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                        />
                        <span>{perm.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-200/90 leading-tight">
                Staff member will authenticate using this phone number. No outbound emails will be sent.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* EDIT STAFF MODAL                                             */}
      {/* ============================================================ */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-white">Edit Staff: {editingStaff.name}</h3>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Staff Full Name</label>
                <input
                  type="text"
                  required
                  value={editingStaff.name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Phone</label>
                  <input
                    type="tel"
                    required
                    value={editingStaff.phone}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Email</label>
                  <input
                    type="email"
                    value={editingStaff.email || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Role</label>
                  <select
                    value={editingStaff.role}
                    onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="FRANCHISE_STAFF">Franchise Staff</option>
                    <option value="FRANCHISE_REVIEWER">Franchise Reviewer</option>
                    <option value="FRANCHISE_ADMIN">Franchise Admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Status</label>
                  <select
                    value={editingStaff.status}
                    onChange={(e) => setEditingStaff({ ...editingStaff, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INVITED">Invited</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">Role Permissions</label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950 rounded-lg border border-slate-800 max-h-36 overflow-y-auto">
                  {ALL_PERMISSIONS.map((perm) => {
                    const isChecked = (editingStaff.permissions || []).includes(perm.key)
                    return (
                      <label
                        key={perm.key}
                        className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer hover:text-white"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(perm.key, true)}
                          className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                        />
                        <span>{perm.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CONFIRMATION MODAL (SUSPEND / ACTIVATE / DELETE)              */}
      {/* ============================================================ */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              {confirmAction.type === 'delete' ? (
                <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <Trash2 className="w-5 h-5" />
                </div>
              ) : confirmAction.type === 'suspend' ? (
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              )}
              <div>
                <h4 className="font-bold text-white text-sm">
                  {confirmAction.type === 'delete'
                    ? 'Remove Staff Member?'
                    : confirmAction.type === 'suspend'
                    ? 'Suspend Staff Account?'
                    : 'Activate Staff Account?'}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {confirmAction.staff.name} ({confirmAction.staff.phone})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmAction.type === 'delete'
                ? 'Are you sure you want to remove this staff account? The user will immediately lose all access to the franchise administration console.'
                : confirmAction.type === 'suspend'
                ? 'Suspending this account will revoke login and administrative session tokens immediately until re-activated.'
                : 'Activating this account will restore administrative access.'}
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleExecuteConfirmAction}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow disabled:opacity-50 ${
                  confirmAction.type === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : confirmAction.type === 'suspend'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {isSubmitting
                  ? 'Processing...'
                  : confirmAction.type === 'delete'
                  ? 'Confirm Remove'
                  : confirmAction.type === 'suspend'
                  ? 'Confirm Suspend'
                  : 'Confirm Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
