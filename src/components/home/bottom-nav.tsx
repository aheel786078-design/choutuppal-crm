'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Clapperboard, Compass, User, Plus, Users, Newspaper } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()

  // Hide on admin, business detail, and franchise routes or subdomain
  if (pathname.startsWith('/admin') || pathname.startsWith('/crm') || pathname.startsWith('/business') || pathname.startsWith('/franchise') || isFranchiseSubdomain) return null

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    if (href === '/shorts') return pathname.startsWith('/shorts')
    if (href === '/explore' || href === '/listings') return pathname.startsWith('/listings') || pathname.startsWith('/explore')
    if (href === '/community') return pathname.startsWith('/community')
    if (href === '/news') return pathname.startsWith('/news') || pathname.startsWith('/blog')
    if (href === '/dashboard') return pathname.startsWith('/dashboard')
    return false
  }

  return (
    <nav
      id="mobile-bottom-navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-gray-200 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:hidden px-1"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Mobile bottom navigation"
    >
      {/* Home */}
      <Link
        id="bottom-nav-home"
        href="/"
        aria-label="Home page"
        className="flex flex-col items-center justify-center gap-0.5 px-1 py-1 min-w-[44px] min-h-[48px] transition active:scale-95"
      >
        <Home className={cn('h-5 w-5 transition-colors', isActive('/') ? 'text-blue-600 stroke-[2.5]' : 'text-slate-600')} />
        <span className={cn('text-[10px] font-bold transition-colors', isActive('/') ? 'text-blue-600' : 'text-slate-600')}>Home</span>
      </Link>

      {/* Shorts */}
      <Link
        id="bottom-nav-shorts"
        href="/shorts"
        aria-label="Local shorts and reels"
        className="flex flex-col items-center justify-center gap-0.5 px-1 py-1 min-w-[44px] min-h-[48px] transition active:scale-95"
      >
        <Clapperboard className={cn('h-5 w-5 transition-colors', isActive('/shorts') ? 'text-blue-600 stroke-[2.5]' : 'text-slate-600')} />
        <span className={cn('text-[10px] font-bold transition-colors', isActive('/shorts') ? 'text-blue-600' : 'text-slate-600')}>Shorts</span>
      </Link>

      {/* Explore */}
      <Link
        id="bottom-nav-explore"
        href="/listings"
        aria-label="Explore all businesses"
        className="flex flex-col items-center justify-center gap-0.5 px-1 py-1 min-w-[44px] min-h-[48px] transition active:scale-95"
      >
        <Compass className={cn('h-5 w-5 transition-colors', isActive('/listings') ? 'text-blue-600 stroke-[2.5]' : 'text-slate-600')} />
        <span className={cn('text-[10px] font-bold transition-colors', isActive('/listings') ? 'text-blue-600' : 'text-slate-600')}>Explore</span>
      </Link>

      {/* Center FAB — Add */}
      <div className="flex items-center justify-center">
        <Link
          id="bottom-nav-add"
          href="/dashboard?tab=add-listing"
          aria-label="Add new business listing"
          className="-mt-7 flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-yellow-500 text-white shadow-lg transition active:scale-95"
        >
          <Plus className="h-7 w-7" />
        </Link>
      </div>

      {/* Community */}
      <Link
        id="bottom-nav-community"
        href="/community"
        aria-label="Community forum"
        className="flex flex-col items-center justify-center gap-0.5 px-1 py-1 min-w-[44px] min-h-[48px] transition active:scale-95"
      >
        <Users className={cn('h-5 w-5 transition-colors', isActive('/community') ? 'text-blue-600 stroke-[2.5]' : 'text-slate-600')} />
        <span className={cn('text-[10px] font-bold transition-colors', isActive('/community') ? 'text-blue-600' : 'text-slate-600')}>Community</span>
      </Link>

      {/* News & Blog */}
      <Link
        id="bottom-nav-news"
        href="/news"
        prefetch={true}
        aria-label="News and blog articles"
        className="flex flex-col items-center justify-center gap-0.5 px-1 py-1 min-w-[44px] min-h-[48px] transition active:scale-95"
      >
        <Newspaper className={cn('h-5 w-5 transition-colors', isActive('/news') ? 'text-blue-600 stroke-[2.5]' : 'text-slate-600')} />
        <span className={cn('text-[10px] font-bold whitespace-nowrap transition-colors', isActive('/news') ? 'text-blue-600' : 'text-slate-600')}>News</span>
      </Link>

      {/* You */}
      <Link
        id="bottom-nav-you"
        href="/dashboard"
        aria-label="User account and dashboard"
        className="flex flex-col items-center justify-center gap-0.5 px-1 py-1 min-w-[44px] min-h-[48px] transition active:scale-95"
      >
        <User className={cn('h-5 w-5 transition-colors', isActive('/dashboard') ? 'text-blue-600 stroke-[2.5]' : 'text-gray-500')} />
        <span className={cn('text-[9px] font-semibold transition-colors', isActive('/dashboard') ? 'text-blue-600' : 'text-gray-500')}>You</span>
      </Link>
    </nav>
  )
}
