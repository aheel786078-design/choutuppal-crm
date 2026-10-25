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
