/**
 * WhatsApp Flow Catalog & Zero-Typing Interactive Response Engine
 * Houses all official WhatsApp templates, button payloads, list menus, and vCards
 * for @AIMentorji / Choutuppal App (choutuppal.in).
 */

import { sendWhatsAppFlowMessage } from './whatsapp-cloud-api'
import type { Territory, Listing } from './types'

export const CHOUTUPPAL_BANNER_URL = 'https://choutuppal-crm.vercel.app/assets/choutuppal-app-banner.jpg'
export const CHOUTUPPAL_LOGO_URL = 'https://choutuppal-crm.vercel.app/assets/choutuppal-app-logo.jpg'

export interface FlowCatalogContext {
  toPhone: string
  senderName?: string
  territory?: Territory
  store?: any
}

/**
 * Screen 1: Official Welcome Card
 * Banner Image + Concise Telugu greeting + 3 Primary Interactive Buttons
 */
export async function sendWelcomeCard(ctx: FlowCatalogContext) {
  const townUrl = ctx.territory?.primaryDomain ? `https://${ctx.territory.primaryDomain}` : 'https://choutuppal.in'
  
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
 * 10 categorized rows across 4 clean sections for 100% zero-typing tap navigation
 */
export async function sendDirectoryListMenu(ctx: FlowCatalogContext) {
  const listBody =
    `🔍 *చౌటుప్పల్ లోకల్ డైరెక్టరీ & సర్వీసెస్*\n` +
    `మీకు అవసరమైన కేటగిరీని క్రింది లిస్ట్ నుండి ఎంచుకోండి:`

  return await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: listBody,
    listButtonText: '📋 కేటగిరీ ఎంచుకోండి',
    listSections: [
      {
        title: '🛍️ ప్రముఖ దుకాణాలు & షాపింగ్',
        rows: [
          {
            id: 'row_cat_mobiles',
            title: '📱 మొబైల్స్ & ఎలక్ట్రానిక్స్',
            description: 'స్మార్ట్‌ఫోన్లు, సర్వీసింగ్ & గ్యాడ్జెట్స్',
          },
          {
            id: 'row_cat_kirana',
            title: '🛒 కిరాణా & సూపర్ మార్కెట్',
            description: 'నిత్యావసరాలు, కిరాణా & డెలివరీ',
          },
          {
            id: 'row_cat_clothing',
            title: '👗 బట్టలు & ఫ్యాషన్',
            description: 'శారీస్, రెడీమేడ్స్ & టైలరింగ్',
          },
        ],
      },
      {
        title: '🚖 రవాణా & నిత్య సేవలు',
        rows: [
          {
            id: 'row_cat_taxi',
            title: '🚖 24/7 టాక్సీ & క్యాబ్స్',
            description: 'ఎయిర్‌పోర్ట్ డ్రాప్స్ & హైవే రౌండ్ ట్రిప్స్',
          },
          {
            id: 'row_cat_auto',
            title: '🛺 లోకల్ ఆటో స్టాండ్',
            description: 'టౌన్ & గ్రామాలకు లోకల్ ప్రయాణం',
          },
          {
            id: 'row_cat_services',
            title: '🔧 ప్లంబర్, ఎలక్ట్రీషియన్',
            description: 'హోమ్ రిపేర్లు & వర్కర్ల నంబర్లు',
          },
        ],
      },
      {
        title: '🏥 ఆరోగ్యం & ఎమర్జెన్సీ',
        rows: [
          {
            id: 'row_cat_hospitals',
            title: '🏥 ఆస్పత్రులు & క్లినిక్స్',
            description: 'జనరల్, డెంటల్ & పిల్లల వైద్యం',
          },
          {
            id: 'row_cat_medical',
            title: '💊 24/7 మెడికల్ షాపులు',
            description: 'రాత్రి వేళల్లో అందుబాటులో ఉండే మందులు',
          },
          {
            id: 'row_cat_emergency',
            title: '🚨 పోలీస్, అంబులెన్స్, ఫైర్',
            description: '100, 108, 101 తక్షణ అత్యవసర నంబర్లు',
          },
        ],
      },
      {
        title: '📲 చౌటుప్పల్ యాప్',
        rows: [
          {
            id: 'row_app_vcard',
            title: '📲 యాప్ డౌన్‌లోడ్ & కాంటాక్ట్',
            description: 'ఆండ్రాయిడ్ యాప్ & అధికారిక నంబర్ సేవ్',
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
 * Screen 3: All-in-One App Download & Official Native vCard
 * Combines official logo, download links, and native contact card
 */
export async function sendAppAndContactVCard(ctx: FlowCatalogContext) {
  const appMsg =
    `📱 *చౌటుప్పల్ యాప్ (CHOUTUPPAL APP)*\n` +
    `*మీ ఊరు.. మీ యాప్!* 🚀\n\n` +
    `మన చౌటుప్పల్ పట్టణ సేవలను మరింత వేగంగా పొందడానికి చౌటుప్పల్ మొబైల్ యాప్‌ను ఇప్పుడే డౌన్‌లోడ్ చేసుకోండి!\n\n` +
    `📥 *యాప్ డౌన్‌లోడ్ లింక్:*\n` +
    `https://choutuppal.in/app (Google Play & Web App)\n\n` +
    `📇 *అధికారిక నంబర్:* +91 94943 48175\n` +
    `(క్రింద పంపిన కాంటాక్ట్ కార్డును ఒక్క క్లిక్‌తో మీ ఫోన్‌లో సేవ్ చేసుకోండి)`

  // 1. Send Logo Image Card with action buttons
  await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: appMsg,
    imageUrl: CHOUTUPPAL_LOGO_URL,
    buttons: [
      { id: 'btn_open_directory', title: '📋 మెనూ తెరవండి' },
      { id: 'btn_view_offers', title: '🔥 నేటి ఆఫర్లు' },
      { id: 'btn_home', title: '🏠 ప్రధాన మెనూ' },
    ],
    footerText: 'చౌటుప్పల్ యాప్ • choutuppal.in',
    territoryId: ctx.territory?.id || 'territory_choutuppal',
    contactName: ctx.senderName,
  }, ctx.store)

  // 2. Immediately send native WhatsApp Contact vCard
  return await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: 'చౌటుప్పల్ యాప్ అధికారిక కాంటాక్ట్ కార్డ్',
    contacts: [
      {
        name: {
          formatted_name: 'Choutuppal App (చౌటుప్పల్ యాప్)',
          first_name: 'Choutuppal App',
          last_name: '(చౌటుప్పల్ యాప్)',
        },
        phones: [{ phone: '+919494348175', type: 'WORK' }],
        urls: [{ url: 'https://choutuppal.in', type: 'WORK' }],
        org: { company: 'Choutuppal Local Business & Services Hub' },
      },
    ],
    territoryId: ctx.territory?.id || 'territory_choutuppal',
    contactName: ctx.senderName,
  }, ctx.store)
}

/**
 * Screen 4: Category Listings Card
 * Retrieves top listings in category ordered by isFeatured (first) and displayOrder (1, 2, 3...)
 */
export async function sendCategoryListingsCard(
  ctx: FlowCatalogContext,
  categoryKey: string,
  categoryLabel: string,
  categoryTelugu: string
) {
  const store = ctx.store
  const listings: Listing[] = (store?.listings || []).filter((l: Listing) => {
    const cat = (l.categoryId || '').toLowerCase()
    const name = (l.categoryName || '').toLowerCase()
    const title = (l.title || '').toLowerCase()

    if (categoryKey === 'mobiles') {
      return cat.includes('electronics') || cat.includes('mobile') || name.includes('mobile') || title.includes('mobile') || title.includes('లక్ష్మి')
    }
    if (categoryKey === 'kirana') {
      return cat.includes('retail') || cat.includes('kirana') || name.includes('kirana') || title.includes('kirana') || title.includes('బజార్')
    }
    if (categoryKey === 'clothing') {
      return cat.includes('retail') || cat.includes('cloth') || name.includes('cloth') || title.includes('మ్యాచింగ్') || title.includes('శారీస్')
    }
    if (categoryKey === 'taxi') {
      return cat.includes('transport') || cat.includes('automobile') || name.includes('taxi') || title.includes('టాక్సీ') || title.includes('క్యాబ్')
    }
    if (categoryKey === 'auto') {
      return cat.includes('transport') || cat.includes('automobile') || title.includes('ఆటో')
    }
    if (categoryKey === 'services') {
      return cat.includes('services') || cat.includes('electrical') || name.includes('service') || title.includes('వర్క్స్') || title.includes('ఎలక్ట్రికల్')
    }
    if (categoryKey === 'hospitals') {
      return cat.includes('health') || name.includes('health') || title.includes('హాస్పిటల్') || title.includes('క్లినిక్') || title.includes('డెంటల్')
    }
    if (categoryKey === 'medical') {
      return cat.includes('health') || title.includes('మెడికల్') || title.includes('ఫార్మసీ')
    }
    return false
  })

  // Sort by isFeatured first, then displayOrder ascending (1, 2, 3...)
  listings.sort((a: Listing, b: Listing) => {
    if (Boolean(a.isFeatured) !== Boolean(b.isFeatured)) return a.isFeatured ? -1 : 1
    const orderA = a.displayOrder !== undefined ? a.displayOrder : 100
    const orderB = b.displayOrder !== undefined ? b.displayOrder : 100
    if (orderA !== orderB) return orderA - orderB
    return (a.title || '').localeCompare(b.title || '')
  })

  const topListing = listings[0]

  if (topListing) {
    const rankBadge = topListing.displayOrder ? `[ ర్యాంక్ #${topListing.displayOrder} ]` : '[ టాప్ రికమండెడ్ ]'
    const featuredBadge = topListing.isFeatured ? ' • [ వెరిఫైడ్ ✅ ]' : ''
    const cleanPhone = (topListing.whatsapp || topListing.phone || '9494348175').replace(/\D/g, '')

    const cardText =
      `🏪 *${topListing.title}*\n` +
      `${rankBadge}${featuredBadge} • [ 🟢 ప్రస్తుతం ఓపెన్ ]\n\n` +
      `📍 *చిరునామా:* ${topListing.address}\n` +
      (topListing.description ? `📝 *వివరాలు:* ${topListing.description.slice(0, 140)}\n\n` : '\n') +
      `⏰ *వేళలు:* ఉదయం 9:00 AM – రాత్రి 9:30 PM\n` +
      `📞 *కాల్ చేయండి:* ${topListing.phone}\n` +
      `💬 *వాట్సాప్ చాట్:* https://wa.me/91${cleanPhone}\n` +
      `🌐 *పూర్తి ప్రొఫైల్:* https://choutuppal.in/business/${topListing.slug}`

    return await sendWhatsAppFlowMessage({
      toPhone: ctx.toPhone,
      messageText: cardText,
      imageUrl: topListing.coverImage || CHOUTUPPAL_BANNER_URL,
      buttons: [
        { id: 'btn_open_directory', title: '📋 ఇతర కేటగిరీలు' },
        { id: 'btn_app_vcard', title: '📲 యాప్ డౌన్‌లోడ్' },
        { id: 'btn_home', title: '🏠 ప్రధాన మెనూ' },
      ],
      footerText: 'చౌటుప్పల్ యాప్ • choutuppal.in',
      territoryId: ctx.territory?.id || 'territory_choutuppal',
      contactName: ctx.senderName,
    }, store)
  }

  // Fallback if no specific listing in category yet
  const fallbackText =
    `🛍️ *${categoryTelugu} (${categoryLabel})*\n\n` +
    `మన చౌటుప్పల్ పట్టణంలో ఈ కేటగిరీకి చెందిన వెరిఫైడ్ దుకాణాలు మరియు సేవల జాబితా ఇక్కడ అందుబాటులో ఉంది.\n\n` +
    `📞 నేరుగా సంప్రదించడానికి లేదా మీ వ్యాపారాన్ని ఉచితంగా నమోదు చేయడానికి క్రింది బటన్ నొక్కండి.\n` +
    `🌐 వెబ్‌సైట్: https://choutuppal.in/listings`

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
  }, store)
}

/**
 * Screen 5: Active Offers & Deals
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
    `🌐 https://choutuppal.in/stories`

  return await sendWhatsAppFlowMessage({
    toPhone: ctx.toPhone,
    messageText: offersText,
    imageUrl: activeStories[0]?.mediaUrl || CHOUTUPPAL_BANNER_URL,
    buttons: [
      { id: 'btn_open_directory', title: '📋 మెనూ తెరవండి' },
      { id: 'btn_app_vcard', title: '📲 యాప్ డౌన్‌లోడ్' },
      { id: 'btn_home', title: '🏠 ప్రధాన మెనూ' },
    ],
    footerText: 'చౌటుప్పల్ యాప్ • choutuppal.in',
    territoryId: ctx.territory?.id || 'territory_choutuppal',
    contactName: ctx.senderName,
  }, store)
}

/**
 * Screen 6: Emergency Helpline Hub
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
      { id: 'btn_app_vcard', title: '📲 యాప్ & కాంటాక్ట్' },
      { id: 'btn_home', title: '🏠 ప్రధాన మెనూ' },
    ],
    footerText: 'చౌటుప్పల్ యాప్ • choutuppal.in',
    territoryId: ctx.territory?.id || 'territory_choutuppal',
    contactName: ctx.senderName,
  }, ctx.store)
}
