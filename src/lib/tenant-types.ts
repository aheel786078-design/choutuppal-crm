export interface TenantConfig {
  id: string // territoryId e.g. 'territory_choutuppal'
  name: string
  domain: string
  logoUrl: string | null
  primaryColor: string
  adminPhone: string
  whatsappNumber: string
  tagline?: string
  heroTitle?: string
  subscriptionStatus: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'MAINTENANCE'
  subscriptionExpiresAt: string | null
  isFlagship: boolean
  localities: string[]
  district: string
}

export const DEFAULT_TENANT: TenantConfig = {
  id: 'territory_choutuppal',
  name: 'Choutuppal Town & Mandal',
  domain: 'choutuppal.in',
  logoUrl: 'https://i.ibb.co/BVdvN5rB/Untitled-design-removebg-preview.png',
  primaryColor: '#1d4ed8',
  adminPhone: '9494348175',
  whatsappNumber: '9494348175',
  tagline: 'Mana Choutuppal Local Search & WhatsApp Super App',
  heroTitle: 'చౌటుప్పల్ లోకల్ బిజినెస్ & రియల్ ఎస్టేట్',
  subscriptionStatus: 'ACTIVE',
  subscriptionExpiresAt: null,
  isFlagship: true,
  localities: ['Choutuppal Town', 'Panthangi', 'Malkapur', 'Peddakondur', 'Lingoji Guda', 'Koyalagudem'],
  district: 'Yadadri Bhuvanagiri',
}

/**
 * Multi-tenant SQL / Filter clause generator
 */
export function getTenantWhereClause(territoryId: string) {
  if (
    !territoryId ||
    territoryId === DEFAULT_TENANT.id ||
    territoryId === 'territory_choutuppal' ||
    territoryId === 'choutuppal-default' ||
    territoryId === 'default'
  ) {
    return {
      OR: [
        { territoryId: 'territory_choutuppal' },
        { territoryId: 'choutuppal-default' },
        { territoryId: null },
      ],
    }
  }
  return { territoryId }
}
