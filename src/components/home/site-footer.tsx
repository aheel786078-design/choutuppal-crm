'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPin, Phone, MessageCircle, Mail } from 'lucide-react'
import { SocialLinks } from '@/components/shared/social-links'
import { cn, formatPhoneNumber } from '@/lib/utils'
import { TenantConfig, DEFAULT_TENANT } from '@/lib/tenant-types'

interface SiteFooterProps {
  tenant?: TenantConfig
}

export function SiteFooter({ tenant = DEFAULT_TENANT }: SiteFooterProps) {
  const pathname = usePathname()
  const isBusinessPage = pathname.startsWith('/business')
  const isDefault = tenant.id === DEFAULT_TENANT.id
  const rawCall = tenant.adminPhone || '9494348175'
  const displayPhone = formatPhoneNumber(rawCall)

  const isFranchiseSubdomain = typeof window !== 'undefined' && window.location.hostname.includes('franchise.choutuppal.in')
  if (pathname.startsWith('/admin') || pathname.startsWith('/crm') || pathname.startsWith('/franchise') || isFranchiseSubdomain) return null

  return (
    <footer
      className={cn(
        'mt-auto border-t border-white/40 bg-white/70 backdrop-blur-xl',
        isBusinessPage && 'hidden md:block',
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {/* Section 1 — PAGES */}
          <div className="col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              {tenant.logoUrl ? (
                <Image width={160} height={36} src={tenant.logoUrl} alt={tenant.name} className="h-9 w-auto object-contain" loading="lazy" decoding="async" />
              ) : isDefault ? (
                <Image width={160} height={36} src="https://i.ibb.co/BVdvN5rB/Untitled-design-removebg-preview.png" alt="Choutuppal App" className="h-9 w-auto object-contain" loading="lazy" decoding="async" />
              ) : (
                <div className="font-black text-slate-900 text-base flex items-center gap-1.5">
                  <div
                    className="grid h-7 w-7 place-items-center rounded-lg text-white font-extrabold text-xs"
                    style={{ backgroundColor: tenant.primaryColor }}
                  >
                    {tenant.name.substring(0, 1).toUpperCase()}
                  </div>
                  {tenant.name}
                </div>
              )}
            </div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">PAGES</h4>
            <ul className="space-y-1.5">
              <li>
                <Link href="/" className="text-sm text-slate-600 transition hover:text-blue-600">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/listings" className="text-sm text-slate-600 transition hover:text-blue-600">
                  Listings
                </Link>
              </li>
              <li>
                <Link href="/news" className="text-sm text-slate-600 transition hover:text-blue-600">
                  News &amp; Blog
                </Link>
              </li>
              <li>
                <Link href="/community" className="text-sm text-slate-600 transition hover:text-blue-600">
                  Community
                </Link>
              </li>
            </ul>
          </div>

          {/* Section 2 — COMPANY */}
          <div className="col-span-1 space-y-3">
            <h4 className="pt-1 text-xs font-extrabold uppercase tracking-wider text-slate-900 md:pt-0">COMPANY</h4>
            <ul className="space-y-1.5">
              <li>
                <Link href="/about" className="text-sm text-slate-600 transition hover:text-blue-600">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-slate-600 transition hover:text-blue-600">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-slate-600 transition hover:text-blue-600">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-sm text-slate-600 transition hover:text-blue-600">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm text-slate-600 transition hover:text-blue-600">
                  Login / Sign Up
                </Link>
              </li>
            </ul>
          </div>

          {/* Section 3 — CONTACT */}
          <div className="col-span-2 space-y-3 md:col-span-1">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">CONTACT</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <span className="font-telugu text-xs">
                  {isDefault ? 'చౌటుప్పల్, యాదాద్రి, తెలంగాణ - 508252.' : `${tenant.name} Services`}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-amber-500" />
                <a href={`tel:${rawCall.replace(/\D/g, '')}`} className="font-semibold text-slate-700 hover:text-blue-600">
                  {displayPhone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 shrink-0 text-green-500" />
                <a
                  href="https://wa.me/919494348175"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-slate-700 hover:text-green-600"
                >
                  +91 94943 48175
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-indigo-500" />
                <a
                  href="mailto:info@choutuppal.in"
                  className="font-semibold text-slate-700 hover:text-indigo-600"
                >
                  info@choutuppal.in
                </a>
              </li>
            </ul>
          </div>

          {/* Section 4 — CONNECT WITH US */}
          <div className="col-span-2 space-y-3 text-center md:col-span-1 md:text-left">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">CONNECT WITH US</h4>
            <div className="flex justify-center md:justify-start">
              <SocialLinks />
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar — Mandatory Powered by link */}
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-slate-200/80 pt-5 text-center text-xs text-slate-500 sm:flex-row sm:text-left">
          <p>
            Powered by{' '}
            <a
              href="https://www.choutuppal.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-600 hover:underline"
            >
              Choutuppal App
            </a>
          </p>
          <p>© {new Date().getFullYear()} {tenant.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
