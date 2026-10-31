import React from 'react'
import { CRMSidebar } from '@/components/crm/crm-sidebar'

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <CRMSidebar />
      <main className="flex-1 min-w-0 flex flex-col bg-slate-50 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
