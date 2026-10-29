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

