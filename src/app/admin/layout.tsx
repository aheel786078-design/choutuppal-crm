import React from 'react'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminUIProvider } from '@/components/admin/admin-ui-context'
import { AdminCommandPalette } from '@/components/admin/admin-command-palette'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthenticatedUser()
  if (!user) {
    redirect('/login?redirect=/admin')
  }

  const hasAdminAccess =
    user.role === 'SUPER_ADMIN' ||
    user.role === 'PLATFORM_OPERATOR' ||
    user.role === 'FRANCHISE_ADMIN' ||
    user.role === 'FRANCHISE_STAFF'

  if (!hasAdminAccess) {
    redirect('/dashboard')
  }

  return (
    <AdminUIProvider>
      <div className="flex min-h-screen bg-slate-50 text-slate-900 relative selection:bg-emerald-600 selection:text-white">
        <AdminSidebar />
        <main className="flex-1 min-w-0 flex flex-col bg-slate-50 overflow-y-auto w-full">
          {children}
        </main>
        <AdminCommandPalette />
      </div>
    </AdminUIProvider>
  )
}
