import { Category, Village } from './types'

export const WHATSAPP_BOT_NUMBER = '919494348175'
export const WHATSAPP_MEDIA_NUMBER = '919441348175'
export const SITE_NAME = 'Choutuppal.in'
export const SITE_TAGLINE = 'Mana Choutuppal Local Search & WhatsApp Super App'
export const SITE_URL = 'https://choutuppal.in'

export const STANDARD_CATEGORIES: Category[] = [
  { id: 'cat-automobile', name: 'Automobile & Garage', slug: 'automobile', icon: 'Car', telugu: 'ఆటోమొబైల్ & గ్యారేజ్', description: 'Auto sales, service centers, spare parts & bike repair' },
  { id: 'cat-services', name: 'Services & Technicians', slug: 'services', icon: 'Wrench', telugu: 'సేవలు & టెక్నీషియన్లు', description: 'Electricians, plumbers, mechanics, AC repair & home services' },
  { id: 'cat-electrical', name: 'Electrical & Hardware', slug: 'electrical-hardware', icon: 'Zap', telugu: 'ఎలక్ట్రికల్ & హార్డ్‌వేర్', description: 'Electrical goods, wiring, motors & hardware tools' },
  { id: 'cat-health', name: 'Health & Medical', slug: 'health-medical', icon: 'HeartPulse', telugu: 'వైద్యం & ఫార్మసీ', description: 'Hospitals, clinics, medical stores & diagnostic centers' },
  { id: 'cat-food', name: 'Food & Dining', slug: 'food-dining', icon: 'UtensilsCrossed', telugu: 'హోటల్స్ & రెస్టారెంట్లు', description: 'Restaurants, tiffin centers, bakeries & sweets' },
  { id: 'cat-internet', name: 'Internet & MeeSeva', slug: 'internet-cyber-cafe', icon: 'Globe', telugu: 'మీసేవ & నెట్ సెంటర్', description: 'MeeSeva, Cyber Cafe, Xerox, online forms & DTP' },
  { id: 'cat-building', name: 'Building Materials', slug: 'building-materials', icon: 'BrickWall', telugu: 'భవన నిర్మాణ సామాగ్రి', description: 'Cement, steel, sand, bricks & construction supply' },
  { id: 'cat-engineering', name: 'Engineering & Welding', slug: 'engineering-welding', icon: 'Flame', telugu: 'ఇంజనీరింగ్ & వెల్డింగ్', description: 'Welding works, fabrication, grill & shutter manufacturing' },
  { id: 'cat-agriculture', name: 'Agriculture & Seeds', slug: 'agriculture', icon: 'Sprout', telugu: 'వ్యవసాయం & ఎరువులు', description: 'Seeds, pesticides, fertilizers & agriculture equipment' },
  { id: 'cat-furniture', name: 'Furniture & Home', slug: 'furniture-home', icon: 'Armchair', telugu: 'ఫర్నిచర్ & డెకార్', description: 'Furniture showrooms, wood works, mattresses & home decor' },
  { id: 'cat-interior', name: 'Interior & Paints', slug: 'interior-decor', icon: 'Paintbrush', telugu: 'ఇంటీరియర్ & పెయింట్స్', description: 'Paints, false ceiling, glass, ACP & interior design' },
  { id: 'cat-retail', name: 'Retail Shopping', slug: 'retail-shopping', icon: 'ShoppingBag', telugu: 'షాపింగ్ & దుస్తులు', description: 'Supermarkets, cloth stores, readymade garments, footwear' },
  { id: 'cat-realestate', name: 'Real Estate & Lands', slug: 'real-estate', icon: 'Home', telugu: 'రియల్ ఎస్టేట్ & ప్లాట్లు', description: 'Open plots, farmland, commercial properties & houses' },
  { id: 'cat-education', name: 'Education & Coaching', slug: 'education', icon: 'GraduationCap', telugu: 'విద్య & కోచింగ్', description: 'Schools, colleges, coaching centers & tuition classes' },
  { id: 'cat-electronics', name: 'Electronics & Mobiles', slug: 'electronics', icon: 'Smartphone', telugu: 'మొబైల్స్ & ఎలక్ట్రానిక్స్', description: 'Smartphones, repairs, computers & home appliances' },
  { id: 'cat-transport', name: 'Transport & Logistics', slug: 'transport', icon: 'Truck', telugu: 'రవాణా & ట్రాన్స్‌పోర్ట్', description: 'Auto, goods transport, tempo, cabs & parcel service' },
]

export const STANDARD_VILLAGES: Village[] = [
  { id: 'v-choutuppal', name: 'Choutuppal Town', slug: 'choutuppal', district: 'Yadadri Bhuvanagiri', state: 'Telangana', pincode: '508252' },
  { id: 'v-panthangi', name: 'Panthangi', slug: 'panthangi', district: 'Yadadri Bhuvanagiri', state: 'Telangana', pincode: '508252' },
  { id: 'v-malkapur', name: 'Malkapur', slug: 'malkapur', district: 'Yadadri Bhuvanagiri', state: 'Telangana', pincode: '508252' },
  { id: 'v-peddakondur', name: 'Peddakondur', slug: 'peddakondur', district: 'Yadadri Bhuvanagiri', state: 'Telangana', pincode: '508252' },
  { id: 'v-lingojiguda', name: 'Lingoji Guda', slug: 'lingoji-guda', district: 'Yadadri Bhuvanagiri', state: 'Telangana', pincode: '508252' },
  { id: 'v-koyalagudem', name: 'Koyalagudem', slug: 'koyalagudem', district: 'Yadadri Bhuvanagiri', state: 'Telangana', pincode: '508252' },
]

export const PRESET_PHOTO_COVERS = [
  { label: 'Shop / Retail Store', url: 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=800&auto=format&fit=crop&q=80' },
  { label: 'Hardware & Electrical', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80' },
  { label: 'Restaurant & Dining', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80' },
  { label: 'Medical Clinic & Hospital', url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80' },
  { label: 'Real Estate & Plots', url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80' },
  { label: 'Automobile & Garage', url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&auto=format&fit=crop&q=80' },
  { label: 'Building Construction', url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?w=800&auto=format&fit=crop&q=80' },
  { label: 'Mobile & Electronics Store', url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80' },
]

/**
 * WhatsApp Trigger Links that exactly trigger CRM Automations & Flows
 */
export function getWhatsAppUrl(text: string, phone: string = WHATSAPP_BOT_NUMBER): string {
  const cleanPhone = phone.replace(/\D/g, '')
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
}

export function getListingWhatsAppUrl(title: string, id?: string): string {
  return getWhatsAppUrl(`Hi Choutuppal, I want details for ${title} (Ref: ${id || 'Web'})`)
}

export function getServiceWhatsAppUrl(serviceName: string): string {
  return getWhatsAppUrl(`Hi Choutuppal, I need ${serviceName} service in Choutuppal`)
}

export function getRealEstateWhatsAppUrl(title: string): string {
  return getWhatsAppUrl(`Hi Choutuppal, interested in Real Estate property: ${title}`)
}

export function getStoryOfferWhatsAppUrl(title: string, businessName: string): string {
  return getWhatsAppUrl(`Hi Choutuppal, claiming offer "${title}" from ${businessName}`)
}

export function getTaxiBookingWhatsAppUrl(): string {
  return getWhatsAppUrl(`Hi Choutuppal, I need a Taxi cab booking`)
}

export function getAutoBookingWhatsAppUrl(): string {
  return getWhatsAppUrl(`Hi Choutuppal, I need an Auto booking at Choutuppal`)
}

export function getPlumberWhatsAppUrl(): string {
  return getWhatsAppUrl(`Hi Choutuppal, I need emergency Plumber service`)
}

export function getElectricianWhatsAppUrl(): string {
  return getWhatsAppUrl(`Hi Choutuppal, I need an Electrician service`)
}

export function getCommunityGroupWhatsAppUrl(wardNumber: number): string {
  return getWhatsAppUrl(`Hi Choutuppal, please add me to Ward ${wardNumber} Community WhatsApp Group`)
}
