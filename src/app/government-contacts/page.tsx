import Link from 'next/link'
import {
  Search,
  MapPin,
  Phone,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Building2,
  ExternalLink,
  Clock,
  CheckCircle2,
  Flame,
  Zap,
  HeartPulse,
  Landmark,
  Briefcase,
  Users,
  Home,
  FileText,
  UserCheck,
} from 'lucide-react'
import { loadStore, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import {
  filterAndSortGovtContacts,
  sanitizeGovtContactForPublic,
} from '@/lib/government-contacts'
import { GOVT_CONTACT_CATEGORIES, CHOUTUPPAL_MANDAL_VILLAGES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

interface GovtDirectoryPageProps {
  searchParams: Promise<{
    q?: string
    cat?: string
    village?: string
    emergency?: string
  }>
}

function getCategoryIcon(catId: string) {
  switch (catId) {
    case 'emergency_helpline':
      return AlertTriangle
    case 'police':
      return ShieldCheck
    case 'fire_rescue':
      return Flame
    case 'ambulance_health':
      return HeartPulse
    case 'electricity_utilities':
      return Zap
    case 'municipal_panchayat':
      return Building2
    case 'revenue_tahsildar':
      return Landmark
    case 'mandal_offices':
      return Briefcase
    case 'elected_representatives':
      return Users
    case 'ward_representatives':
      return UserCheck
    case 'village_public_offices':
      return Home
    default:
      return FileText
  }
}

export default async function GovernmentContactsPage({ searchParams }: GovtDirectoryPageProps) {
  const params = await searchParams
  const q = (params.q || '').trim()
  const cat = params.cat || ''
  const village = params.village || ''
  const emergencyOnly = params.emergency === 'true'

  const store = loadStore()
  const allContacts = store.governmentContacts || []

  // Filter for published & public contacts
  const { items: contacts, total } = filterAndSortGovtContacts(allContacts, {
    publicOnly: true,
    category: cat || undefined,
    village: village || undefined,
    search: q || undefined,
    isEmergency: emergencyOnly ? true : undefined,
    pageSize: 100,
  })

  const sanitizedContacts = contacts.map((c) => sanitizeGovtContactForPublic(c))

  // Emergency helplines (top cards)
  const emergencyHelplines = allContacts
    .filter((c) => c.status === 'published' && c.isPublicContact && c.isEmergency)
    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99))
    .map((c) => sanitizeGovtContactForPublic(c))

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* HEADER HERO */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white py-10 px-4 sm:px-6 lg:px-8 border-b border-blue-900/40">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-200 hover:text-white mb-4 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 mb-2">
                <AlertTriangle className="h-3 w-3 text-red-400" /> అధికారిక ప్రభుత్వ & అత్యవసర సేవలు
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
                ప్రభుత్వ & అత్యవసర డైరెక్టరీ
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                చౌటుప్పల్ మండలం, యాదాద్రి భువనగిరి జిల్లా — అధికారికంగా ధృవీకరించబడిన అత్యవసర హెల్ప్‌లైన్లు, ప్రభుత్వ కార్యాలయాలు మరియు ప్రజాప్రతినిధుల సంప్రదింపు వివరాలు.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 backdrop-blur-md">
              <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">100% Verified Contacts</p>
                <p className="text-[11px] text-slate-300">Official Government Sources</p>
              </div>
            </div>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <form
            method="GET"
            action="/government-contacts"
            className="mt-8 grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20 shadow-lg"
          >
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 text-slate-800 sm:col-span-2">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search official, office, emergency (e.g. Police, 112, Tahsildar)..."
                className="w-full text-xs sm:text-sm focus:outline-hidden"
              />
            </div>

            <select
              name="cat"
              defaultValue={cat || 'all'}
              className="bg-white text-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-hidden font-medium"
            >
              <option value="all">All Categories (అన్ని విభాగాలు)</option>
              {GOVT_CONTACT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <select
                name="village"
                defaultValue={village || 'all'}
                className="bg-white text-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-hidden font-medium w-full"
              >
                <option value="all">All Villages (మండలం మొత్తం)</option>
                {CHOUTUPPAL_MANDAL_VILLAGES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shrink-0 transition shadow-sm"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 space-y-10">
        {/* EMERGENCY HELPLINES CAROUSEL / GRID (ALWAYS PROMINENT) */}
        {!q && !cat && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    అత్యవసర హెల్ప్‌లైన్లు (24x7 Emergency Services)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Immediate 24-hour national &amp; state response helplines
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {emergencyHelplines.map((item) => (
                <div
                  key={item.id}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-red-50/20 to-amber-50/20 border border-red-200/80 p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white font-black text-lg shadow-sm shadow-red-500/20">
                        {item.phoneNumber}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {item.name}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-1">{item.designation}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 shrink-0 border border-emerald-300">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Verified
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{item.availability === '24x7' ? '24 Hours Available' : item.officeHours || 'Standard Hours'}</span>
                    </div>

                    {item.phoneNumber && (
                      <a
                        href={`tel:${item.phoneNumber}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-xs"
                      >
                        <Phone className="h-3.5 w-3.5" /> Call {item.phoneNumber}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* DIRECTORY RESULTS / ALL CONTACTS */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                ప్రజా అధికారులు &amp; కార్యాలయాలు (Government Offices &amp; Public Directory)
              </h2>
              <p className="text-xs text-slate-500">
                Found {total} verified government contacts matching your criteria
              </p>
            </div>

            {/* Quick category filter tags */}
            <div className="flex flex-wrap gap-1.5">
              <Link
                href="/government-contacts"
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                  !cat ? 'bg-blue-600 text-white' : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                }`}
              >
                All
              </Link>
              {GOVT_CONTACT_CATEGORIES.slice(0, 5).map((c) => (
                <Link
                  key={c.id}
                  href={`/government-contacts?cat=${c.id}`}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                    cat === c.id ? 'bg-blue-600 text-white' : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {c.name.split(' ')[0]}
                </Link>
              ))}
            </div>
          </div>

          {sanitizedContacts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-sm font-bold text-slate-800">
                No verified government contacts found
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                No official contacts match your search or filter. Try clearing filters or searching for general terms like &quot;Police&quot; or &quot;112&quot;.
              </p>
              <Link
                href="/government-contacts"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
              >
                Clear all filters
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sanitizedContacts.map((contact) => {
                const IconComponent = getCategoryIcon(contact.category)
                return (
                  <div
                    key={contact.id}
                    className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Category Badge & Status */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md">
                          <IconComponent className="h-3 w-3" />
                          {contact.categoryName}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" /> Verified
                        </span>
                      </div>

                      {/* Name & Designation */}
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {contact.name}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5 font-medium">
                        {contact.designation}
                      </p>

                      {/* Location & Details */}
                      <div className="mt-3.5 space-y-1.5 text-xs text-slate-600">
                        {(contact.village || contact.mandal) && (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span>
                              {contact.village ? `${contact.village}, ` : ''}
                              {contact.mandal} Mandal, {contact.district}
                            </span>
                          </div>
                        )}

                        {contact.officeAddress && (
                          <div className="flex items-start gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{contact.officeAddress}</span>
                          </div>
                        )}

                        {contact.officeHours && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{contact.officeHours}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      {contact.sourceUrl ? (
                        <a
                          href={contact.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 transition"
                          title="View official government source"
                        >
                          <ExternalLink className="h-3 w-3" /> Official Source
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400">Govt Verified</span>
                      )}

                      {contact.phoneNumber ? (
                        <a
                          href={`tel:${contact.phoneNumber}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span>Call {contact.phoneNumber}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No public phone</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* CITIZEN PRIVACY & VERIFICATION NOTICE */}
        <div className="rounded-2xl bg-blue-50/70 border border-blue-200/70 p-4 sm:p-5 text-xs text-slate-700 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-slate-900">
              ప్రజా సమాచార పారదర్శకత మరియు ధృవీకరణ విధానం (Public Directory Policy)
            </p>
            <p className="text-slate-600 leading-relaxed">
              ఈ డైరెక్టరీలో ప్రచురించబడిన సంప్రదింపు వివరాలు కేవలం అధికారిక ప్రభుత్వ పోర్టల్స్, గెజిట్ ఉత్తర్వులు మరియు ధృవీకరించబడిన ప్రజా సమాచారం ఆధారంగా మాత్రమే ప్రదర్శించబడుతున్నాయి. వ్యక్తిగత గోప్యతను గౌరవిస్తూ, కేవలం ప్రజా సేవ కోసం నిర్దేశించిన అధికారిక నంబర్లను మాత్రమే ఇక్కడ పొందుపరచడమైనది. ఏదైనా సమాచారంలో మార్పులు ఉంటే అడ్మిన్ ప్యానెల్ ద్వారా తెలియజేయగలరు.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
