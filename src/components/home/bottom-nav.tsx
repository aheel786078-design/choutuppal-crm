'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Clapperboard, Compass, User, Plus, Users, Newspaper } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()
  const [sessionUser, setSessionUser] = useState<{ role?: string } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setSessionUser(data.user)
        } else {
          setSessionUser(null)
        }
      })
      .catch(() => setSessionUser(null))
  }, [pathname])

  // Hide on admin, business detail, and franchise routes or subdomain
  if (pathname.startsWith('/admin') || pathname.startsWith('/crm') || pathname.startsWith('/business') || pathname.startsWith('/franchise')) return null

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    if (href === '/shorts') return pathname.startsWith('/shorts')
    if (href === '/explore' || href === '/listings') return pathname.startsWith('/listings') || pathname.startsWith('/explore')
    if (href === '/community') return pathname.startsWith('/community')
    if (href === '/news') return pathname.startsWith('/news') || pathname.startsWith('/blog')
    if (href === '/dashboard' || href === '/admin/dashboard') return pathname.startsWith('/dashboard') || pathname.startsWith('/admin')
    return false
  }

  const isAdmin =
    sessionUser?.role === 'SUPER_ADMIN' ||
    sessionUser?.role === 'PLATFORM_OPERATOR' ||
    sessionUser?.role === 'FRANCHISE_ADMIN' ||
    sessionUser?.role === 'FRANCHISE_STAFF' ||
    sessionUser?.role === 'STAFF'

  const userAccountHref = sessionUser ? (isAdmin ? '/admin/dashboard' : '/dashboard') : '/login'
  const userAccountLabel = sessionUser ? (isAdmin ? 'Admin' : 'Account') : 'Login'

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
        <Home className={cn('h-5 w-5 transition-colors', isActive('/') ? 'text-blue-700 stroke-[2.5]' : 'text-slate-600')} />
        <span className={cn('text-[10px] font-bold transition-colors', isActive('/') ? 'text-blue-700' : 'text-slate-600')}>Home</span>
      </Link>

      {/* Shorts */}
      <Link
        id="bottom-nav-shorts"
        href="/shorts"
        aria-label="Local shorts and reels"
        className="flex flex-col items-center justify-center gap-0.5 px-1 py-1 min-w-[44px] min-h-[48px] transition active:scale-95"
      >
        <Clapperboard className={cn('h-5 w-5 transition-colors', isActive('/shorts') ? 'text-blue-700 stroke-[2.5]' : 'text-slate-600')} />
        <span className={cn('text-[10px] font-bold transition-colors', isActive('/shorts') ? 'text-blue-700' : 'text-slate-600')}>Shorts</span>
      </Link>

      {/* Explore */}
      <Link
        id="bottom-nav-explore"
        href="/listings"
        aria-label="Explore all businesses"
        className="flex flex-col items-center justify-center gap-0.5 px-1 py-1 min-w-[44px] min-h-[48px] transition active:scale-95"
      >
        <Compass className={cn('h-5 w-5 transition-colors', isActive('/listings') ? 'text-blue-700 stroke-[2.5]' : 'text-slate-600')} />
        <span className={cn('text-[10px] font-bold transition-colors', isActive('/listings') ? 'text-blue-700' : 'text-slate-600')}>Explore</span>
      </Link>

      {/* Center FAB — Add Business */}
      <div className="flex items-center justify-center">
        <Link
          id="bottom-nav-add"
          href="/register"
          aria-label="Register new business listing"
          className="-mt-7 flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-amber-500 text-white shadow-lg shadow-blue-700/30 ring-2 ring-white transition active:scale-95"
        >
          <Plus className="h-7 w-7 stroke-[2.5]" />
        </Link>
      </div>

      {/* Community */}
      <Link
        id="bottom-nav-community"
        href="/community"
        aria-label="Community forum"
        className="flex flex-col items-center justify-center gap-0.5 px-1 py-1 min-w-[44px] min-h-[48px] transition active:scale-95"
      >
        <Users className={cn('h-5 w-5 transition-colors', isActive('/community') ? 'text-blue-700 stroke-[2.5]' : 'text-slate-600')} />
        <span className={cn('text-[10px] font-bold transition-colors', isActive('/community') ? 'text-blue-700' : 'text-slate-600')}>Community</span>
      </Link>

      {/* News & Blog */}
      <Link
        id="bottom-nav-news"
        href="/news"
        prefetch={true}
        aria-label="News and blog articles"
        className="flex flex-col items-center justify-center gap-0.5 px-1 py-1 min-w-[44px] min-h-[48px] transition active:scale-95"
      >
        <Newspaper className={cn('h-5 w-5 transition-colors', isActive('/news') ? 'text-blue-700 stroke-[2.5]' : 'text-slate-600')} />
        <span className={cn('text-[10px] font-bold whitespace-nowrap transition-colors', isActive('/news') ? 'text-blue-700' : 'text-slate-600')}>News</span>
      </Link>

      {/* You / Account */}
      <Link
        id="bottom-nav-you"
        href={userAccountHref}
        aria-label={userAccountLabel}
        className="flex flex-col items-center justify-center gap-0.5 px-1 py-1 min-w-[44px] min-h-[48px] transition active:scale-95"
      >
        <User className={cn('h-5 w-5 transition-colors', isActive(userAccountHref) ? 'text-blue-700 stroke-[2.5]' : 'text-slate-600')} />
        <span className={cn('text-[10px] font-bold transition-colors', isActive(userAccountHref) ? 'text-blue-700' : 'text-slate-600')}>
          {userAccountLabel}
        </span>
      </Link>
    </nav>
  )
}
