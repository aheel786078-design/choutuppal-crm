import React from 'react'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminUIProvider } from '@/components/admin/admin-ui-context'
import { AdminCommandPalette } from '@/components/admin/admin-command-palette'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminUIProvider>
      <div className="flex min-h-screen bg-slate-950 text-slate-100 relative selection:bg-blue-600 selection:text-white">
        <AdminSidebar />
        <main className="flex-1 min-w-0 flex flex-col bg-slate-950 overflow-y-auto w-full">
          {children}
        </main>
        <AdminCommandPalette />
      </div>
    </AdminUIProvider>
  )
}
