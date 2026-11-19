import type { Category, Village, GovtContactCategoryMeta } from './types'

export const WHATSAPP_BOT_NUMBER = '919494348175'
export const WHATSAPP_MEDIA_NUMBER = '919441348175'
export const SITE_NAME = 'Choutuppal.in'
export const SITE_TAGLINE = 'Mana Choutuppal Local Search & WhatsApp Super App'
export const SITE_URL = 'https://choutuppal.in'

export const STANDARD_CATEGORIES: Category[] = [
  {
    id: 'cat-automobile',
    name: 'Automobile & Garage',
    slug: 'automobile',
    icon: 'Car',
    telugu: 'ఆటోమొబైల్ & గ్యారేజ్',
    description: 'Auto sales, service centers, spare parts & bike repair',
    subcategories: [
      { id: 'sub_bike_service', name: 'Bike Service & Repair', telugu: 'టూ వీలర్ & బైక్ సర్వీస్', slug: 'bike-service' },
      { id: 'sub_car_garage', name: 'Car Garage & Repairs', telugu: 'కార్ గ్యారేజ్ & వాషింగ్', slug: 'car-garage' },
      { id: 'sub_auto_spares', name: 'Auto Spare Parts & Batteries', telugu: 'స్పేర్ పార్ట్స్ & బ్యాటరీలు', slug: 'auto-spare-parts' },
      { id: 'sub_tyre_works', name: 'Tyre Puncture & Wheel Alignment', telugu: 'టైర్ వర్క్స్ & అలైన్‌మెంట్', slug: 'tyre-works' },
      { id: 'sub_auto_rickshaw', name: 'Auto Rickshaw Works', telugu: 'ఆటో రిక్షా రిపేర్స్', slug: 'auto-rickshaw-works' },
    ],
  },
  {
    id: 'cat-services',
    name: 'Services & Technicians',
    slug: 'services',
    icon: 'Wrench',
    telugu: 'సేవలు & టెక్నీషియన్లు',
    description: 'Electricians, plumbers, mechanics, AC repair & home services',
    subcategories: [
      { id: 'sub_electrician', name: 'Electrician', telugu: 'ఎలక్ట్రీషియన్', slug: 'electrician' },
      { id: 'sub_plumber', name: 'Plumber', telugu: 'ప్లంబర్', slug: 'plumber' },
      { id: 'sub_ac_fridge', name: 'AC, Fridge & Washing Machine', telugu: 'ఏసీ, ఫ్రిజ్ & వాషింగ్ మెషీన్', slug: 'ac-fridge-repair' },
      { id: 'sub_carpenter', name: 'Carpenter & Wood Works', telugu: 'కార్పెంటర్ / వడ్రంగి', slug: 'carpenter-wood-works' },
      { id: 'sub_painter', name: 'House Painters', telugu: 'హౌస్ పెయింటర్స్', slug: 'house-painters' },
      { id: 'sub_cleaning', name: 'Home Cleaning & Pest Control', telugu: 'క్లీనింగ్ & పెస్ట్ కంట్రోల్', slug: 'home-cleaning' },
    ],
  },
  {
    id: 'cat-electrical',
    name: 'Electrical & Hardware',
    slug: 'electrical-hardware',
    icon: 'Zap',
    telugu: 'ఎలక్ట్రికల్ & హార్డ్‌వేర్',
    description: 'Electrical goods, wiring, motors & hardware tools',
    subcategories: [
      { id: 'sub_electrical_goods', name: 'Electrical Goods & Wiring', telugu: 'ఎలక్ట్రికల్ వైరింగ్ & ఫిట్టింగ్స్', slug: 'electrical-goods' },
      { id: 'sub_hardware_tools', name: 'Hardware & Tools', telugu: 'హార్డ్‌వేర్ & టూల్స్', slug: 'hardware-tools' },
      { id: 'sub_motors_pumps', name: 'Submersible Motors & Pumps', telugu: 'మోటార్లు & పంపులు', slug: 'motors-pumps' },
      { id: 'sub_solar_inverters', name: 'Inverters & Solar Systems', telugu: 'ఇన్వర్టర్లు & సోలార్', slug: 'solar-inverters' },
      { id: 'sub_lighting', name: 'Lighting & Decorative Lights', telugu: 'డెకరేటివ్ లైట్స్ & ఎల్‌ఈడీ', slug: 'lighting' },
    ],
  },
  {
    id: 'cat-health',
    name: 'Health & Medical',
    slug: 'health-medical',
    icon: 'HeartPulse',
    telugu: 'వైద్యం & ఫార్మసీ',
    description: 'Hospitals, clinics, medical stores & diagnostic centers',
    subcategories: [
      { id: 'sub_hospitals', name: 'Hospitals & Clinics', telugu: 'ఆస్పత్రులు & క్లినిక్స్', slug: 'hospitals-clinics' },
      { id: 'sub_pharmacy', name: 'Medical Stores & Pharmacy', telugu: 'మెడికల్ షాపులు & మందులు', slug: 'pharmacy-medical' },
      { id: 'sub_diagnostics', name: 'Diagnostic Labs & Blood Tests', telugu: 'ల్యాబ్స్ & డయాగ్నస్టిక్స్', slug: 'diagnostic-labs' },
      { id: 'sub_dental', name: 'Dental Clinics', telugu: 'దంత వైద్యశాల', slug: 'dental-clinics' },
      { id: 'sub_opticals', name: 'Eye Care & Opticals', telugu: 'కంటి ఆస్పత్రి & కళ్ళద్దాలు', slug: 'eye-opticals' },
    ],
  },
  {
    id: 'cat-food',
    name: 'Food & Dining',
    slug: 'food-dining',
    icon: 'UtensilsCrossed',
    telugu: 'హోటల్స్ & రెస్టారెంట్లు',
    description: 'Restaurants, tiffin centers, bakeries & sweets',
    subcategories: [
      { id: 'sub_restaurants', name: 'Family Restaurants & Biryani', telugu: 'రెస్టారెంట్లు & బిర్యానీ', slug: 'family-restaurants' },
      { id: 'sub_tiffins', name: 'Tiffin Centers & Breakfast', telugu: 'టిఫిన్ సెంటర్లు', slug: 'tiffin-centers' },
      { id: 'sub_bakeries', name: 'Bakeries & Cakes', telugu: 'బేకరీలు & కేక్ షాపులు', slug: 'bakeries-cakes' },
      { id: 'sub_sweets', name: 'Sweet Shops & Snacks', telugu: 'స్వీట్స్ & చాట్ సెంటర్లు', slug: 'sweet-shops' },
      { id: 'sub_fastfood', name: 'Fast Food & Chinese', telugu: 'ఫాస్ట్ ఫుడ్ & నూడుల్స్', slug: 'fast-food' },
      { id: 'sub_tea_cafe', name: 'Tea Stalls & Cafes', telugu: 'టీ స్టాల్స్ & కేఫ్స్', slug: 'tea-cafes' },
    ],
  },
  {
    id: 'cat-internet',
    name: 'Internet & MeeSeva',
    slug: 'internet-cyber-cafe',
    icon: 'Globe',
    telugu: 'మీసేవ & నెట్ సెంటర్',
    description: 'MeeSeva, Cyber Cafe, Xerox, online forms & DTP',
    subcategories: [
      { id: 'sub_meeseva', name: 'MeeSeva Services', telugu: 'మీసేవ & ప్రభుత్వ సేవలు', slug: 'meeseva-services' },
      { id: 'sub_cyber_cafe', name: 'Cyber Cafe & Online Job Forms', telugu: 'సైబర్ కేఫ్ & జాబ్ అప్లికేషన్స్', slug: 'cyber-cafe' },
      { id: 'sub_xerox_printing', name: 'Xerox, DTP & Color Printing', telugu: 'జెరాక్స్, డీటీపీ & ప్రింటింగ్', slug: 'xerox-dtp-printing' },
      { id: 'sub_aadhaar_pan', name: 'Aadhaar & PAN Card Services', telugu: 'ఆధార్ & పాన్ కార్డ్ సేవలు', slug: 'aadhaar-pan-services' },
      { id: 'sub_flex_printing', name: 'Flex & Banner Printing', telugu: 'ఫ్లెక్స్ & విజిటింగ్ కార్డ్స్', slug: 'flex-banner-printing' },
    ],
  },
  {
    id: 'cat-building',
    name: 'Building Materials',
    slug: 'building-materials',
    icon: 'BrickWall',
    telugu: 'భవన నిర్మాణ సామాగ్రి',
    description: 'Cement, steel, sand, bricks & construction supply',
    subcategories: [
      { id: 'sub_cement_steel', name: 'Cement & TMT Steel', telugu: 'సిమెంట్ & టీఎంటీ ఐరన్', slug: 'cement-steel' },
      { id: 'sub_sand_bricks', name: 'Sand, Bricks & Gravel', telugu: 'ఇసుక, ఇటుకలు & కంకర', slug: 'sand-bricks-gravel' },
      { id: 'sub_tiles_granite', name: 'Tiles, Granite & Marble', telugu: 'టైల్స్, గ్రానైట్ & మార్బుల్', slug: 'tiles-granite-marble' },
      { id: 'sub_sanitary', name: 'Sanitaryware & Pipes', telugu: 'సానిటరీ & పైపులు', slug: 'sanitaryware-pipes' },
      { id: 'sub_rmc', name: 'Ready Mix Concrete (RMC)', telugu: 'రెడీ మిక్స్ కాంక్రీట్', slug: 'ready-mix-concrete' },
    ],
  },
  {
    id: 'cat-engineering',
    name: 'Engineering & Welding',
    slug: 'engineering-welding',
    icon: 'Flame',
    telugu: 'ఇంజనీరింగ్ & వెల్డింగ్',
    description: 'Welding works, fabrication, grill & shutter manufacturing',
    subcategories: [
      { id: 'sub_welding', name: 'Fabrication & Welding Works', telugu: 'వెల్డింగ్ & ఫ్యాబ్రికేషన్', slug: 'welding-fabrication' },
      { id: 'sub_shutters_gates', name: 'Rolling Shutters & Gates', telugu: 'రోలింగ్ షట్టర్స్ & మెయిన్ గేట్లు', slug: 'rolling-shutters-gates' },
      { id: 'sub_grills', name: 'Steel Grills & Railings', telugu: 'స్టీల్ గ్రిల్స్ & రైలింగ్స్', slug: 'steel-grills-railings' },
      { id: 'sub_sheds', name: 'Roofing Sheds & Trusses', telugu: 'రూఫింగ్ షెడ్స్ & ట్రస్సులు', slug: 'roofing-sheds' },
      { id: 'sub_lathe', name: 'Lathe Machine & Turning Works', telugu: 'లేత్ మిషన్ వర్క్స్', slug: 'lathe-machine-works' },
    ],
  },
  {
    id: 'cat-agriculture',
    name: 'Agriculture & Seeds',
    slug: 'agriculture',
    icon: 'Sprout',
    telugu: 'వ్యవసాయం & ఎరువులు',
    description: 'Seeds, pesticides, fertilizers & agriculture equipment',
    subcategories: [
      { id: 'sub_seeds', name: 'Seeds & Hybrids', telugu: 'విత్తనాలు & హైబ్రిడ్ సీడ్స్', slug: 'seeds-hybrids' },
      { id: 'sub_fertilizers', name: 'Fertilizers & Manure', telugu: 'ఎరువులు & ఆర్గానిక్ ఎరువులు', slug: 'fertilizers-manure' },
      { id: 'sub_pesticides', name: 'Pesticides & Crop Protection', telugu: 'పురుగుమందులు', slug: 'pesticides-crop-protection' },
      { id: 'sub_drip_irrigation', name: 'Drip Irrigation & Pipes', telugu: 'డ్రిప్ ఇరిగేషన్ & పైపులు', slug: 'drip-irrigation' },
      { id: 'sub_tractor_service', name: 'Tractor Service & Farm Tools', telugu: 'ట్రాక్టర్ సర్వీస్ & పనిముట్లు', slug: 'tractor-service' },
    ],
  },
  {
    id: 'cat-furniture',
    name: 'Furniture & Home',
    slug: 'furniture-home',
    icon: 'Armchair',
    telugu: 'ఫర్నిచర్ & డెకార్',
    description: 'Furniture showrooms, wood works, mattresses & home decor',
    subcategories: [
      { id: 'sub_wood_cots', name: 'Wooden Furniture & Cots', telugu: 'చెక్క మంచాలు & టేబుల్స్', slug: 'wooden-cots-furniture' },
      { id: 'sub_sofas', name: 'Sofas & Living Room Sets', telugu: 'సోఫాలు & కుర్చీలు', slug: 'sofas-living-room' },
      { id: 'sub_mattresses', name: 'Mattresses & Pillows', telugu: 'పరుపులు & పిల్లోస్', slug: 'mattresses-pillows' },
      { id: 'sub_almirahs', name: 'Steel Almirahs & Wardrobes', telugu: 'స్టీల్ బీరువాలు & అల్మారాలు', slug: 'steel-almirahs' },
      { id: 'sub_office_furniture', name: 'Office Furniture', telugu: 'ఆఫీస్ ఫర్నిచర్', slug: 'office-furniture' },
    ],
  },
  {
    id: 'cat-interior',
    name: 'Interior & Paints',
    slug: 'interior-decor',
    icon: 'Paintbrush',
    telugu: 'ఇంటీరియర్ & పెయింట్స్',
    description: 'Paints, false ceiling, glass, ACP & interior design',
    subcategories: [
      { id: 'sub_paints', name: 'Paints & Wall Finishes', telugu: 'పెయింట్స్ & వాల్ పుట్టీ', slug: 'paints-wall-finishes' },
      { id: 'sub_false_ceiling', name: 'False Ceiling & POP Designs', telugu: 'ఫాల్స్ సీలింగ్ & పీవోపీ', slug: 'false-ceiling-pop' },
      { id: 'sub_modular_kitchen', name: 'Modular Kitchens & Cupboards', telugu: 'మాడ్యులర్ కిచెన్ & వుడ్ వర్క్స్', slug: 'modular-kitchen' },
      { id: 'sub_glass_upvc', name: 'Glass, ACP & UPVC Windows', telugu: 'గ్లాస్, ఏసీపీ & యూపీవీసీ', slug: 'glass-upvc-windows' },
      { id: 'sub_wallpapers', name: 'Wallpapers & Curtains', telugu: 'వాల్‌పేపర్స్ & కర్టెన్లు', slug: 'wallpapers-curtains' },
    ],
  },
  {
    id: 'cat-retail',
    name: 'Retail Shopping',
    slug: 'retail-shopping',
    icon: 'ShoppingBag',
    telugu: 'షాపింగ్ & దుస్తులు',
    description: 'Supermarkets, cloth stores, readymade garments, footwear',
    subcategories: [
      { id: 'sub_supermarket', name: 'Supermarkets & Groceries', telugu: 'సూపర్ మార్కెట్లు & కిరాణా', slug: 'supermarkets-groceries' },
      { id: 'sub_clothing', name: 'Ready-Made Garments & Sarees', telugu: 'రెడీమేడ్ దుస్తులు & చీరలు', slug: 'garments-clothing' },
      { id: 'sub_footwear', name: 'Footwear & Shoes', telugu: 'చెప్పులు & షూ షోరూమ్స్', slug: 'footwear-shoes' },
      { id: 'sub_jewelry', name: 'Gold Jewelry & Silver', telugu: 'బంగారు నగల దుకాణాలు', slug: 'jewelry-gold' },
      { id: 'sub_fancy', name: 'Fancy & Gift Articles', telugu: 'ఫ్యాన్సీ & గిఫ్ట్ ఆర్టికల్స్', slug: 'fancy-gift-articles' },
    ],
  },
  {
    id: 'cat-realestate',
    name: 'Real Estate & Lands',
    slug: 'real-estate',
    icon: 'Home',
    telugu: 'రియల్ ఎస్టేట్ & ప్లాట్లు',
    description: 'Open plots, farmland, commercial properties & houses',
    subcategories: [
      { id: 'sub_open_plots', name: 'DTCP & HMDA Open Plots', telugu: 'డీటీసీపీ & హెచ్ఎండీఏ ప్లాట్లు', slug: 'open-plots' },
      { id: 'sub_farmland', name: 'Farmland & Agri Lands', telugu: 'వ్యవసాయ భూములు & ఫామ్‌ల్యాండ్స్', slug: 'farmland-agri-land' },
      { id: 'sub_villas_houses', name: 'Independent Houses & Villas', telugu: 'ఇండిపెండెంట్ ఇళ్ళు & విల్లాలు', slug: 'villas-houses' },
      { id: 'sub_commercial_re', name: 'Commercial Land & Shops', telugu: 'కమర్షియల్ స్థలాలు & దుకాణాలు', slug: 'commercial-properties' },
      { id: 'sub_rental', name: 'Rental Houses & Commercial', telugu: 'అద్దె ఇళ్ళు & దుకాణాలు', slug: 'rental-properties' },
    ],
  },
  {
    id: 'cat-education',
    name: 'Education & Coaching',
    slug: 'education',
    icon: 'GraduationCap',
    telugu: 'విద్య & కోచింగ్',
    description: 'Schools, colleges, coaching centers & tuition classes',
    subcategories: [
      { id: 'sub_schools', name: 'Schools & High Schools', telugu: 'పాఠశాలలు & హైస్కూల్స్', slug: 'schools-education' },
      { id: 'sub_colleges', name: 'Junior & Degree Colleges', telugu: 'జూనియర్ & డిగ్రీ కళాశాలలు', slug: 'colleges' },
      { id: 'sub_coaching', name: 'Competitive Coaching Centers', telugu: 'పోటీ పరీక్షల కోచింగ్', slug: 'coaching-centers' },
      { id: 'sub_computer_inst', name: 'Computer Training Institutes', telugu: 'కంప్యూటర్ కోర్సులు & టైపింగ్', slug: 'computer-institutes' },
      { id: 'sub_tuitions', name: 'Tuition Centers', telugu: 'ట్యూషన్ క్లాసులు', slug: 'tuition-centers' },
    ],
  },
  {
    id: 'cat-electronics',
    name: 'Electronics & Mobiles',
    slug: 'electronics',
    icon: 'Smartphone',
    telugu: 'మొబైల్స్ & ఎలక్ట్రానిక్స్',
    description: 'Smartphones, repairs, computers & home appliances',
    subcategories: [
      { id: 'sub_smartphones', name: 'Smartphones & Mobile Sales', telugu: 'స్మార్ట్‌ఫోన్లు & మొబైల్ సేల్స్', slug: 'smartphones-mobile-sales' },
      { id: 'sub_mobile_repair', name: 'Mobile Repair & Display Service', telugu: 'మొబైల్ రిపేరింగ్ & సర్వీసింగ్', slug: 'mobile-repair' },
      { id: 'sub_mobile_acc', name: 'Mobile Accessories & Covers', telugu: 'మొబైల్ యాక్సెసరీస్ & చార్జర్లు', slug: 'mobile-accessories' },
      { id: 'sub_home_appliances', name: 'Home Appliances (TV, Fridge, AC)', telugu: 'టీవీ, ఫ్రిజ్, వాషింగ్ మెషీన్స్', slug: 'home-appliances' },
      { id: 'sub_computers', name: 'Computers, Laptops & Printers', telugu: 'కంప్యూటర్లు & ల్యాప్‌టాప్‌లు', slug: 'computers-laptops' },
    ],
  },
  {
    id: 'cat-transport',
    name: 'Transport & Logistics',
    slug: 'transport',
    icon: 'Truck',
    telugu: 'రవాణా & ట్రాన్స్‌పోర్ట్',
    description: 'Auto, goods transport, tempo, cabs & parcel service',
    subcategories: [
      { id: 'sub_auto_stand', name: 'Auto Rickshaw Stands', telugu: 'ఆటో రిక్షా స్టాండ్లు', slug: 'auto-rickshaw-stands' },
      { id: 'sub_taxi_cabs', name: 'Taxi & Car Rentals', telugu: 'కార్ / ట్యాక్సీ రెంటల్స్', slug: 'taxi-car-rentals' },
      { id: 'sub_goods_transport', name: 'Goods Vehicles & DCM Trucks', telugu: 'గూడ్స్ వెహికల్స్ & డీసీఎం', slug: 'goods-transport' },
      { id: 'sub_packers', name: 'Packers & Movers', telugu: 'ప్యాకర్స్ & మూవర్స్', slug: 'packers-movers' },
      { id: 'sub_travel_agency', name: 'Travels & Bus Ticket Booking', telugu: 'ట్రావెల్స్ & బస్సు టికెట్లు', slug: 'travels-bus-booking' },
    ],
  },
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
  { label: 'Building Construction', url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=80' },
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

export const CHOUTUPPAL_OFFICIAL_LINKS = {
  website: 'https://choutuppal.in',
  whatsappChannel: 'https://whatsapp.com/channel/0029VbD28mkGpLHOk8wrLE1a',
  youtube: 'https://www.youtube.com/@choutuppalapp',
  instagram: 'https://www.instagram.com/choutuppalapp/',
  facebook: 'https://www.facebook.com/Choutuppalapp/',
  vcardDownload: 'https://images.choutuppal.in/downloads/choutuppal.vcf',
}

export const CHOUTUPPAL_WARD_GROUPS: Record<string, string> = {
  '1': 'https://chat.whatsapp.com/HStUDfXHVbMKb19O2aByDV',
  '2': 'https://chat.whatsapp.com/IKg0EbjUhVZHQJfUnzft4X',
  '3': 'https://chat.whatsapp.com/EwJbyPpQ45CLAGuER7NFt0',
  '4': 'https://chat.whatsapp.com/DWk9proIu0gAsAYWXBlge2',
  '5': 'https://chat.whatsapp.com/B89rm8X9Ssf6iaQfh95olE',
  '6': 'https://chat.whatsapp.com/Ee2iCLCLgIaDsMXvUIEcX0',
  '7': 'https://chat.whatsapp.com/Jym0qtMpqYnEnIDCbNcI7l',
  '8': 'https://chat.whatsapp.com/CKItQRgkMphBsmnBCnkf4o',
  '9': 'https://chat.whatsapp.com/Dc8kCytmxrCCcRf3VRn2BT',
  '10': 'https://chat.whatsapp.com/BtEoPXyiQVpEA9paYrlyKo',
  '11': 'https://chat.whatsapp.com/DNNQHuXTIjq3TMZkM4v3ul',
  '12': 'https://chat.whatsapp.com/IuWiQXMkQb31RUBgUmOpzv',
  '13': 'https://chat.whatsapp.com/CUxPwsq7DzR7Wy9znsIwRA',
  '14': 'https://chat.whatsapp.com/I8Wd8TWV0ZU5xoENmOboBC',
  '15': 'https://chat.whatsapp.com/FY58lONugbMG2z9q1NLCQB',
  '16': 'https://chat.whatsapp.com/ItNWfjiv52z2oAOaVP1RnH',
  '17': 'https://chat.whatsapp.com/BcYLy2lIFacChbv6CUmRNG',
  '18': 'https://chat.whatsapp.com/GtiBFgWay6b2xzbMrL2x7b',
  '19': 'https://chat.whatsapp.com/Fmh4a8g7UhuCh9TNtKpD0p',
  '20': 'https://chat.whatsapp.com/Ga7M0wmhLGY0iywNHABcbL',
  'others': 'https://chat.whatsapp.com/H2Qq1k4dDNgK9xKbHpbE7G',
}

export function getCommunityGroupWhatsAppUrl(wardNumber: number | string): string {
  const key = String(wardNumber)
  if (CHOUTUPPAL_WARD_GROUPS[key]) {
    return CHOUTUPPAL_WARD_GROUPS[key]
  }
  return CHOUTUPPAL_WARD_GROUPS['others'] || getWhatsAppUrl(`Hi Choutuppal, please add me to Ward ${wardNumber} Community WhatsApp Group`)
}

export const CHOUTUPPAL_MANDAL_VILLAGES = [
  'Choutuppal Town',
  'Panthangi',
  'Malkapur',
  'Peddakondur',
  'Chinna Kondur',
  'Lingoji Guda',
  'Koyalagudem',
  'Gundrampally',
  'Nelapatla',
  'Swamulavari Lingotam',
  'Lakkaram',
  'Peepalpahad',
  'Thallasingaram',
  'Tangedapally',
]

export const GOVT_CONTACT_CATEGORIES: GovtContactCategoryMeta[] = [
  {
    id: 'emergency_helpline',
    name: 'Emergency Helplines',
    telugu: 'అత్యవసర హెల్ప్‌లైన్లు',
    icon: 'AlertTriangle',
    description: 'National and state emergency response numbers (112, 108, etc.)',
    displayOrder: 1,
  },
  {
    id: 'police',
    name: 'Police & Public Safety',
    telugu: 'పోలీస్ & ప్రజా రక్షణ',
    icon: 'Shield',
    description: 'Police station, patrol and women safety helplines',
    displayOrder: 2,
  },
  {
    id: 'fire_rescue',
    name: 'Fire & Rescue Services',
    telugu: 'ఫైర్ & రెస్క్యూ సేవలు',
    icon: 'Flame',
    description: 'Fire control room and disaster rescue teams',
    displayOrder: 3,
  },
  {
    id: 'ambulance_health',
    name: 'Ambulance & Public Health',
    telugu: 'అంబులెన్స్ & ప్రజా వైద్యం',
    icon: 'HeartPulse',
    description: 'Primary health centers, government hospitals and ambulances',
    displayOrder: 4,
  },
  {
    id: 'electricity_utilities',
    name: 'Electricity & Utility Complaints',
    telugu: 'విద్యుత్ & యుటిలిటీస్ ఫిర్యాదులు',
    icon: 'Zap',
    description: 'TSSPDCL electricity complaints, water supply and municipal utilities',
    displayOrder: 5,
  },
  {
    id: 'municipal_panchayat',
    name: 'Municipal / Panchayat Offices',
    telugu: 'పురపాలక / పంచాయతీ కార్యాలయాలు',
    icon: 'Building2',
    description: 'Choutuppal Municipality and Gram Panchayat offices',
    displayOrder: 6,
  },
  {
    id: 'revenue_tahsildar',
    name: 'Revenue & Tahsildar Offices',
    telugu: 'రెవెన్యూ & తహశీల్దార్ కార్యాలయం',
    icon: 'Landmark',
    description: 'MRO office, VROs and land administration services',
    displayOrder: 7,
  },
  {
    id: 'mandal_offices',
    name: 'Mandal-Level Government Offices',
    telugu: 'మండల స్థాయి ప్రభుత్వ కార్యాలయాలు',
    icon: 'Briefcase',
    description: 'MPDO, Agriculture, Veterinary, Child Welfare and Education offices',
    displayOrder: 8,
  },
  {
    id: 'elected_representatives',
    name: 'Elected Representatives',
    telugu: 'ప్రజాప్రతినిధులు',
    icon: 'Users',
    description: 'MLA, MP, Municipal Chairman and Mandal Praja Parishad representatives',
    displayOrder: 9,
  },
  {
    id: 'ward_representatives',
    name: 'Ward Representatives (Councilors)',
    telugu: 'వార్డు ప్రజాప్రతినిధులు (కౌన్సిలర్లు)',
    icon: 'UserCheck',
    description: 'Municipal ward councilors and local representatives',
    displayOrder: 10,
  },
  {
    id: 'village_public_offices',
    name: 'Village-Level Public Offices',
    telugu: 'గ్రామ పంచాయతీ కార్యాలయాలు',
    icon: 'Home',
    description: 'Gram Panchayat secretaries and village community centers',
    displayOrder: 11,
  },
  {
    id: 'other_public_services',
    name: 'Other Verified Public Services',
    telugu: 'ఇతర ప్రభుత్వ సేవలు',
    icon: 'FileText',
    description: 'Postal services, RTC bus stations, MeeSeva and public utilities',
    displayOrder: 12,
  },
]

