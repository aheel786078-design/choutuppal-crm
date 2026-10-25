import React from 'react'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <AdminSidebar />
      <main className="flex-1 min-w-0 flex flex-col bg-slate-950 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
