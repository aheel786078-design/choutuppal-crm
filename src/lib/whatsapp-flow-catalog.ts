/**
 * WhatsApp Flow Catalog & Zero-Typing Interactive Response Engine
 * Houses all official WhatsApp templates, button payloads, list menus, and vCards
 * for @AIMentorji / Choutuppal App (choutuppal.in).
 */

import { sendWhatsAppFlowMessage } from './whatsapp-cloud-api'
import type { Territory, Listing } from './types'
import { getListingsDAO } from './supabase-dao'

export const CHOUTUPPAL_BANNER_URL = 'https://choutuppal-crm.vercel.app/assets/choutuppal-app-banner.jpg'
export const CHOUTUPPAL_LOGO_URL = 'https://choutuppal-crm.vercel.app/assets/choutuppal-app-logo.jpg'

export interface FlowCatalogContext {
  toPhone: string
  senderName?: string
  territory?: Territory
  store?: any
}

export interface CategoryConfig {
  key: string
  rowId: string
  title: string // Max 24 chars for Meta List row title
  teluguName: string
  descriptionTemplate: string // Max 72 chars with count
  categoryIds: string[]
  icon: string
  fallbackCount: number
}

export const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  mobiles: {
    key: 'mobiles',
    rowId: 'row_cat_mobiles',
    title: '📱 మొబైల్స్ & ఎలక్ట్రానిక్స్',
    teluguName: 'మొబైల్స్ & ఎలక్ట్రానిక్స్',
    descriptionTemplate: '{count} షాప్ • స్మార్ట్‌ఫోన్లు, సర్వీసింగ్ & సేల్స్',
    categoryIds: ['cat-electronics'],
    icon: '📱',
    fallbackCount: 1,
  },
  automobile: {
    key: 'automobile',
    rowId: 'row_cat_automobile',
    title: '🚗 ఆటోమొబైల్ & గ్యారేజ్',
    teluguName: 'ఆటోమొబైల్ & గ్యారేజ్',
    descriptionTemplate: '{count} షాపులు • గ్యారేజ్ & బైక్/కార్ సర్వీసింగ్',
    categoryIds: ['cat-automobile'],
    icon: '🚗',
    fallbackCount: 25,
  },
  kirana: {
    key: 'kirana',
    rowId: 'row_cat_kirana',
    title: '🛒 కిరాణా & సూపర్ మార్కెట్',
    teluguName: 'కిరాణా & సూపర్ మార్కెట్స్',
    descriptionTemplate: '{count} షాపులు • నిత్యావసరాలు & జనరల్ స్టోర్స్',
    categoryIds: ['cat-retail'],
    icon: '🛒',
    fallbackCount: 10,
  },
  food: {
    key: 'food',
    rowId: 'row_cat_food',
    title: '🍽️ హోటల్స్ & రెస్టారెంట్లు',
    teluguName: 'హోటల్స్ & రెస్టారెంట్లు',
    descriptionTemplate: '{count} షాపులు • టిఫిన్స్, బిర్యానీ & భోజనం',
    categoryIds: ['cat-food'],
    icon: '🍽️',
    fallbackCount: 8,
  },
  health: {
    key: 'health',
    rowId: 'row_cat_health',
    title: '🏥 ఆస్పత్రులు & మెడికల్స్',
    teluguName: 'ఆస్పత్రులు & మెడికల్స్',
    descriptionTemplate: '{count} షాపులు • క్లినిక్స్, మందులు & టెస్టులు',
    categoryIds: ['cat-health'],
    icon: '🏥',
    fallbackCount: 6,
  },
  electrical: {
    key: 'electrical',
    rowId: 'row_cat_electrical',
    title: '⚡ ఎలక్ట్రికల్ & హార్డ్‌వేర్',
    teluguName: 'ఎలక్ట్రికల్ & హార్డ్‌వేర్',
    descriptionTemplate: '{count} షాపులు • వైరింగ్, మోటార్స్ & శానిటరీ',
    categoryIds: ['cat-electrical'],
    icon: '⚡',
    fallbackCount: 17,
  },
  services: {
    key: 'services',
    rowId: 'row_cat_services',
    title: '🔧 సర్వీసెస్ & వర్కర్స్',
    teluguName: 'సర్వీసెస్ & టెక్నీషియన్స్',
    descriptionTemplate: '{count} షాపులు • ప్లంబర్, ఎలక్ట్రీషియన్ & రిపేర్లు',
    categoryIds: ['cat-services'],
    icon: '🔧',
    fallbackCount: 16,
  },
  internet: {
    key: 'internet',
    rowId: 'row_cat_internet',
    title: '💻 మీసేవ & ఆన్‌లైన్ సేవలు',
    teluguName: 'మీసేవ & ఇంటర్నెట్ సెంటర్లు',
    descriptionTemplate: '{count} షాపులు • ఆధార్, పాన్ & ఆన్‌లైన్ వర్క్స్',
    categoryIds: ['cat-internet'],
    icon: '💻',
    fallbackCount: 27,
  },
  furniture: {
    key: 'furniture',
    rowId: 'row_cat_furniture',
    title: '🪑 ఫర్నిచర్ & హోమ్ డెకర్',
    teluguName: 'ఫర్నిచర్ & హోమ్ డెకర్',
    descriptionTemplate: '{count} షాపులు • వుడెన్ వర్క్స్, సోఫా & ఇంటీరియర్',
    categoryIds: ['cat-furniture'],
    icon: '🪑',
    fallbackCount: 20,
  },
  emergency: {
    key: 'emergency',
    rowId: 'row_cat_emergency',
    title: '🚨 అత్యవసర హెల్ప్‌లైన్',
    teluguName: 'అత్యవసర & హెల్ప్‌లైన్ నంబర్లు',
    descriptionTemplate: 'పోలీస్ (100), అంబులెన్స్ (108), ఫైర్ (101)',
    categoryIds: [],
    icon: '🚨',
    fallbackCount: 6,
  },
}

let cachedListings: Listing[] = []
let lastFetchedTime = 0
const CACHE_TTL_MS = 60 * 1000 // 60 seconds cache

export async function getCachedListings(territoryId: string = 'territory_choutuppal', store?: any): Promise<Listing[]> {
  const now = Date.now()
  if (cachedListings.length > 0 && now - lastFetchedTime < CACHE_TTL_MS) {
    return cachedListings
  }
  try {
    const res = await getListingsDAO({ territoryId, pageSize: 1000 })
    if (res.data && res.data.length > 0) {
      cachedListings = res.data
      lastFetchedTime = now
      return cachedListings
    }
  } catch (err) {
    console.warn('[Flow Catalog] DAO getListingsDAO error, using store fallback:', err)
  }
  if (store?.listings?.length) {
    return store.listings
  }
  return cachedListings
}

export function filterListingsByCategory(listings: Listing[], categoryKey: string): Listing[] {
  const key = categoryKey.replace('row_cat_', '').toLowerCase()
  return listings.filter((l: Listing) => {
    const catId = (l.categoryId || '').toLowerCase()
    const catName = (l.categoryName || '').toLowerCase()
    const title = (l.title || '').toLowerCase()

    if (key === 'mobiles' || key === 'electronics') {
      if (catId === 'cat-automobile' || title.includes('ఆటో')) return false
      return catId === 'cat-electronics' || catName.includes('mobile') || catName.includes('electronics') ||
             title.includes('mobile') || title.includes('లక్ష్మి') || (title.includes('మొబైల్') && !title.includes('ఆటోమొబైల్'))
    }
    if (key === 'automobile' || key === 'taxi' || key === 'auto') {
      return catId === 'cat-automobile' || catName.includes('automobile') || catName.includes('garage') ||
             title.includes('ఆటో') || title.includes('గ్యారేజ్') || title.includes('మెకానిక్') ||
             title.includes('మోటార్స్') || title.includes('టాక్సీ') || title.includes('క్యాబ్')
    }
    if (key === 'kirana' || key === 'clothing' || key === 'retail') {
      return catId === 'cat-retail' || catName.includes('retail') || catName.includes('shopping') ||
             title.includes('కిరాణా') || title.includes('సూపర్') || title.includes('బజార్') ||
             title.includes('బట్టలు') || title.includes('శారీస్') || title.includes('మ్యాచింగ్')
    }
    if (key === 'food' || key === 'hotel' || key === 'dining') {
      return catId === 'cat-food' || catName.includes('food') || catName.includes('dining') ||
             title.includes('హోటల్') || title.includes('రెస్టారెంట్') || title.includes('ధాబా') ||
             title.includes('బిర్యానీ') || title.includes('టిఫిన్') || title.includes('క్యాటరింగ్')
    }
    if (key === 'health' || key === 'medical' || key === 'hospitals') {
      return catId === 'cat-health' || catName.includes('health') || catName.includes('medical') ||
             title.includes('హాస్పిటల్') || title.includes('క్లినిక్') || title.includes('డెంటల్') ||
             title.includes('మెడికల్') || title.includes('ఫార్మసీ')
    }
    if (key === 'electrical' || key === 'hardware') {
      return catId === 'cat-electrical' || catName.includes('electrical') || catName.includes('hardware') ||
             title.includes('ఎలక్ట్రికల్') || title.includes('హార్డ్‌వేర్') || title.includes('లైటింగ్') ||
             title.includes('శానిటరీ')
    }
    if (key === 'services' || key === 'technicians') {
      return catId === 'cat-services' || catName.includes('service') ||
             title.includes('సర్వీస్') || title.includes('ప్లంబర్') || title.includes('ఎలక్ట్రీషియన్') ||
             title.includes('వర్క్స్')
    }
    if (key === 'internet' || key === 'meeseva') {
      return catId === 'cat-internet' || catName.includes('internet') || catName.includes('meeseva') ||
             title.includes('మీసేవ') || title.includes('ఇంటర్నెట్') || title.includes('ఆన్‌లైన్') ||
             title.includes('ఆధార్')
    }
    if (key === 'furniture') {
      return catId === 'cat-furniture' || catName.includes('furniture') ||
             title.includes('ఫర్నిచర్') || title.includes('వుడ్') || title.includes('కార్పెంటర్') ||
             title.includes('సోఫా')
    }
    return false
  })
}

export function sortListingsByPriority(listings: Listing[]): Listing[] {
  return [...listings].sort((a, b) => {
    // 1. Featured first
    if (Boolean(a.isFeatured) !== Boolean(b.isFeatured)) {
      return a.isFeatured ? -1 : 1
    }
    // 2. Display order ascending (1, 2, 3...)
    const orderA = a.displayOrder !== undefined && a.displayOrder !== null ? a.displayOrder : 100
    const orderB = b.displayOrder !== undefined && b.displayOrder !== null ? b.displayOrder : 100
    if (orderA !== orderB) {
      return orderA - orderB
    }
    // 3. Alphabetical
    return (a.title || '').localeCompare(b.title || '')
  })
}

/**
 * Screen 1: Official Welcome Card
 * Banner Image + Concise Telugu greeting + 3 Primary Interactive Buttons
 */
export async function sendWelcomeCard(ctx: FlowCatalogContext) {
  const welcomeText =
    `నమస్కారం! చౌటుప్పల్ యాప్ అధికారిక వాట్సాప్ సేవలకు స్వాగతం. 🙏\n\n` +
    `*మన అందరం... మన చౌటుప్పల్!* 🚀\n` +
    `మీ ఊరు.. మీ యాప్! చౌటుప్పల్ పట్టణంలోని స్థానిక దుకాణాలు, ఆఫర్లు, టాక్సీలు మరియు సేవల సమాచారాన్ని ఇక్కడ సులభంగా పొందవచ్చు.\n\n` +
    `💡 క్రింది బటన్లలో ఒకదాన్ని ఎంచుకోండి:`

  return await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: welcomeText,
    imageUrl: CHOUTUPPAL_BANNER_URL,
    buttons: [
      { id: 'btn_open_directory', title: '📋 మెనూ తెరవండి' },
      { id: 'btn_view_offers', title: '🔥 నేటి ఆఫర్లు' },
      { id: 'btn_app_vcard', title: '📲 యాప్ & కాంటాక్ట్' },
    ],
    footerText: 'చౌటుప్పల్ యాప్ • choutuppal.in',
    territoryId: ctx.territory?.id || 'territory_choutuppal',
    contactName: ctx.senderName,
  }, ctx.store)
}

/**
 * Screen 2: Interactive List Menu
 * 10 categorized rows across 3 clean sections with live business counts
 * for 100% zero-typing tap navigation
 */
export async function sendDirectoryListMenu(ctx: FlowCatalogContext) {
  const allListings = await getCachedListings(ctx.territory?.id, ctx.store)

  const mobilesCount = filterListingsByCategory(allListings, 'mobiles').length || CATEGORY_CONFIGS.mobiles.fallbackCount
  const autoCount = filterListingsByCategory(allListings, 'automobile').length || CATEGORY_CONFIGS.automobile.fallbackCount
  const kiranaCount = filterListingsByCategory(allListings, 'kirana').length || CATEGORY_CONFIGS.kirana.fallbackCount
  const foodCount = filterListingsByCategory(allListings, 'food').length || CATEGORY_CONFIGS.food.fallbackCount
  const healthCount = filterListingsByCategory(allListings, 'health').length || CATEGORY_CONFIGS.health.fallbackCount
  const electricalCount = filterListingsByCategory(allListings, 'electrical').length || CATEGORY_CONFIGS.electrical.fallbackCount
  const servicesCount = filterListingsByCategory(allListings, 'services').length || CATEGORY_CONFIGS.services.fallbackCount
  const internetCount = filterListingsByCategory(allListings, 'internet').length || CATEGORY_CONFIGS.internet.fallbackCount
  const furnitureCount = filterListingsByCategory(allListings, 'furniture').length || CATEGORY_CONFIGS.furniture.fallbackCount

  const listBody =
    `🔍 *చౌటుప్పల్ లోకల్ బిజినెస్ డైరెక్టరీ* 🏢\n` +
    `మన చౌటుప్పల్ పట్టణంలోని దుకాణాలు & సేవల కేటగిరీలు క్రింద ఉన్నాయి. ప్రతి కేటగిరీలోని షాపులను చూడటానికి క్రింది లిస్ట్ నుండి ఎంచుకోండి:`

  return await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: listBody,
    listButtonText: '📋 కేటగిరీ ఎంచుకోండి',
    listSections: [
      {
        title: '🛍️ ప్రముఖ షాపింగ్ & వాహనాలు',
        rows: [
          {
            id: 'row_cat_mobiles',
            title: '📱 మొబైల్స్ & ఎలక్ట్రానిక్స్',
            description: `${mobilesCount} షాప్ • స్మార్ట్‌ఫోన్లు, సర్వీసింగ్ & సేల్స్`,
          },
          {
            id: 'row_cat_automobile',
            title: '🚗 ఆటోమొబైల్ & గ్యారేజ్',
            description: `${autoCount} షాపులు • గ్యారేజ్ & బైక్/కార్ సర్వీసింగ్`,
          },
          {
            id: 'row_cat_kirana',
            title: '🛒 కిరాణా & సూపర్ మార్కెట్',
            description: `${kiranaCount} షాపులు • నిత్యావసరాలు & జనరల్ స్టోర్స్`,
          },
          {
            id: 'row_cat_food',
            title: '🍽️ హోటల్స్ & రెస్టారెంట్లు',
            description: `${foodCount} షాపులు • టిఫిన్స్, బిర్యానీ & భోజనం`,
          },
        ],
      },
      {
        title: '🏥 ఆరోగ్యం & నిత్య సేవలు',
        rows: [
          {
            id: 'row_cat_health',
            title: '🏥 ఆస్పత్రులు & మెడికల్స్',
            description: `${healthCount} షాపులు • క్లినిక్స్, మందులు & టెస్టులు`,
          },
          {
            id: 'row_cat_electrical',
            title: '⚡ ఎలక్ట్రికల్ & హార్డ్‌వేర్',
            description: `${electricalCount} షాపులు • వైరింగ్, మోటార్స్ & శానిటరీ`,
          },
          {
            id: 'row_cat_services',
            title: '🔧 సర్వీసెస్ & వర్కర్స్',
            description: `${servicesCount} షాపులు • ప్లంబర్, ఎలక్ట్రీషియన్ & రిపేర్లు`,
          },
        ],
      },
      {
        title: '💻 డిజిటల్, సోషల్ & ఎమర్జెన్సీ',
        rows: [
          {
            id: 'row_cat_internet',
            title: '💻 మీసేవ & ఆన్‌లైన్ సేవలు',
            description: `${internetCount} షాపులు • ఆధార్, పాన్ & ఆన్‌లైన్ వర్క్స్`,
          },
          {
            id: 'row_social_media',
            title: '🌐 సోషల్ మీడియా & గ్రూప్స్',
            description: 'యూట్యూబ్, ఇన్‌స్టాగ్రామ్, వాట్సాప్ ఛానల్ & గ్రూప్స్',
          },
          {
            id: 'row_cat_emergency',
            title: '🚨 అత్యవసర హెల్ప్‌లైన్',
            description: 'పోలీస్ (100), అంబులెన్స్ (108), ఫైర్ (101)',
          },
        ],
      },
    ],
    footerText: 'చౌటుప్పల్ యాప్ • choutuppal.in',
    territoryId: ctx.territory?.id || 'territory_choutuppal',
    contactName: ctx.senderName,
  }, ctx.store)
}

/**
 * Screen 3: Category Shop Sub-List or Direct Business Card
 * If 1 shop in category -> opens Single Listing Details Card directly.
 * If >1 shops -> presents Interactive List of businesses inside that category.
 */
export async function sendCategoryShopList(
  ctx: FlowCatalogContext,
  categoryKey: string
) {
  const normalizedKey = categoryKey.replace('row_cat_', '').toLowerCase()

  if (normalizedKey === 'emergency') {
    return await sendEmergencyCard(ctx)
  }

  const catConfig = CATEGORY_CONFIGS[normalizedKey] || {
    key: normalizedKey,
    rowId: `row_cat_${normalizedKey}`,
    title: '🏢 స్థానిక వ్యాపారాలు',
    teluguName: 'స్థానిక వ్యాపారాలు',
    descriptionTemplate: '{count} షాపులు అందుబాటులో ఉన్నాయి',
    categoryIds: [],
    icon: '🏢',
    fallbackCount: 1,
  }

  const allListings = await getCachedListings(ctx.territory?.id, ctx.store)
  const matched = filterListingsByCategory(allListings, normalizedKey)
  const sorted = sortListingsByPriority(matched)

  // Case 1: Exactly 1 listing in category (e.g. Mobiles -> Sri Laxmi Mobiles)
  if (sorted.length === 1) {
    return await sendSingleListingDetailsCard(ctx, sorted[0], normalizedKey)
  }

  // Case 2: Multiple listings in category (e.g. Automobile, Food, Health, etc.)
  if (sorted.length > 1) {
    const listBody =
      `${catConfig.icon} *చౌటుప్పల్ ${catConfig.teluguName}* 🏢\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 *మొత్తం వెరిఫైడ్ షాపులు:* ${sorted.length}\n` +
      `⭐ *ర్యాంకింగ్:* టాప్ రేటెడ్ & ప్రాధాన్యత క్రమంలో\n\n` +
      `మన చౌటుప్పల్ పట్టణంలోని ప్రముఖ ${catConfig.teluguName} వివరాలు క్రింద ఉన్నాయి.\n\n` +
      `👇 షాప్ ఫోటోలు, లొకేషన్ & ఫోన్ నంబర్ కోసం క్రింది *'షాపుల జాబితా'* బటన్ నొక్కి ఎంచుకోండి:`

    const rows = sorted.slice(0, 10).map((l, index) => {
      const cleanTitle = (l.title || `షాప్ #${index + 1}`).replace(/[\r\n]+/g, ' ').trim()
      const prefix = l.isFeatured ? '⭐ ' : `${index + 1}. `
      const availableLen = 24 - prefix.length
      const displayTitle = `${prefix}${cleanTitle.slice(0, availableLen)}`.slice(0, 24)

      const cleanAddress = (l.address || 'చౌటుప్పల్ టౌన్')
        .replace(/,?\s*(Telangana|Yadadri Bhuvanagiri District|యాదాద్రి భువనగిరి జిల్లా|508252)/gi, '')
        .replace(/[\r\n]+/g, ' ')
        .trim()
      const cleanPhone = (l.phone || '').replace(/\D/g, '')
      const phoneDisplay = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone

      const desc = phoneDisplay
        ? `📍 ${cleanAddress.slice(0, 42)} • 📞 ${phoneDisplay}`
        : `📍 ${cleanAddress.slice(0, 60)}`

      return {
        id: `row_biz_${l.id}`,
        title: displayTitle,
        description: desc.slice(0, 72),
      }
    })

    return await sendWhatsAppFlowMessage({
      toPhone: ctx.toPhone,
      messageText: listBody,
      listButtonText: '📋 షాపుల జాబితా',
      listSections: [
        {
          title: `🏪 ${catConfig.teluguName.slice(0, 20)}`,
          rows,
        },
      ],
      footerText: 'చౌటుప్పల్ యాప్ • choutuppal.in',
      territoryId: ctx.territory?.id || 'territory_choutuppal',
      contactName: ctx.senderName,
    }, ctx.store)
  }

  // Case 3: Zero listings fallback
  const fallbackText =
    `${catConfig.icon} *${catConfig.teluguName}*\n\n` +
    `మన చౌటుప్పల్ పట్టణంలో ఈ కేటగిరీకి చెందిన వెరిఫైడ్ దుకాణాలు త్వరలో పూర్తి వివరాలతో అప్‌డేట్ అవుతాయి.\n\n` +
    `📞 మీ షాపును ఉచితంగా నమోదు చేసుకోవడానికి లేదా ఇతర కేటగిరీలను చూడటానికి క్రింది బటన్ నొక్కండి:`

  return await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: fallbackText,
    imageUrl: CHOUTUPPAL_BANNER_URL,
    buttons: [
      { id: 'btn_open_directory', title: '📋 ఇతర కేటగిరీలు' },
      { id: 'btn_app_vcard', title: '📲 యాప్ డౌన్‌లోడ్' },
      { id: 'btn_home', title: '🏠 ప్రధాన మెనూ' },
    ],
    footerText: 'చౌటుప్పల్ యాప్ • choutuppal.in',
    territoryId: ctx.territory?.id || 'territory_choutuppal',
    contactName: ctx.senderName,
  }, ctx.store)
}

/**
 * Screen 4: Single Business Details Card
 * Displays storefront photo, bold business title, clean verified badge (no open/recommended tags),
 * structured contact details, and clean action buttons (Full Profile button replaces App Download).
 */
export async function sendSingleListingDetailsCard(
  ctx: FlowCatalogContext,
  listing: Listing,
  categoryKey?: string
) {
  const cleanPhone = (listing.whatsapp || listing.phone || '9494348175').replace(/\D/g, '')
  const phoneFormatted = cleanPhone.length === 10 ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : (listing.phone || cleanPhone)
  const verifiedBadge = listing.isFeatured ? '⭐ *వెరిఫైడ్ లోకల్ బిజినెస్ (Verified)* ✅\n' : ''

  const cleanAddress = (listing.address || 'చౌటుప్పల్, తెలంగాణ').replace(/[\r\n]+/g, ' ').trim()

  let cardText =
    `🏪 *${listing.title.trim()}*\n` +
    verifiedBadge +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📍 *చిరునామా:* ${cleanAddress}\n` +
    `📞 *ఫోన్ నంబర్:* ${phoneFormatted}\n` +
    `💬 *వాట్సాప్ చాట్:* wa.me/91${cleanPhone}\n` +
    `⏰ *వేళలు:* ఉదయం 9:00 AM – రాత్రి 9:30 PM\n`

  if (listing.description && listing.description.trim()) {
    cardText += `\n📝 *సేవలు & వివరాలు:*\n${listing.description.trim().slice(0, 160)}\n`
  }

  cardText +=
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 షాప్ ఫోటోలు, లొకేషన్ రూట్ & పూర్తి సమాచారం కోసం క్రింది *'పూర్తి ప్రొఫైల్'* బటన్ నొక్కండి:`

  return await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: cardText,
    imageUrl: listing.coverImage || CHOUTUPPAL_BANNER_URL,
    buttons: [
      { id: `btn_prof_${listing.id}`, title: '🌐 పూర్తి ప్రొఫైల్' },
      { id: 'btn_open_directory', title: '📋 ఇతర షాపులు' },
      { id: 'btn_home', title: '🏠 ప్రధాన మెనూ' },
    ],
    footerText: 'చౌటుప్పల్ యాప్ • choutuppal.in',
    territoryId: ctx.territory?.id || 'territory_choutuppal',
    contactName: ctx.senderName,
  }, ctx.store)
}

/**
 * Screen 5: Business Web Profile URL Message
 * Delivered when citizen taps "🌐 పూర్తి ప్రొఫైల్" button.
 */
export async function sendListingWebProfile(ctx: FlowCatalogContext, listing: Listing) {
  const rawSlug = (listing.slug || '').trim()
  const cleanSlug = rawSlug && rawSlug !== '-choutuppal' && !rawSlug.startsWith('-') ? rawSlug : listing.id
  const profileUrl = `https://choutuppal-crm.vercel.app/business/${cleanSlug}`

  const profileText =
    `🌐 *${listing.title.trim()}*\n` +
    `*అధికారిక వెబ్ ప్రొఫైల్ (Web Profile)* 🚀\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `ఈ షాప్ యొక్క పూర్తి వివరాలను ఆన్‌లైన్‌లో చూడటానికి క్రింది లింక్ క్లిక్ చేయండి:\n` +
    `👉 ${profileUrl}\n\n` +
    `✨ *వెబ్‌సైట్‌లో మీకు లభించే సమాచారం:*\n` +
    `• 📸 షాప్ గ్యాలరీ & స్టోర్‌ఫ్రంట్ ఫోటోలు\n` +
    `• 🗺️ గూగుల్ మ్యాప్ డైరెక్షన్స్ & లైవ్ రూట్\n` +
    `• ⭐ కస్టమర్ రివ్యూలు & రేటింగ్స్\n` +
    `• 🏷️ ప్రత్యేక ఆఫర్లు & డిస్కౌంట్లు\n` +
    `• 📲 వన్-ట్యాప్ డైరెక్ట్ కాల్ & వాట్సాప్\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 ఇతర సేవలు లేదా మెనూ కోసం క్రింది బటన్ నొక్కండి:`

  return await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: profileText,
    imageUrl: listing.coverImage || CHOUTUPPAL_BANNER_URL,
    buttons: [
      { id: 'btn_open_directory', title: '📋 ఇతర కేటగిరీలు' },
      { id: 'btn_social_media', title: '🌐 సోషల్ మీడియా' },
      { id: 'btn_home', title: '🏠 ప్రధాన మెనూ' },
    ],
    footerText: 'చౌటుప్పల్ యాప్ • choutuppal.in',
    territoryId: ctx.territory?.id || 'territory_choutuppal',
    contactName: ctx.senderName,
  }, ctx.store)
}

/**
 * Screen 6: All-in-One App Download & Official Native vCard
 */
export async function sendAppAndContactVCard(ctx: FlowCatalogContext) {
  const appMsg =
    `📱 *చౌటుప్పల్ యాప్ (CHOUTUPPAL APP)*\n` +
    `*మీ ఊరు.. మీ యాప్!* 🚀\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `మన చౌటుప్పల్ పట్టణ సేవలను మరింత వేగంగా పొందడానికి చౌటుప్పల్ మొబైల్ యాప్‌ను ఉపయోగించండి!\n\n` +
    `📥 *యాప్ డౌన్‌లోడ్ & వెబ్ పోర్టల్:*\n` +
    `👉 https://choutuppal-crm.vercel.app\n\n` +
    `🌐 *అధికారిక సోషల్ మీడియా & కమ్యూనిటీ:*\n` +
    `• 📸 Instagram: https://www.instagram.com/choutuppalapp/\n` +
    `• 📺 YouTube: https://www.youtube.com/@choutuppalapp\n` +
    `• 📘 Facebook: https://www.facebook.com/Choutuppalapp/\n` +
    `• 📢 WhatsApp Channel: https://whatsapp.com/channel/0029VbD28mkGpLHOk8wrLE1a\n` +
    `• 👥 WhatsApp Group: https://chat.whatsapp.com/ItRGBPJJQSZF6x40IozSJe\n\n` +
    `📇 *హెల్ప్‌లైన్ నంబర్:* +91 94943 48175\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 క్రింద పంపిన కాంటాక్ట్ కార్డుపై క్లిక్ చేసి 'Add to Contacts' లేదా 'Save' ఎంచుకోండి.`

  // 1. Send Logo Image Card with action buttons
  await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: appMsg,
    imageUrl: CHOUTUPPAL_LOGO_URL,
    buttons: [
      { id: 'btn_open_directory', title: '📋 మెనూ తెరవండి' },
      { id: 'btn_social_media', title: '🌐 సోషల్ మీడియా' },
      { id: 'btn_home', title: '🏠 ప్రధాన మెనూ' },
    ],
    footerText: 'చౌటుప్పల్ యాప్ • choutuppal.in',
    territoryId: ctx.territory?.id || 'territory_choutuppal',
    contactName: ctx.senderName,
  }, ctx.store)

  // 2. Immediately send native WhatsApp Contact vCard with CELL type and wa_id
  return await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: 'చౌటుప్పల్ యాప్ అధికారిక కాంటాక్ట్ కార్డ్',
    contacts: [
      {
        name: {
          formatted_name: 'Choutuppal App',
          first_name: 'Choutuppal',
          last_name: 'App',
        },
        phones: [
          {
            phone: '+91 94943 48175',
            type: 'CELL',
            wa_id: '919494348175',
          },
        ],
        urls: [{ url: 'https://choutuppal-crm.vercel.app', type: 'WORK' }],
        org: { company: 'Choutuppal Local Services Hub' },
      },
    ],
    territoryId: ctx.territory?.id || 'territory_choutuppal',
    contactName: ctx.senderName,
  }, ctx.store)
}

/**
 * Screen 7: Active Offers & Deals
 */
export async function sendOffersCard(ctx: FlowCatalogContext) {
  const store = ctx.store
  const activeOffers = (store?.offers || []).filter((o: any) => o.status === 'published')
  const activeStories = (store?.stories || []).filter((s: any) => s.status === 'published')

  let highlights = ''
  if (activeOffers.length > 0) {
    activeOffers.slice(0, 3).forEach((off: any, idx: number) => {
      highlights += `${idx + 1}️⃣ *${off.businessName}*: ${off.title} (${off.discount})\n`
    })
  } else {
    highlights =
      `1️⃣ *శ్రీ లక్ష్మి మొబైల్స్:* కొత్త స్మార్ట్‌ఫోన్‌పై 10% డిస్కౌంట్ + ఉచిత ఇయర్‌బడ్స్!\n` +
      `2️⃣ *రైతు బజార్ సూపర్‌మార్కెట్:* రూ. 1,000 పైన కొనుగోలుపై 5% క్యాష్‌బ్యాక్.\n` +
      `3️⃣ *హైవే ఫ్యామిలీ ధాబా:* స్పెషల్ బిర్యానీ ఫ్యామిలీ ప్యాక్ కాంబో ఆఫర్.\n`
  }

  const offersText =
    `🔥 *చౌటుప్పల్ నేటి తాజా ఆఫర్లు & డిస్కౌంట్లు (Today's Deals)* 🛍️\n\n` +
    highlights +
    `\n👉 లైవ్ వీడియో స్టోరీలు చూడటానికి:\n` +
    `🌐 https://choutuppal-crm.vercel.app/stories`

  return await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: offersText,
    imageUrl: activeStories[0]?.mediaUrl || CHOUTUPPAL_BANNER_URL,
    buttons: [
      { id: 'btn_open_directory', title: '📋 మెనూ తెరవండి' },
      { id: 'btn_social_media', title: '🌐 సోషల్ మీడియా' },
      { id: 'btn_home', title: '🏠 ప్రధాన మెనూ' },
    ],
    footerText: 'చౌటుప్పల్ యాప్ • choutuppal.in',
    territoryId: ctx.territory?.id || 'territory_choutuppal',
    contactName: ctx.senderName,
  }, store)
}

/**
 * Screen 8: Emergency Helpline Hub
 */
export async function sendEmergencyCard(ctx: FlowCatalogContext) {
  const emergencyText =
    `🚨 *చౌటుప్పల్ అత్యవసర & హెల్ప్‌లైన్ నంబర్లు (Emergency 24/7)*\n\n` +
    `అత్యవసర సమయాల్లో ఈ క్రింది నంబర్లకు నేరుగా కాల్ చేయవచ్చు:\n\n` +
    `👮 *పోలీస్ స్టేషన్ చౌటుప్పల్:* 100 లేదా 08694-272233\n` +
    `🚑 *ప్రభుత్వ అంబులెన్స్ సర్వీస్:* 108\n` +
    `🚒 *అగ్నిమాపక కేంద్రం (ఫైర్):* 101 లేదా 08694-272101\n` +
    `🏥 *ప్రభుత్వ ఏరియా ఆస్పత్రి:* 08694-272045\n` +
    `⚡ *విద్యుత్ సహాయ కేంద్రం (TSSPDCL):* 1912\n` +
    `🚰 *మున్సిపల్ కార్యాలయం:* 08694-272022\n\n` +
    `💡 ఈ మెసేజ్‌ను మీ కుటుంబ సభ్యులకు ఫార్వర్డ్ చేసి భద్రపరుచుకోండి.`

  return await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: emergencyText,
    buttons: [
      { id: 'btn_open_directory', title: '📋 మెనూ తెరవండి' },
      { id: 'btn_social_media', title: '🌐 సోషల్ మీడియా' },
      { id: 'btn_home', title: '🏠 ప్రధాన మెనూ' },
    ],
    footerText: 'చౌటుప్పల్ యాప్ • choutuppal.in',
    territoryId: ctx.territory?.id || 'territory_choutuppal',
    contactName: ctx.senderName,
  }, ctx.store)
}

/**
 * Screen 9: Official Social Media & Community Hub
 * Direct clickable links to Instagram, YouTube, Facebook, WhatsApp Channel & Community
 */
export async function sendSocialMediaCard(ctx: FlowCatalogContext) {
  const socialText =
    `🌐 *చౌటుప్పల్ యాప్ అధికారిక సోషల్ మీడియా & కమ్యూనిటీ* 🚀\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `మన చౌటుప్పల్ పట్టణ తాజా వార్తలు, స్థానిక ఆఫర్లు మరియు వ్యాపార విశేషాల కోసం మా అధికారిక సోషల్ మీడియా పేజీలను ఫాలో అవ్వండి:\n\n` +
    `📸 *ఇన్‌స్టాగ్రామ్ (Instagram):*\n` +
    `👉 https://www.instagram.com/choutuppalapp/\n` +
    `*(రీల్స్, డైలీ అప్‌డేట్స్ & పట్టణ విశేషాలు)*\n\n` +
    `📺 *యూట్యూబ్ ఛానల్ (YouTube):*\n` +
    `👉 https://www.youtube.com/@choutuppalapp\n` +
    `*(వీడియో స్టోరీలు & బిజినెస్ ఇంటర్వ్యూలు)*\n\n` +
    `📘 *ఫేస్‌బుక్ పేజీ (Facebook):*\n` +
    `👉 https://www.facebook.com/Choutuppalapp/\n\n` +
    `📢 *అధికారిక వాట్సాప్ ఛానల్ (WhatsApp Channel):*\n` +
    `👉 https://whatsapp.com/channel/0029VbD28mkGpLHOk8wrLE1a\n\n` +
    `👥 *వాట్సాప్ కమ్యూనిటీ గ్రూప్ (Public Group):*\n` +
    `👉 https://chat.whatsapp.com/ItRGBPJJQSZF6x40IozSJe\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 క్రింది బటన్ నొక్కి డైరెక్టరీ మెనూ చూడండి:`

  return await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: socialText,
    imageUrl: CHOUTUPPAL_BANNER_URL,
    buttons: [
      { id: 'btn_open_directory', title: '📋 మెనూ తెరవండి' },
      { id: 'btn_view_offers', title: '🔥 నేటి ఆఫర్లు' },
      { id: 'btn_home', title: '🏠 ప్రధాన మెనూ' },
    ],
    footerText: 'చౌటుప్పల్ యాప్ • choutuppal.in',
    territoryId: ctx.territory?.id || 'territory_choutuppal',
    contactName: ctx.senderName,
  }, ctx.store)
}

// Backward compatibility alias
export const sendCategoryListingsCard = sendCategoryShopList
