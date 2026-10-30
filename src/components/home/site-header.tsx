'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LogIn,
  LogOut,
  Menu,
  X,
  Home,
  Building2,
  Newspaper,
  Users,
  Info,
  FileText,
  Shield,
  Download,
  Wrench,
  Video,
  LayoutDashboard,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/home/notification-bell'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { TenantConfig, DEFAULT_TENANT } from '@/lib/tenant-types'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface SiteHeaderProps {
  tenant?: TenantConfig
}

export function SiteHeader({ tenant = DEFAULT_TENANT }: SiteHeaderProps) {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [pwaEvent, setPwaEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) setUser(data.user)
      })
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })
      return () => {
        authListener.subscription.unsubscribe()
      }
    }
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setPwaEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function triggerPwaInstall() {
    if (pwaEvent) {
      await pwaEvent.prompt()
      const choice = await pwaEvent.userChoice
      if (choice.outcome === 'accepted') {
        setPwaEvent(null)
      }
    } else {
      toast.info('To install, tap your browser menu (⋮ or Share) and select "Add to Home Screen".')
    }
  }

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
    toast.success('Logged out successfully')
  }

  // Hide on admin and crm routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/crm')) {
    return null
  }

  const isLoggedIn = !!user
  const isDefault = tenant.id === DEFAULT_TENANT.id

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-4 lg:px-6">
        {/* Left: Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {tenant.logoUrl ? (
            <Image
              src={tenant.logoUrl}
              alt={tenant.name}
              width={160}
              height={36}
              priority
              className="h-9 w-auto object-contain"
            />
          ) : isDefault ? (
            <Image
              src="https://i.ibb.co/BVdvN5rB/Untitled-design-removebg-preview.png"
              alt="Choutuppal App"
              width={160}
              height={36}
              priority
              className="h-9 w-auto object-contain"
            />
          ) : (
            <div className="flex items-center gap-2">
              <div
                className="grid h-10 w-10 place-items-center rounded-xl text-white font-extrabold text-base shadow-sm"
                style={{ backgroundColor: tenant.primaryColor }}
              >
                {tenant.name.substring(0, 1).toUpperCase()}
              </div>
              <span className="font-extrabold text-slate-900 text-sm">{tenant.name}</span>
            </div>
          )}
        </Link>

        {/* Center: Desktop nav links */}
        <nav className="hidden items-center gap-5 lg:gap-6 md:flex">
          <Link href="/" className={cn("text-xs lg:text-sm font-semibold transition hover:text-blue-600", pathname === '/' ? 'text-blue-600 font-bold' : 'text-slate-600')}>
            Home
          </Link>
          <Link href="/listings" className={cn("text-xs lg:text-sm font-semibold transition hover:text-blue-600", pathname.startsWith('/listings') ? 'text-blue-600 font-bold' : 'text-slate-600')}>
            Listings
          </Link>
          <Link href="/services" className={cn("text-xs lg:text-sm font-semibold transition hover:text-blue-600", pathname.startsWith('/services') ? 'text-blue-600 font-bold' : 'text-slate-600')}>
            Services
          </Link>
          <Link href="/real-estate" className={cn("text-xs lg:text-sm font-semibold transition hover:text-blue-600", pathname.startsWith('/real-estate') ? 'text-blue-600 font-bold' : 'text-slate-600')}>
            Real Estate
          </Link>
          <Link href="/shorts" className={cn("text-xs lg:text-sm font-semibold transition hover:text-blue-600", pathname.startsWith('/shorts') ? 'text-blue-600 font-bold' : 'text-slate-600')}>
            Reels
          </Link>
          <Link href="/news" className={cn("text-xs lg:text-sm font-semibold transition hover:text-blue-600", pathname.startsWith('/news') ? 'text-blue-600 font-bold' : 'text-slate-600')}>
            News &amp; Blog
          </Link>
          <Link href="/community" className={cn("text-xs lg:text-sm font-semibold transition hover:text-blue-600", pathname.startsWith('/community') ? 'text-blue-600 font-bold' : 'text-slate-600')}>
            Community
          </Link>
          <Link href="/government-contacts" className={cn("text-xs lg:text-sm font-semibold transition hover:text-blue-600", pathname.startsWith('/government-contacts') ? 'text-blue-600 font-bold' : 'text-slate-600')}>
            Govt &amp; Emergency
          </Link>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Quick links to Admin and CRM */}
          <Link
            href="/admin"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <LayoutDashboard className="h-3.5 w-3.5 text-blue-600" />
            <span>Admin</span>
          </Link>

          <Link
            href="/crm"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition"
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
            <span>CRM</span>
          </Link>

          {isLoggedIn ? (
            <>
              <Button
                asChild
                size="sm"
                className="hidden gap-2 gradient-brand text-white shadow-xs md:inline-flex"
              >
                <Link href="/admin/dashboard">Panel</Link>
              </Button>
              <Button
                onClick={handleSignOut}
                size="sm"
                variant="ghost"
                className="hidden gap-1.5 text-red-500 hover:bg-red-50 md:inline-flex"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Logout</span>
              </Button>
            </>
          ) : (
            <Button
              asChild
              size="sm"
              className="hidden gap-1.5 gradient-brand text-white shadow-xs md:inline-flex"
            >
              <Link href="/login">
                <LogIn className="h-3.5 w-3.5" />
                Login
              </Link>
            </Button>
          )}

          {isLoggedIn ? <NotificationBell /> : null}

          {/* Mobile hamburger */}
          <button
            aria-label="Toggle menu"
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white/80 md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      <div
        className={cn(
          'border-t border-slate-100 bg-white/95 px-4 py-4 backdrop-blur-xl md:hidden',
          mobileOpen ? 'block' : 'hidden',
        )}
      >
        <nav className="grid grid-cols-2 gap-2">
          <MobileLink href="/" icon={Home} label="హోమ్" onClick={() => setMobileOpen(false)} />
          <MobileLink href="/listings" icon={Building2} label="లిస్టింగ్స్" onClick={() => setMobileOpen(false)} />
          <MobileLink href="/services" icon={Wrench} label="సేవలు (Taxi/Auto)" onClick={() => setMobileOpen(false)} />
          <MobileLink href="/real-estate" icon={Home} label="రియల్ ఎస్టేట్" onClick={() => setMobileOpen(false)} />
          <MobileLink href="/shorts" icon={Video} label="రీల్స్ &amp; షార్ట్స్" onClick={() => setMobileOpen(false)} />
          <MobileLink href="/news" icon={Newspaper} label="న్యూస్ &amp; అప్‌డేట్స్" onClick={() => setMobileOpen(false)} />
          <MobileLink href="/community" icon={Users} label="కమ్యూనిటీ వార్డ్స్" onClick={() => setMobileOpen(false)} />
          <MobileLink href="/government-contacts" icon={AlertTriangle} label="ప్రభుత్వ & అత్యవసర" onClick={() => setMobileOpen(false)} />
          <MobileLink href="/admin" icon={LayoutDashboard} label="అడ్మిన్ ప్యానెల్" onClick={() => setMobileOpen(false)} />
          <MobileLink href="/crm" icon={MessageSquare} label="CRM ఫ్లో ఇంజిన్" onClick={() => setMobileOpen(false)} />
          <MobileLink href="/about" icon={Info} label="అబౌట్ అస్" onClick={() => setMobileOpen(false)} />
        </nav>

        {/* Dedicated Bottom Actions Section */}
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => { triggerPwaInstall(); setMobileOpen(false) }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-amber-500 to-amber-400 font-bold text-white shadow-xs active:scale-[0.98]"
          >
            <Download className="h-4 w-4" />
            <span className="text-sm">Install App (ఇన్‌స్టాల్ చేయండి)</span>
          </button>

          {isLoggedIn ? (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 font-bold text-blue-700 active:scale-[0.98]"
              >
                <LayoutDashboard className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Admin</span>
              </Link>
              <button
                onClick={() => { handleSignOut(); setMobileOpen(false) }}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 font-bold text-red-600 active:scale-[0.98]"
              >
                <LogOut className="h-4 w-4 text-red-500" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-500 font-bold text-white shadow-xs active:scale-[0.98]"
            >
              <LogIn className="h-4 w-4" />
              <span className="text-sm">Login / Register</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

function MobileLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string
  icon: any
  label: string
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition hover:border-blue-300 hover:text-blue-600 active:bg-slate-50"
    >
      <Icon className="h-4 w-4 text-blue-500 shrink-0" />
      <span className="font-telugu text-xs truncate">{label}</span>
    </Link>
  )
}
