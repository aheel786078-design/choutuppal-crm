import { cache } from 'react'
import { headers } from 'next/headers'
import { TenantConfig, DEFAULT_TENANT } from './tenant-types'
import { loadStore, getTerritoryByDomain, getTerritoryBySlug, FLAGSHIP_CHOUTUPPAL_TERRITORY } from './store'
import { getSupabaseAdminClient } from './supabase'

export * from './tenant-types'

// In-memory TTL cache for custom partner domains (5 minute expiry)
const tenantCacheMap = new Map<string, { config: TenantConfig; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

/**
 * Resolves the tenant/territory config from host header with zero-delay fast paths and React render deduplication.
 */
export const getTenantFromHost = cache(async (hostHeader?: string | null): Promise<TenantConfig> => {
  if (!hostHeader) return DEFAULT_TENANT

  const cleanHost = hostHeader.split(':')[0].toLowerCase().trim()

  // FAST PATH: Immediately return Choutuppal flagship for main domain, localhost, or standard dev preview
  if (
    !cleanHost ||
    cleanHost === 'localhost' ||
    cleanHost === '127.0.0.1' ||
    cleanHost === 'choutuppal.in' ||
    cleanHost === 'www.choutuppal.in' ||
    cleanHost.endsWith('.vercel.app') ||
    cleanHost.includes('cloudworkstations.dev')
  ) {
    return DEFAULT_TENANT
  }

  // Check in-memory cache first to avoid repetitive lookups
  const cached = tenantCacheMap.get(cleanHost)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.config
  }

  try {
    // 1. Check Store for custom domain or subdomain
    const store = loadStore()
    const territory = getTerritoryByDomain(cleanHost)

    if (territory) {
      const isSuspended = territory.status === 'suspended'
      const config: TenantConfig = {
        id: territory.id,
        name: territory.name,
        domain: territory.primaryDomain,
        logoUrl: territory.branding.logoUrl || null,
        primaryColor: territory.branding.primaryColor || '#1d4ed8',
        adminPhone: territory.contactPhone,
        whatsappNumber: territory.whatsappNumber,
        tagline: territory.branding.tagline,
        heroTitle: territory.branding.heroTitle,
        subscriptionStatus: isSuspended ? 'SUSPENDED' : 'ACTIVE',
        subscriptionExpiresAt: null,
        isFlagship: Boolean(territory.isFlagship),
        localities: territory.localities || [],
        district: territory.district || 'Telangana',
      }
      tenantCacheMap.set(cleanHost, { config, expiresAt: Date.now() + CACHE_TTL_MS })
      return config
    }

    // 2. Check Subdomain format: <town>.choutuppal.in
    if (cleanHost.includes('.choutuppal.in')) {
      const townSubdomain = cleanHost.replace('.choutuppal.in', '')
      const subTerritory = getTerritoryBySlug(townSubdomain)
      if (subTerritory) {
        const config: TenantConfig = {
          id: subTerritory.id,
          name: subTerritory.name,
          domain: subTerritory.primaryDomain,
          logoUrl: subTerritory.branding.logoUrl || null,
          primaryColor: subTerritory.branding.primaryColor || '#1d4ed8',
          adminPhone: subTerritory.contactPhone,
          whatsappNumber: subTerritory.whatsappNumber,
          tagline: subTerritory.branding.tagline,
          heroTitle: subTerritory.branding.heroTitle,
          subscriptionStatus: subTerritory.status === 'suspended' ? 'SUSPENDED' : 'ACTIVE',
          subscriptionExpiresAt: null,
          isFlagship: Boolean(subTerritory.isFlagship),
          localities: subTerritory.localities || [],
          district: subTerritory.district || 'Telangana',
        }
        tenantCacheMap.set(cleanHost, { config, expiresAt: Date.now() + CACHE_TTL_MS })
        return config
      }
    }
  } catch (err) {
    console.error('[Tenant Resolver Exception]:', err)
  }

  return DEFAULT_TENANT
})

/**
 * Helper to get the current tenant on the server from the request headers
 */
export async function getCurrentTenant(): Promise<TenantConfig> {
  try {
    const headersList = await headers()
    const host = headersList.get('host')
    return getTenantFromHost(host)
  } catch {
    return DEFAULT_TENANT
  }
}
