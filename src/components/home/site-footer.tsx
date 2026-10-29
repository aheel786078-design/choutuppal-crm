'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPin, Phone, MessageCircle, Mail, Shield, LayoutDashboard, MessageSquare } from 'lucide-react'
import { SocialLinks } from '@/components/shared/social-links'
import { cn, formatPhoneNumber } from '@/lib/utils'
import { TenantConfig, DEFAULT_TENANT } from '@/lib/tenant-types'
import { WHATSAPP_BOT_NUMBER, WHATSAPP_MEDIA_NUMBER } from '@/lib/constants'

interface SiteFooterProps {
  tenant?: TenantConfig
}

export function SiteFooter({ tenant = DEFAULT_TENANT }: SiteFooterProps) {
  const pathname = usePathname()
  const isBusinessPage = pathname.startsWith('/business')
  const isDefault = tenant.id === DEFAULT_TENANT.id
  const rawCall = tenant.adminPhone || '9494348175'
  const displayPhone = formatPhoneNumber(rawCall)

  // Hide footer completely on admin and CRM modules
  if (pathname.startsWith('/admin') || pathname.startsWith('/crm') || pathname.startsWith('/franchise')) {
    return null
  }

  return (
    <footer
      className={cn(
        'mt-auto border-t border-slate-200/80 bg-white/80 backdrop-blur-xl',
        isBusinessPage && 'hidden md:block',
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Section 1 — BRAND & ABOUT */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-700 text-white font-black text-sm shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/30">
                <span className="tracking-tighter">చౌ</span>
                <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-amber-400 text-slate-950 font-black text-[7px] shadow-xs">
                  ★
                </span>
              </div>
              <div>
                <span className="font-black text-slate-900 text-sm tracking-tight block leading-none">
                  Mana Choutuppal<span className="text-emerald-600">.in</span>
                </span>
                <span className="text-[10px] text-slate-500 font-semibold font-telugu mt-0.5 block">
                  మన చౌటుప్పల్ సూపర్‌యాప్
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mana Choutuppal local directory, verified businesses, real estate deals, fast services &amp; 24/7 WhatsApp AI CRM.
            </p>
            <div className="pt-2">
              <SocialLinks />
            </div>
          </div>

          {/* Section 2 — DIRECTORY */}
          <div className="col-span-1 space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">EXPLORE</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/" className="text-slate-600 transition hover:text-blue-600">
                  Home (హోమ్)
                </Link>
              </li>
              <li>
                <Link href="/listings" className="text-slate-600 transition hover:text-blue-600">
                  All Listings (211+)
                </Link>
              </li>
              <li>
                <Link href="/services" className="text-slate-600 transition hover:text-blue-600">
                  Services (Taxi/Auto)
                </Link>
              </li>
              <li>
                <Link href="/real-estate" className="text-slate-600 transition hover:text-blue-600">
                  Real Estate Plots
                </Link>
              </li>
              <li>
                <Link href="/shorts" className="text-slate-600 transition hover:text-blue-600">
                  Local Reels &amp; Shorts
                </Link>
              </li>
              <li>
                <Link href="/government-contacts" className="text-slate-600 transition hover:text-blue-600 font-medium text-red-600">
                  Govt &amp; Emergency (అత్యవసరం)
                </Link>
              </li>
            </ul>
          </div>

          {/* Section 3 — COMMUNITY & NEWS */}
          <div className="col-span-1 space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">COMMUNITY</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/news" className="text-slate-600 transition hover:text-blue-600">
                  Local News &amp; Updates
                </Link>
              </li>
              <li>
                <Link href="/community" className="text-slate-600 transition hover:text-blue-600">
                  Ward WhatsApp Groups
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-slate-600 transition hover:text-blue-600">
                  About Choutuppal App
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-slate-600 transition hover:text-blue-600">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-slate-600 transition hover:text-blue-600">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Section 4 — PORTALS */}
          <div className="col-span-1 space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">PORTALS</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/login" className="font-semibold text-blue-600 hover:underline">
                  User Login / Register
                </Link>
              </li>
              <li>
                <Link href="/admin" className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-blue-600">
                  <LayoutDashboard className="h-3 w-3 text-blue-600" />
                  Admin Panel
                </Link>
              </li>
              <li>
                <Link href="/crm" className="flex items-center gap-1.5 font-semibold text-emerald-700 hover:text-emerald-800">
                  <MessageSquare className="h-3 w-3 text-emerald-600" />
                  WhatsApp CRM
                </Link>
              </li>
            </ul>
          </div>

          {/* Section 5 — CONTACT & WHATSAPP */}
          <div className="col-span-2 md:col-span-1 space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">WHATSAPP HELPDESK</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                <span>NH-65 Bypass, Choutuppal, Yadadri Bhuvanagiri, Telangana - 508252</span>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <a
                  href={`https://wa.me/${WHATSAPP_BOT_NUMBER}?text=Hi%20Choutuppal`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-emerald-700 hover:underline"
                >
                  Bot: +91 94943 48175
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                <a
                  href={`https://wa.me/${WHATSAPP_MEDIA_NUMBER}?text=Hi%20Choutuppal%20Media`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-slate-700 hover:text-blue-600"
                >
                  Media: +91 94413 48175
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-slate-200/80 pt-4 text-center text-xs text-slate-500 sm:flex-row sm:text-left">
          <p>
            Official SuperApp &amp; Business Hub for{' '}
            <strong className="text-slate-700">Choutuppal Town &amp; Surrounding Mandals</strong>
          </p>
          <p>© {new Date().getFullYear()} Choutuppal.in. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
