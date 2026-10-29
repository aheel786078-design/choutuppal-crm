'use client'

import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Star,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Tag,
  Check,
  X,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'

export default function MonetizationAdminPage() {
  const [activeTab, setActiveTab] = useState<'plans' | 'subscriptions' | 'promotions' | 'orders'>('plans')
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null)

  const [data, setData] = useState<{
    stats?: any
    plans?: any[]
    subscriptions?: any[]
    promotions?: any[]
    orders?: any[]
    payments?: any[]
    expiring?: any
  }>({})

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTerritory, setSelectedTerritory] = useState('ALL')

  // Modals state
  const [showGrantSubModal, setShowGrantSubModal] = useState(false)
  const [showGrantPromoModal, setShowGrantPromoModal] = useState(false)
  const [showVerifyPaymentModal, setShowVerifyPaymentModal] = useState(false)
  const [modalTargetOrder, setModalTargetOrder] = useState<any>(null)

  // Form states
  const [grantListingId, setGrantListingId] = useState('')
  const [grantPlanId, setGrantPlanId] = useState('plan_premium_monthly')
  const [grantDurationDays, setGrantDurationDays] = useState(30)
  const [grantPriority, setGrantPriority] = useState(100)
  const [grantReason, setGrantReason] = useState('')
  const [paymentRefInput, setPaymentRefInput] = useState('')
  const [paymentNotesInput, setPaymentNotesInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      setErrorMsg(null)
      const res = await fetch(`/api/admin/monetization?territoryId=${selectedTerritory}&search=${encodeURIComponent(searchQuery)}`)
      const resData = await res.json()
      if (resData.success) {
        setData(resData)
      } else {
        setErrorMsg(resData.error || 'Failed to load monetization data')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error fetching data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedTerritory])

  const handleGrantSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!grantListingId) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/monetization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'grant_subscription',
          listingId: grantListingId,
          planId: grantPlanId,
          durationDays: Number(grantDurationDays),
          reasonNotes: grantReason,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setActionSuccessMsg(`Subscription granted to ${grantListingId}`)
        setShowGrantSubModal(false)
        setGrantListingId('')
        setGrantReason('')
        fetchData()
      } else {
        setErrorMsg(result.error || 'Failed to grant subscription')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing grant')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGrantPromotion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!grantListingId) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/monetization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'grant_promotion',
          listingId: grantListingId,
          durationDays: Number(grantDurationDays),
          priority: Number(grantPriority),
          reasonNotes: grantReason,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setActionSuccessMsg(`Featured promotion granted to ${grantListingId}`)
        setShowGrantPromoModal(false)
        setGrantListingId('')
        setGrantReason('')
        fetchData()
      } else {
        setErrorMsg(result.error || 'Failed to grant promotion')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing grant')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOfflinePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalTargetOrder) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/monetization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_offline_payment',
          orderId: modalTargetOrder.id,
          paymentReference: paymentRefInput,
          notes: paymentNotesInput,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setActionSuccessMsg(`Order ${modalTargetOrder.id} manually verified! Entitlements activated.`)
        setShowVerifyPaymentModal(false)
        setModalTargetOrder(null)
        setPaymentRefInput('')
        setPaymentNotesInput('')
        fetchData()
      } else {
        setErrorMsg(result.error || 'Failed to verify payment')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error verifying payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTogglePlan = async (planId: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/admin/monetization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_plan',
          planId,
          isActive: !currentActive,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setActionSuccessMsg(`Plan ${planId} status updated`)
        fetchData()
      }
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleCancelSub = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return
    try {
      const res = await fetch('/api/admin/monetization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel_subscription',
          subscriptionId,
          reason: 'Cancelled via Admin UI',
        }),
      })
      const result = await res.json()
      if (result.success) {
        setActionSuccessMsg(`Subscription ${subscriptionId} cancelled`)
        fetchData()
      }
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const stats = data.stats || {}

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      <AdminHeader title="Monetization & Plans" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Subscriptions</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.activeSubscriptions ?? 0}</div>
            <div className="text-xs text-slate-500 mt-1">{stats.totalSubscriptions ?? 0} total all-time</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Promotions</span>
              <Star className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.activePromotions ?? 0}</div>
            <div className="text-xs text-slate-500 mt-1">{stats.totalPromotions ?? 0} total all-time</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Pending Orders</span>
              <CreditCard className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.pendingOrders ?? 0}</div>
            <div className="text-xs text-slate-500 mt-1">{stats.paidOrders ?? 0} paid & verified</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Expiring (7 Days)</span>
              <Clock className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {(stats.expiringSoonSubscriptions ?? 0) + (stats.expiringSoonPromotions ?? 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Requiring renewal</div>
          </div>
        </div>

        {/* Action Alerts */}
        {errorMsg && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg p-3 text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionSuccessMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Controls & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'plans'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              Plans ({data.plans?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'subscriptions'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              Subscriptions ({data.subscriptions?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('promotions')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'promotions'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              Promotions ({data.promotions?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              Orders ({data.orders?.length || 0})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGrantSubModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Grant Premium
            </button>
            <button
              onClick={() => setShowGrantPromoModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Grant Featured
            </button>
            <button
              onClick={fetchData}
              className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 hover:text-slate-800"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab 1: Plans */}
        {activeTab === 'plans' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(data.plans || []).map((plan) => (
              <div
                key={plan.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        plan.type === 'bundle'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          : plan.type === 'premium'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      }`}
                    >
                      {plan.type}
                    </span>
                    <button
                      onClick={() => handleTogglePlan(plan.id, plan.isActive)}
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        plan.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {plan.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">₹{plan.price}</span>
                    <span className="text-sm text-slate-500">/{plan.billingInterval || 'month'}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{plan.durationDays || 30} days validity</p>

                  <ul className="mt-6 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    {(plan.features || []).map((feat: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>ID: {plan.id}</span>
                  <span>Currency: {plan.currency}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Subscriptions */}
        {activeTab === 'subscriptions' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Listing ID / Name</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Starts At</th>
                    <th className="px-4 py-3">Expires At</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(data.subscriptions || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                        No subscription records found. Click &quot;Grant Premium&quot; to create one.
                      </td>
                    </tr>
                  ) : (
                    (data.subscriptions || []).map((sub) => {
                      const isExpired = new Date(sub.expiresAt).getTime() < Date.now()
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                            {sub.listingId}
                          </td>
                          <td className="px-4 py-3">{sub.planId}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                sub.status === 'active' && !isExpired
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                              }`}
                            >
                              {isExpired ? 'expired' : sub.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">{new Date(sub.startsAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-xs">{new Date(sub.expiresAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">{sub.notes || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            {sub.status === 'active' && !isExpired && (
                              <button
                                onClick={() => handleCancelSub(sub.id)}
                                className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Promotions */}
        {activeTab === 'promotions' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Listing ID</th>
                    <th className="px-4 py-3">Placement</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Starts At</th>
                    <th className="px-4 py-3">Expires At</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(data.promotions || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                        No featured promotion records found. Click &quot;Grant Featured&quot; to create one.
                      </td>
                    </tr>
                  ) : (
                    (data.promotions || []).map((promo) => {
                      const isExpired = new Date(promo.expiresAt).getTime() < Date.now()
                      return (
                        <tr key={promo.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                            {promo.listingId}
                          </td>
                          <td className="px-4 py-3 text-xs">{promo.placement || 'all'}</td>
                          <td className="px-4 py-3 font-bold text-blue-600">{promo.priority || 100}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                promo.status === 'active' && !isExpired
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {isExpired ? 'expired' : promo.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">{new Date(promo.startsAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-xs">{new Date(promo.expiresAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">{promo.notes || '—'}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Orders & Offline Payment Verification */}
        {activeTab === 'orders' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Listing ID</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Gateway Ref</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(data.orders || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">
                        No orders recorded yet.
                      </td>
                    </tr>
                  ) : (
                    (data.orders || []).map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-mono text-xs text-slate-900 dark:text-slate-100">
                          {order.id}
                        </td>
                        <td className="px-4 py-3 font-medium">{order.listingId}</td>
                        <td className="px-4 py-3 text-xs">{order.planId}</td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                          ₹{order.amount}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{order.gatewayOrderId || '—'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                              order.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : order.status === 'pending'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          {order.status === 'pending' && (
                            <button
                              onClick={() => {
                                setModalTargetOrder(order)
                                setShowVerifyPaymentModal(true)
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                            >
                              Verify Offline
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Grant Premium Subscription */}
        {showGrantSubModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Grant Premium Subscription</h3>
                <button onClick={() => setShowGrantSubModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGrantSubscription} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Listing ID or Slug *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. lst_1 or sree-sai-ram-automobiles"
                    value={grantListingId}
                    onChange={(e) => setGrantListingId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Plan</label>
                  <select
                    value={grantPlanId}
                    onChange={(e) => setGrantPlanId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-slate-100"
                  >
                    {(data.plans || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.price})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={grantDurationDays}
                    onChange={(e) => setGrantDurationDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Reason / Audit Notes *
                  </label>
                  <textarea
                    required
                    placeholder="e.g. Annual offline franchise partner promotional arrangement"
                    value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-slate-100 h-20"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowGrantSubModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center gap-1.5"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Grant Premium
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Grant Featured Promotion */}
        {showGrantPromoModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Grant Featured Promotion</h3>
                <button onClick={() => setShowGrantPromoModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGrantPromotion} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Listing ID or Slug *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. lst_1 or sree-sai-ram-automobiles"
                    value={grantListingId}
                    onChange={(e) => setGrantListingId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Duration (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={grantDurationDays}
                      onChange={(e) => setGrantDurationDays(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Priority (1-1000)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={grantPriority}
                      onChange={(e) => setGrantPriority(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Reason / Audit Notes *
                  </label>
                  <textarea
                    required
                    placeholder="e.g. Festival inaugural promotion authorized by Admin"
                    value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-slate-100 h-20"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowGrantPromoModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Grant Featured
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Auditable Offline Payment Verification */}
        {showVerifyPaymentModal && modalTargetOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Verify Offline Payment</h3>
                <button onClick={() => setShowVerifyPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-xs space-y-1">
                <div>
                  <span className="text-slate-400">Order ID:</span> <span className="font-mono font-semibold">{modalTargetOrder.id}</span>
                </div>
                <div>
                  <span className="text-slate-400">Listing:</span> <span className="font-semibold">{modalTargetOrder.listingId}</span>
                </div>
                <div>
                  <span className="text-slate-400">Amount:</span> <span className="font-bold text-emerald-600">₹{modalTargetOrder.amount} {modalTargetOrder.currency}</span>
                </div>
              </div>

              <form onSubmit={handleVerifyOfflinePayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Physical / UPI Receipt Reference *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UPI Ref 312345678901 or Cash Receipt #402"
                    value={paymentRefInput}
                    onChange={(e) => setPaymentRefInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Verification Notes *
                  </label>
                  <textarea
                    required
                    placeholder="e.g. Received cash at Choutuppal office counter. Verified by Finance Admin."
                    value={paymentNotesInput}
                    onChange={(e) => setPaymentNotesInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-slate-100 h-20"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowVerifyPaymentModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Confirm Verification
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
