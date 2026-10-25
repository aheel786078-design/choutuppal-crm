'use client'

import React, { useState } from 'react'
import { Kanban, Plus, Phone, MessageSquare, Tag, ArrowRight } from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'

const STAGES = [
  { key: 'NEW_LEAD', title: 'New Leads', color: 'border-blue-500' },
  { key: 'CONTACTED', title: 'Contacted / Pitch Sent', color: 'border-amber-500' },
  { key: 'QUALIFIED', title: 'Listing Verified', color: 'border-indigo-500' },
  { key: 'WON', title: 'Active & Paid Merchant', color: 'border-emerald-500' },
]

export default function PipelinesAdminPage() {
  const [deals, setDeals] = useState([
    {
      id: 'd1',
      title: 'Sri Sai Ram Automobiles',
      stage: 'WON',
      value: '₹1,500/mo',
      phone: '9848012345',
      tag: 'Automobile',
    },
    {
      id: 'd2',
      title: 'Yadadri Mega Township Open Plots',
      stage: 'WON',
      value: '₹5,000/mo',
      phone: '9848099887',
      tag: 'RealEstate',
    },
    {
      id: 'd3',
      title: 'Balaji Health Clinic',
      stage: 'QUALIFIED',
      value: '₹1,000/mo',
      phone: '9440155443',
      tag: 'Health',
    },
    {
      id: 'd4',
      title: 'Choutuppal MeeSeva & Xerox',
      stage: 'NEW_LEAD',
      value: '₹500/mo',
      phone: '9988776655',
      tag: 'Internet',
    },
  ])

  const moveStage = (id: string, newStage: string) => {
    setDeals(deals.map((d) => (d.id === id ? { ...d, stage: newStage } : d)))
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="Sales Pipeline & Merchant Deals (Kanban)"
        subtitle="Track onboarding stages of local businesses and real estate promoters"
      />

      <div className="p-6 max-w-7xl mx-auto w-full flex-1">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {STAGES.map((st) => {
            const stageDeals = deals.filter((d) => d.stage === st.key)
            return (
              <div key={st.key} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3 min-h-[480px]">
                <div className={`border-l-2 ${st.color} pl-2 py-0.5 flex items-center justify-between`}>
                  <h4 className="font-semibold text-xs text-white">{st.title}</h4>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-1.5 py-0.5 rounded">
                    {stageDeals.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="bg-slate-950 p-3 rounded-lg border border-slate-800 hover:border-slate-700 shadow-sm space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <h5 className="font-semibold text-xs text-white">{deal.title}</h5>
                        <span className="text-[10px] text-emerald-400 font-bold">{deal.value}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">{deal.phone}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
                        <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                          {deal.tag}
                        </span>
                        {st.key !== 'WON' && (
                          <button
                            onClick={() =>
                              moveStage(
                                deal.id,
                                st.key === 'NEW_LEAD'
                                  ? 'CONTACTED'
                                  : st.key === 'CONTACTED'
                                  ? 'QUALIFIED'
                                  : 'WON',
                              )
                            }
                            className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                          >
                            <span>Advance</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
