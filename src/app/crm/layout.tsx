import React from 'react'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { CRMSidebar } from '@/components/crm/crm-sidebar'

export default async function CRMLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthenticatedUser()
  if (!user) {
    redirect('/login?redirect=/crm')
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
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <CRMSidebar />
      <main className="flex-1 min-w-0 flex flex-col bg-slate-50 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
