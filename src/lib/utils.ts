import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a phone number for display (e.g., "+91 94413 48175")
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    const raw = digits.slice(2)
    return `+91 ${raw.slice(0, 5)} ${raw.slice(5)}`
  }
  return phone
}

/**
 * Sanitizes and falls back image URLs to prevent broken external assets
 */
export function sanitizeImageUrl(url: string | null | undefined): string {
  if (!url) return 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=800&auto=format&fit=crop&q=80'
  if (url.includes('photo-1541888946425-d0fbb186f5f8')) {
    return 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=80'
  }
  return url
}

/**
 * Resolves the active base URL of the deployment (Vercel, custom domain, or localhost)
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'https://choutuppal-crm.vercel.app'
}

/**
 * Returns a clean, human-readable URL slug based on the shop's title/name
 */
export function getListingSlug(listing: { id: string; title: string; slug?: string }): string {
  if (listing.slug && listing.slug !== '-choutuppal' && listing.slug.trim()) {
    return listing.slug
  }
  const slugified = listing.title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  if (slugified && slugified !== 'choutuppal') {
    return slugified
  }
  return `shop-${listing.id.replace(/^lst_/, '')}`
}

