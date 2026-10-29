/**
 * Government Emergency & Local Leaders Directory Engine
 * Choutuppal Mandal, Yadadri Bhuvanagiri District, Telangana
 *
 * Implements canonical data structures, phone normalization, duplicate detection,
 * verification state lifecycle, query filtering, and public response sanitization.
 */

import { FLAGSHIP_TERRITORY_ID } from './store'
import type {
  GovernmentContact,
  GovtContactCategory,
  GovtContactCategoryMeta,
  GovtContactStatus,
  GovtSourceType,
} from './types'
import { GOVT_CONTACT_CATEGORIES, CHOUTUPPAL_MANDAL_VILLAGES } from './constants'

export interface GovtContactFilterOptions {
  category?: string
  village?: string
  search?: string
  territoryId?: string
  isEmergency?: boolean
  status?: GovtContactStatus | 'all'
  publicOnly?: boolean
  asOf?: Date | string | number
  page?: number
  pageSize?: number
}

export interface PublicGovernmentContact {
  id: string
  name: string
  designation: string
  category: GovtContactCategory
  categoryName: string
  categoryTelugu: string
  subcategory?: string
  phoneNumber?: string
  alternatePhoneNumber?: string
  email?: string
  officeAddress?: string
  district: string
  mandal: string
  village?: string
  ward?: string
  officeHours?: string
  availability?: '24x7' | 'office_hours' | 'unknown'
  sourceType: GovtSourceType
  sourceUrl?: string
  isEmergency: boolean
  displayOrder: number
  territoryId: string
  verificationStatus: 'verified' | 'overdue' | 'pending'
  lastVerifiedAt?: string
  updatedAt: string
}

/**
 * Normalizes phone numbers for indexing, search, and duplicate detection.
 * Does NOT alter original display formatting.
 */
export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''

  // Standard Indian 10-digit mobile with +91 or 91 prefix
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.substring(2)
  }
  // Standard Indian landline/mobile with 0 prefix
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.substring(1)
  }
  return digits
}

/**
 * Validates Indian emergency short codes and phone number formats.
 * Note: Format validity alone does not constitute proof that a number is genuine.
 */
export function isValidIndianPhoneNumber(phone?: string | null): boolean {
  if (!phone) return false
  if (/[a-zA-Z]/.test(phone)) return false
  const clean = normalizePhoneNumber(phone)
  if (!clean) return false

  // Recognized national/state emergency short codes (3 to 4 digits)
  const shortCodes = new Set(['112', '100', '101', '102', '108', '181', '1098', '1912', '1077', '104'])
  if (shortCodes.has(clean)) return true

  // Standard Indian 10-digit mobile number starting with 6, 7, 8, or 9
  if (/^[6-9]\d{9}$/.test(clean)) return true

  // Standard Indian landlines with STD code (total 10-11 digits)
  if (/^\d{10,11}$/.test(clean)) return true

  return false
}

/**
 * Evaluates whether a contact is currently verified and within its valid review window.
 */
export function isContactVerificationValid(contact: GovernmentContact, asOf: Date = new Date()): boolean {
  if (contact.status !== 'verified' && contact.status !== 'published') {
    return false
  }
  if (!contact.verificationDueAt) {
    return true
  }
  const dueDate = new Date(contact.verificationDueAt)
  return dueDate.getTime() > asOf.getTime()
}

/**
 * Evaluates whether a contact's verification is overdue.
 */
export function isContactVerificationOverdue(contact: GovernmentContact, asOf: Date = new Date()): boolean {
  if (!contact.verificationDueAt) return false
  const dueDate = new Date(contact.verificationDueAt)
  return dueDate.getTime() <= asOf.getTime()
}

/**
 * Authoritative check for public eligibility.
 * Only verified, published, public-authorized contacts are publicly exposed.
 */
export function isContactEligibleForPublic(contact: GovernmentContact, asOf: Date = new Date()): boolean {
  if (contact.status !== 'published') return false
  if (!contact.isPublicContact) return false
  // Overdue contacts lose public visibility if strictly expired unless re-verified
  if (isContactVerificationOverdue(contact, asOf)) return false
  return true
}

/**
 * Sanitizes a government contact record for public website and WhatsApp flow consumers.
 * Internal fields (notes, createdBy, updatedBy, verification internal metadata) are stripped.
 */
export function sanitizeGovtContactForPublic(
  contact: GovernmentContact,
  asOf: Date = new Date()
): PublicGovernmentContact {
  const catMeta = GOVT_CONTACT_CATEGORIES.find((c) => c.id === contact.category)
  const isOverdue = isContactVerificationOverdue(contact, asOf)

  return {
    id: contact.id,
    name: contact.name,
    designation: contact.designation,
    category: contact.category,
    categoryName: catMeta ? catMeta.name : contact.category,
    categoryTelugu: catMeta ? catMeta.telugu : '',
    subcategory: contact.subcategory,
    phoneNumber: contact.phoneNumber,
    alternatePhoneNumber: contact.alternatePhoneNumber,
    email: contact.email,
    officeAddress: contact.officeAddress,
    district: contact.district,
    mandal: contact.mandal,
    village: contact.village,
    ward: contact.ward,
    officeHours: contact.officeHours,
    availability: contact.availability,
    sourceType: contact.sourceType,
    sourceUrl: contact.sourceUrl,
    isEmergency: Boolean(contact.isEmergency),
    displayOrder: contact.displayOrder ?? 999,
    territoryId: contact.territoryId,
    verificationStatus: isOverdue ? 'overdue' : 'verified',
    lastVerifiedAt: contact.verifiedAt,
    updatedAt: contact.updatedAt,
  }
}

/**
 * Filters and deterministically sorts government contacts.
 */
export function filterAndSortGovtContacts(
  contacts: GovernmentContact[],
  options: GovtContactFilterOptions = {}
): { items: GovernmentContact[]; total: number; page: number; pageSize: number; totalPages: number } {
  const asOf = options.asOf ? new Date(options.asOf) : new Date()
  let filtered = [...contacts]

  // 1. Public vs Admin visibility filter
  if (options.publicOnly) {
    filtered = filtered.filter((c) => isContactEligibleForPublic(c, asOf))
  } else if (options.status && options.status !== 'all') {
    filtered = filtered.filter((c) => c.status === options.status)
  }

  // 2. Territory scoping
  if (options.territoryId && options.territoryId !== 'all') {
    filtered = filtered.filter((c) => (c.territoryId || FLAGSHIP_TERRITORY_ID) === options.territoryId)
  }

  // 3. Emergency flag filter
  if (typeof options.isEmergency === 'boolean') {
    filtered = filtered.filter((c) => Boolean(c.isEmergency) === options.isEmergency)
  }

  // 4. Category filter
  if (options.category && options.category !== 'all') {
    const targetCat = options.category.toLowerCase().trim()
    filtered = filtered.filter((c) => c.category.toLowerCase() === targetCat)
  }

  // 5. Village filter
  if (options.village && options.village !== 'all') {
    const targetVillage = options.village.toLowerCase().trim()
    filtered = filtered.filter((c) => (c.village || '').toLowerCase().includes(targetVillage))
  }

  // 6. Free text search
  if (options.search && options.search.trim()) {
    const term = options.search.toLowerCase().trim()
    const termClean = normalizePhoneNumber(term)

    filtered = filtered.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(term)
      const desigMatch = c.designation.toLowerCase().includes(term)
      const villageMatch = (c.village || '').toLowerCase().includes(term)
      const mandalMatch = (c.mandal || '').toLowerCase().includes(term)
      const officeMatch = (c.officeAddress || '').toLowerCase().includes(term)
      const catMatch = c.category.toLowerCase().includes(term)

      const phoneClean = normalizePhoneNumber(c.phoneNumber)
      const altPhoneClean = normalizePhoneNumber(c.alternatePhoneNumber)
      const phoneMatch = termClean ? phoneClean.includes(termClean) || altPhoneClean.includes(termClean) : false

      return nameMatch || desigMatch || villageMatch || mandalMatch || officeMatch || catMatch || phoneMatch
    })
  }

  // 7. Deterministic sorting:
  //    Emergency first -> displayOrder ASC -> Category order -> Name alphabetical
  filtered.sort((a, b) => {
    // A. Emergency services first
    if (a.isEmergency !== b.isEmergency) {
      return a.isEmergency ? -1 : 1
    }

    // B. Display order configured by admin
    const orderA = a.displayOrder ?? 999
    const orderB = b.displayOrder ?? 999
    if (orderA !== orderB) {
      return orderA - orderB
    }

    // C. Category hierarchy
    const catA = GOVT_CONTACT_CATEGORIES.find((c) => c.id === a.category)?.displayOrder ?? 99
    const catB = GOVT_CONTACT_CATEGORIES.find((c) => c.id === b.category)?.displayOrder ?? 99
    if (catA !== catB) {
      return catA - catB
    }

    // D. Alphabetical fallback by name
    return a.name.localeCompare(b.name)
  })

  const total = filtered.length
  const page = Math.max(1, options.page || 1)
  const pageSize = Math.max(1, Math.min(100, options.pageSize || 50))
  const totalPages = Math.ceil(total / pageSize) || 1

  const startIndex = (page - 1) * pageSize
  const paginated = filtered.slice(startIndex, startIndex + pageSize)

  return {
    items: paginated,
    total,
    page,
    pageSize,
    totalPages,
  }
}

/**
 * Duplicate detection engine.
 * Matches on normalized phone number OR combination of (normalized name + category + village).
 */
export function findGovtContactDuplicates(
  candidate: Partial<GovernmentContact>,
  existingContacts: GovernmentContact[],
  excludeId?: string
): GovernmentContact[] {
  const candPhone = normalizePhoneNumber(candidate.phoneNumber)
  const candAlt = normalizePhoneNumber(candidate.alternatePhoneNumber)
  const candName = (candidate.name || '').toLowerCase().trim()
  const candCat = (candidate.category || '').toLowerCase().trim()
  const candVillage = (candidate.village || '').toLowerCase().trim()

  return existingContacts.filter((c) => {
    if (excludeId && c.id === excludeId) return false

    // 1. Phone match
    if (candPhone) {
      const exPhone = normalizePhoneNumber(c.phoneNumber)
      const exAlt = normalizePhoneNumber(c.alternatePhoneNumber)
      if (candPhone === exPhone || (exAlt && candPhone === exAlt)) {
        return true
      }
    }
    if (candAlt) {
      const exPhone = normalizePhoneNumber(c.phoneNumber)
      const exAlt = normalizePhoneNumber(c.alternatePhoneNumber)
      if (candAlt === exPhone || (exAlt && candAlt === exAlt)) {
        return true
      }
    }

    // 2. Identity match: identical name + same category + same village/mandal
    if (candName && candName === c.name.toLowerCase().trim()) {
      if (candCat && candCat === c.category.toLowerCase().trim()) {
        const cVillage = (c.village || '').toLowerCase().trim()
        if (!candVillage || !cVillage || candVillage === cVillage) {
          return true
        }
      }
    }

    return false
  })
}

/**
 * Universally established default emergency helplines.
 * Only official references with public government URLs are included.
 * Never fabricates local personal names or mobile numbers.
 */
export function getDefaultGovernmentContacts(): GovernmentContact[] {
  return [
    {
      id: 'govt_emergency_112',
      name: 'National Emergency Helpline (ERSS)',
      designation: 'All-in-One Emergency Response (Police, Fire, Ambulance, Disaster)',
      category: 'emergency_helpline',
      phoneNumber: '112',
      district: 'Yadadri Bhuvanagiri',
      mandal: 'Choutuppal',
      village: 'Choutuppal Town',
      officeHours: '24x7 Emergency Service',
      availability: '24x7',
      sourceType: 'official_website',
      sourceUrl: 'https://112.gov.in',
      sourceReference: 'Ministry of Home Affairs, Government of India — Emergency Response Support System (ERSS)',
      status: 'published',
      isEmergency: true,
      isPublicContact: true,
      displayOrder: 1,
      territoryId: FLAGSHIP_TERRITORY_ID,
      verifiedAt: '2026-01-01T00:00:00.000Z',
      verificationDueAt: '2027-01-01T00:00:00.000Z',
      verifiedBy: 'SYSTEM_OFFICIAL_DIRECTORY',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'govt_emergency_108',
      name: 'Medical Emergency & Ambulance Service',
      designation: 'Free 24x7 Emergency Ambulance Service',
      category: 'ambulance_health',
      phoneNumber: '108',
      district: 'Yadadri Bhuvanagiri',
      mandal: 'Choutuppal',
      village: 'Choutuppal Town',
      officeHours: '24x7 Emergency Service',
      availability: '24x7',
      sourceType: 'official_website',
      sourceUrl: 'https://www.nhm.gov.in',
      sourceReference: 'National Health Mission & Government of Telangana — 108 Emergency Ambulance',
      status: 'published',
      isEmergency: true,
      isPublicContact: true,
      displayOrder: 2,
      territoryId: FLAGSHIP_TERRITORY_ID,
      verifiedAt: '2026-01-01T00:00:00.000Z',
      verificationDueAt: '2027-01-01T00:00:00.000Z',
      verifiedBy: 'SYSTEM_OFFICIAL_DIRECTORY',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'govt_emergency_101',
      name: 'Telangana Fire & Rescue Control',
      designation: 'State Fire and Disaster Response Services',
      category: 'fire_rescue',
      phoneNumber: '101',
      district: 'Yadadri Bhuvanagiri',
      mandal: 'Choutuppal',
      village: 'Choutuppal Town',
      officeHours: '24x7 Emergency Service',
      availability: '24x7',
      sourceType: 'official_website',
      sourceUrl: 'https://fire.telangana.gov.in',
      sourceReference: 'Telangana State Disaster Response and Fire Services Department',
      status: 'published',
      isEmergency: true,
      isPublicContact: true,
      displayOrder: 3,
      territoryId: FLAGSHIP_TERRITORY_ID,
      verifiedAt: '2026-01-01T00:00:00.000Z',
      verificationDueAt: '2027-01-01T00:00:00.000Z',
      verifiedBy: 'SYSTEM_OFFICIAL_DIRECTORY',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'govt_emergency_1912',
      name: 'TSSPDCL Electricity Emergency & Complaints',
      designation: 'Toll-Free Electricity Breakdown & Safety Helpline',
      category: 'electricity_utilities',
      phoneNumber: '1912',
      district: 'Yadadri Bhuvanagiri',
      mandal: 'Choutuppal',
      village: 'Choutuppal Town',
      officeHours: '24x7 Utility Helpline',
      availability: '24x7',
      sourceType: 'official_website',
      sourceUrl: 'https://www.tssspdcl.com',
      sourceReference: 'Telangana State Southern Power Distribution Company Ltd. (TSSPDCL)',
      status: 'published',
      isEmergency: true,
      isPublicContact: true,
      displayOrder: 4,
      territoryId: FLAGSHIP_TERRITORY_ID,
      verifiedAt: '2026-01-01T00:00:00.000Z',
      verificationDueAt: '2027-01-01T00:00:00.000Z',
      verifiedBy: 'SYSTEM_OFFICIAL_DIRECTORY',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'govt_emergency_1098',
      name: 'Childline Emergency Support',
      designation: 'National 24-Hour Emergency Helpline for Children',
      category: 'other_public_services',
      phoneNumber: '1098',
      district: 'Yadadri Bhuvanagiri',
      mandal: 'Choutuppal',
      village: 'Choutuppal Town',
      officeHours: '24x7 Emergency Service',
      availability: '24x7',
      sourceType: 'official_website',
      sourceUrl: 'https://wcd.nic.in',
      sourceReference: 'Ministry of Women and Child Development, Government of India',
      status: 'published',
      isEmergency: true,
      isPublicContact: true,
      displayOrder: 5,
      territoryId: FLAGSHIP_TERRITORY_ID,
      verifiedAt: '2026-01-01T00:00:00.000Z',
      verificationDueAt: '2027-01-01T00:00:00.000Z',
      verifiedBy: 'SYSTEM_OFFICIAL_DIRECTORY',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'govt_emergency_181',
      name: 'Women Helpline (Sakhi / Women in Distress)',
      designation: '24x7 Toll-Free Women Helpline',
      category: 'other_public_services',
      phoneNumber: '181',
      district: 'Yadadri Bhuvanagiri',
      mandal: 'Choutuppal',
      village: 'Choutuppal Town',
      officeHours: '24x7 Emergency Service',
      availability: '24x7',
      sourceType: 'official_website',
      sourceUrl: 'https://wcdsc.telangana.gov.in',
      sourceReference: 'Department of Women Development & Child Welfare, Government of Telangana',
      status: 'published',
      isEmergency: true,
      isPublicContact: true,
      displayOrder: 6,
      territoryId: FLAGSHIP_TERRITORY_ID,
      verifiedAt: '2026-01-01T00:00:00.000Z',
      verificationDueAt: '2027-01-01T00:00:00.000Z',
      verifiedBy: 'SYSTEM_OFFICIAL_DIRECTORY',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ]
}
