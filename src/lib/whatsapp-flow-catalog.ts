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
  imageUrl?: string
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
    imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&auto=format&fit=crop&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=800&auto=format&fit=crop&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&auto=format&fit=crop&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
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
    imageUrl: CHOUTUPPAL_BANNER_URL,
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
    `మీ ఊరు.. మీ యాప్! చౌటుప్పల్ పట్టణంలోని స్థానిక దుకాణాలు, నా సేవలు, వోచర్లు & వీడియో ప్రకటనలను ఇక్కడ సులభంగా పొందవచ్చు.\n\n` +
    `💡 క్రింది బటన్లలో ఒకదాన్ని ఎంచుకోండి:`

  return await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: welcomeText,
    imageUrl: CHOUTUPPAL_BANNER_URL,
    buttons: [
      { id: 'btn_open_directory', title: '📋 ప్రధాన మెనూ' },
      { id: 'btn_view_offers', title: '🎟️ వోచర్లు & డీల్స్' },
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

  const listBody =
    `🔍 *చౌటుప్పల్ లోకల్ సూపర్ మెనూ* 🏢\n` +
    `షాపులు, నా సేవలు, వోచర్లు, వీడియో అడ్స్ & బిజినెస్ నమోదు వివరాలు క్రింద ఉన్నాయి. కావలసిన ఆప్షన్‌ను క్రింది జాబితా నుండి ఎంచుకోండి:`

  return await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: listBody,
    listButtonText: '📋 ఆప్షన్ ఎంచుకోండి',
    listSections: [
      {
        title: '🛍️ ప్రముఖ వ్యాపారాలు',
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
          {
            id: 'row_cat_health',
            title: '🏥 ఆస్పత్రులు & మెడికల్స్',
            description: `${healthCount} షాపులు • క్లినిక్స్, మందులు & టెస్టులు`,
          },
        ],
      },
      {
        title: '🔧 నా సేవలు & ఎమర్జెన్సీ',
        rows: [
          {
            id: 'row_cat_services',
            title: '🔧 నా సేవలు (Services)',
            description: 'ప్లంబర్, ఎలక్ట్రీషియన్, ఏసీ రిపేర్ & టెక్నీషియన్లు',
          },
          {
            id: 'row_cat_emergency',
            title: '🚨 అత్యవసర హెల్ప్‌లైన్',
            description: 'పోలీస్ (100), అంబులెన్స్ (108), ఫైర్ (101)',
          },
        ],
      },
      {
        title: '🎟️ వోచర్లు, వీడియోలు & యాడ్',
        rows: [
          {
            id: 'row_vouchers_deals',
            title: '🎟️ వోచర్లు & తాజా ఆఫర్లు',
            description: 'డిస్కౌంట్ కూపన్లు, క్యాష్‌బ్యాక్ & స్పెషల్ డీల్స్',
          },
          {
            id: 'row_video_ads',
            title: '🎬 వీడియో అడ్స్ & రీల్స్',
            description: 'లోకల్ దుకాణాల 24h వీడియో ప్రకటనలు & స్టోరీలు',
          },
          {
            id: 'row_add_listing',
            title: '🏪 వ్యాపారాన్ని చేర్చండి',
            description: 'మీ షాపును యాడ్ చేయండి లేదా వివరాలు అప్‌డేట్ చేయండి',
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
    // 1. First send high-resolution Category Photo Banner with verified count
    if (catConfig.imageUrl) {
      const bannerCaption =
        `${catConfig.icon} *చౌటుప్పల్ ${catConfig.teluguName}* 🏢\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📊 *మొత్తం వెరిఫైడ్ షాపులు:* ${sorted.length}\n` +
        `⭐ *ర్యాంకింగ్:* టాప్ రేటెడ్ & ప్రాధాన్యత క్రమంలో`

      await sendWhatsAppFlowMessage({
        toPhone: ctx.toPhone,
        messageText: bannerCaption,
        imageUrl: catConfig.imageUrl,
        footerText: 'చౌటుప్పల్ యాప్ • choutuppal.in',
        territoryId: ctx.territory?.id || 'territory_choutuppal',
        contactName: ctx.senderName,
      }, ctx.store)
    }

    // 2. Immediately send the Interactive List Message for 1-tap selection
    const listBody =
      `మన చౌటుప్పల్ పట్టణంలోని ప్రముఖ ${catConfig.teluguName} వివరాలు క్రింద జాబితాలో ఉన్నాయి.\n\n` +
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
    imageUrl: catConfig.imageUrl || CHOUTUPPAL_BANNER_URL,
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
 * Screen 7: Active Offers & Vouchers Hub
 * Shows discount coupons, cashbacks, and special deals
 */
export async function sendOffersCard(ctx: FlowCatalogContext) {
  const store = ctx.store
  const activeOffers = (store?.offers || []).filter((o: any) => o.status === 'published')
  const activeStories = (store?.stories || []).filter((s: any) => s.status === 'published')

  let highlights = ''
  if (activeOffers.length > 0) {
    activeOffers.slice(0, 3).forEach((off: any, idx: number) => {
      highlights += `${idx + 1}️⃣ *${off.businessName}*: ${off.title} (🎟️ *${off.discount}*)\n`
    })
  } else {
    highlights =
      `1️⃣ *శ్రీ లక్ష్మి మొబైల్స్:* కొత్త స్మార్ట్‌ఫోన్‌పై 10% డిస్కౌంట్ + ఉచిత ఇయర్‌బడ్స్! (🎟️ కోడ్: *CPL10*)\n` +
      `2️⃣ *రైతు బజార్ సూపర్‌మార్కెట్:* రూ. 1,000 పైన కొనుగోలుపై 5% క్యాష్‌బ్యాక్! (🎟️ కోడ్: *SUPER5*)\n` +
      `3️⃣ *హైవే ఫ్యామిలీ ధాబా:* స్పెషల్ బిర్యానీ ఫ్యామిలీ ప్యాక్ కాంబో ఆఫర్! (🎟️ కోడ్: *FOODIE*)\n`
  }

  const offersText =
    `🎟️ *చౌటుప్పల్ నేటి తాజా వోచర్లు & డిస్కౌంట్లు (Today's Deals)* 🛍️\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    highlights +
    `\n👉 లైవ్ వీడియో స్టోరీలు & వోచర్లు చూడటానికి:\n` +
    `🌐 https://choutuppal-crm.vercel.app/stories\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 క్రింది బటన్ నొక్కి వీడియో అడ్స్ లేదా మెనూ చూడండి:`

  return await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: offersText,
    imageUrl: activeStories[0]?.mediaUrl || CHOUTUPPAL_BANNER_URL,
    buttons: [
      { id: 'btn_open_directory', title: '📋 ప్రధాన మెనూ' },
      { id: 'btn_video_ads', title: '🎬 వీడియో రీల్స్' },
      { id: 'btn_home', title: '🏠 హోమ్' },
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

/**
 * Screen 10: My Services & On-Demand Emergency Hub
 * Dedicated for Services, Technicians, Plumbers, Electricians, Taxis & Autos
 */
export async function sendServiceCatalogCard(ctx: FlowCatalogContext) {
  const serviceText =
    `🔧 *చౌటుప్పల్ ఎమర్జెన్సీ & డైలీ సర్వీసెస్ (My Services)* ⚡\n` +
    `*24/7 వెరిఫైడ్ ఆన్-డిమాండ్ సేవలు* 🚀\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `మన చౌటుప్పల్ పట్టణంలో ఎటువంటి బ్రోకర్ ఛార్జీలు లేకుండా నేరుగా టెక్నీషియన్లను సంప్రదించవచ్చు:\n\n` +
    `🚕 *హైవే టాక్సీ & క్యాబ్స్:* హైదరాబాద్ ఎయిర్‌పోర్ట్ డ్రాప్స్, విజయవాడ హైవే ప్రయాణాలు\n` +
    `🛺 *లోకల్ ఆటో స్టాండ్:* పట్టణంలోని అన్ని కాలనీలకు ప్రయాణం\n` +
    `🔧 *ప్లంబర్ సర్వీస్:* పైపుల లీకేజీ, మోటార్ ఫిట్టింగ్ & శానిటరీ వర్క్స్\n` +
    `⚡ *ఎలక్ట్రీషియన్:* హౌస్ వైరింగ్, ఇన్వర్టర్, ఫ్యాన్ & స్విచ్‌బోర్డ్ రిపేర్లు\n` +
    `❄️ *ఏసీ & ఫ్రిజ్ రిపేర్:* గ్యాస్ ఫిల్లింగ్, సర్వీసింగ్ & మెకానిక్స్\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🌐 *ఆన్‌లైన్ సర్వీసెస్ పోర్టల్:*\n` +
    `👉 https://choutuppal-crm.vercel.app/services\n\n` +
    `👇 క్రింది బటన్ నొక్కి మెనూ లేదా ఆఫర్లను ఎంచుకోండి:`

  return await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: serviceText,
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    buttons: [
      { id: 'btn_open_directory', title: '📋 ప్రధాన మెనూ' },
      { id: 'btn_view_offers', title: '🎟️ వోచర్లు & డీల్స్' },
      { id: 'btn_home', title: '🏠 హోమ్' },
    ],
    footerText: 'చౌటుప్పల్ యాప్ • choutuppal.in',
    territoryId: ctx.territory?.id || 'territory_choutuppal',
    contactName: ctx.senderName,
  }, ctx.store)
}

/**
 * Screen 11: Video Ads, Stories & Reels Hub
 * Dedicated for 24-hour shop video stories, promotions, and video ads
 */
export async function sendVideoAdsCard(ctx: FlowCatalogContext) {
  const videoText =
    `🎬 *చౌటుప్పల్ లోకల్ వీడియో ప్రకటనలు & రీల్స్ (Video Ads & Stories)* 🚀\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `మన చౌటుప్పల్ పట్టణ ప్రముఖ దుకాణాల తాజా వీడియో ఆఫర్లు మరియు 24 గంటల వీడియో స్టోరీస్ ఇక్కడ వీక్షించండి:\n\n` +
    `📱 *లైవ్ వీడియో ప్లేయర్:*\n` +
    `👉 https://choutuppal-crm.vercel.app/stories\n\n` +
    `✨ *వీడియో ఫీచర్లు:*\n` +
    `• 🎥 వర్టికల్ ఫుల్-స్క్రీన్ వీడియో రీల్స్\n` +
    `• 🏷️ ప్రత్యేక వీడియో డిస్కౌంట్ వోచర్లు\n` +
    `• 📞 వన్-ట్యాప్ డైరెక్ట్ ఆర్డర్ & కాల్\n` +
    `• 📢 మీ షాప్ వీడియో యాడ్‌ను పబ్లిష్ చేయడానికి సపోర్ట్\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 మీ షాప్ వీడియో ప్రమోషన్ లేదా తాజా వోచర్ల కోసం క్రింది బటన్ నొక్కండి:`

  return await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: videoText,
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
    buttons: [
      { id: 'btn_view_offers', title: '🎟️ నేటి వోచర్లు' },
      { id: 'btn_add_listing', title: '🏪 నా షాప్ వీడియో' },
      { id: 'btn_home', title: '🏠 ప్రధాన మెనూ' },
    ],
    footerText: 'చౌటుప్పల్ యాప్ • choutuppal.in',
    territoryId: ctx.territory?.id || 'territory_choutuppal',
    contactName: ctx.senderName,
  }, ctx.store)
}

/**
 * Screen 12: Add / Manage Listing Hub for Merchants & Business Owners
 */
export async function sendAddManageListingCard(ctx: FlowCatalogContext) {
  const addMsg =
    `🏪 *చౌటుప్పల్ యాప్‌లో మీ వ్యాపారాన్ని చేర్చండి (Add / Manage Listing)* 🚀\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `మీ షాప్ లేదా వ్యాపారాన్ని చౌటుప్పల్ యాప్ మరియు వాట్సాప్ డైరెక్టరీలో నమోదు చేసి వేలాది మంది స్థానిక కస్టమర్లను పొందండి!\n\n` +
    `📝 *నమోదు చేసుకునే విధానం:*\n` +
    `1️⃣ *ఆన్‌లైన్ ఫారమ్:* క్రింది లింక్ ద్వారా 2 నిమిషాల్లో వివరాలు సబ్మిట్ చేయండి:\n` +
    `👉 https://choutuppal-crm.vercel.app/register\n\n` +
    `2️⃣ *వాట్సాప్ ద్వారా నేరుగా:* ఈ క్రింది వివరాలను ఇక్కడే మెసేజ్ చేయండి:\n` +
    `• షాప్ పేరు (Business Name)\n` +
    `• కేటగిరీ (మొబైల్స్, కిరాణా, హోటల్, సర్వీస్ మొదలైనవి)\n` +
    `• ఫోన్ & వాట్సాప్ నంబర్\n` +
    `• షాప్ ఫోటోలు & పూర్తి చిరునామా\n\n` +
    `⭐ *ప్రాధాన్యత ర్యాంకింగ్ & మేనేజ్:* నంబరింగ్ (1, 2, 3...) మరియు వివరాల సవరణ కోసం మా టీమ్ మీకు వెరిఫికేషన్ కాల్ చేస్తుంది.\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 క్రింది బటన్లలో ఒకదాన్ని ఎంచుకోండి:`

  return await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: addMsg,
    imageUrl: CHOUTUPPAL_BANNER_URL,
    buttons: [
      { id: 'btn_open_directory', title: '📋 ప్రధాన మెనూ' },
      { id: 'btn_social_media', title: '🌐 సోషల్ మీడియా' },
      { id: 'btn_home', title: '🏠 హోమ్' },
    ],
    footerText: 'చౌటుప్పల్ యాప్ • choutuppal.in',
    territoryId: ctx.territory?.id || 'territory_choutuppal',
    contactName: ctx.senderName,
  }, ctx.store)
}

// Backward compatibility alias
export const sendCategoryListingsCard = sendCategoryShopList
