import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { loadStore, isListingPublished } from '@/lib/store'
import { UserDashboardView } from '@/components/dashboard/user-dashboard-view'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Merchant & User Dashboard | Choutuppal.in',
  description: 'Manage your Choutuppal business listings, real estate properties, and WhatsApp CRM leads.',
}

export default async function DashboardPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect('/login?redirect=/dashboard')
  }

  const store = loadStore()

  // Match listings owned by user's phone, or fallback to published listings in territory
  let userListings = (store.listings || []).filter(
    (l) => l.phone?.replace(/\D/g, '') === user.phone?.replace(/\D/g, '')
  )

  if (userListings.length === 0) {
    // Show top verified listings so user has an active dashboard interface immediately
    userListings = (store.listings || []).filter((l) => isListingPublished(l)).slice(0, 3)
  }

  return <UserDashboardView user={user} listings={userListings} />
}
