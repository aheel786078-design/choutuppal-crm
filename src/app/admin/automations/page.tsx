'use client'

import React from 'react'
import CRMAutomationsPage from '@/app/crm/automations/page'
import { AdminHeader } from '@/components/admin/admin-header'

export default function AdminAutomationsPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950">
      <AdminHeader
        title="WhatsApp Automations & Trigger Rules"
        subtitle="Manage keyword triggers, auto-tagging, listing recommendations, and dry-run testing"
      />
      <div className="flex-1">
        <CRMAutomationsPage />
      </div>
    </div>
  )
}
