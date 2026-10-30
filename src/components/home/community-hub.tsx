import { Globe, MessageCircle, Youtube, Instagram, Facebook, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionHeading } from './section-heading'

export function CommunityHub() {
  const waNumber = '919494348175'

  return (
    <section className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 mt-12">
      <SectionHeading
        title="DigiCubes Franchise Network"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {/* Franchise Card */}
        <div className="relative flex flex-col overflow-hidden rounded-3xl p-6 glass hover-lift transition-all duration-300 border border-blue-100 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-md bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-600">
              <Globe className="h-6 w-6" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-bold border border-emerald-200">
              <Sparkles className="h-3 w-3 text-emerald-500" /> Powered by DigiCubes.in
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-black text-slate-900 font-telugu">
            మీ పట్టణానికి ఇలాంటి సూపర్ యాప్ &amp; వాట్సాప్ CRM కావాలా?
          </h3>
          <p className="mt-2 text-sm font-medium text-slate-600 font-telugu leading-relaxed">
            DigiCubes వైట్‌లేబుల్ నెట్‌వర్క్‌లో ఫ్రాంచైజీగా చేరండి. చౌటుప్పల్ యాప్ తరహాలోనే భువనగిరి, సూర్యాపేట, రామన్నపేట తదితర పట్టణాలలో మీ స్వంత బ్రాండెడ్ పోర్టల్, లోకల్ అడ్మిన్ ప్యానెల్ &amp; వాట్సాప్ AI CRM ను 24 గంటల్లో ప్రారంభించండి.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-blue-700">✓ Dedicated Website</span>
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700">✓ Local Admin Panel</span>
            <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-purple-700">✓ WhatsApp Flow CRM</span>
          </div>

          <Button asChild className="mt-5 w-full gap-2 font-bold text-xs shadow-md gradient-brand text-white hover:opacity-95 border-0 py-5">
            <a
              href={`https://wa.me/${waNumber}?text=${encodeURIComponent('హలో DigiCubes! నేను నా ఊరిలో చౌటుప్పల్ యాప్ తరహా సూపర్ యాప్ & వాట్సాప్ CRM ఫ్రాంచైజీ ప్రారంభించాలనుకుంటున్నాను.')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4 text-[#25D366]" /> DigiCubes ఫ్రాంచైజీ వివరాలు పొందండి
            </a>
          </Button>
        </div>

        {/* Social Cards */}
        <div className="relative flex flex-col overflow-hidden rounded-3xl p-6 glass hover-lift transition-all duration-300">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl text-white shadow-md bg-gradient-to-br from-blue-600 to-indigo-600">
            <MessageCircle className="h-6 w-6" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900">Follow Us Online</h3>
          <p className="mt-2 mb-4 text-sm font-medium text-slate-500">
            Stay updated with our latest news, exclusive merchant deals, and announcements across platforms.
          </p>
          
          <div className="flex flex-col gap-2 flex-1 justify-end">
            <a href="https://chat.whatsapp.com/ItRGBPJJQSZF6x40IozSJe" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl bg-white/50 px-3.5 py-2.5 text-sm font-bold text-slate-700 hover:bg-white transition shadow-sm border border-slate-100">
              <MessageCircle size={16} className="text-[#25D366]" /> WhatsApp Community Group
            </a>
            <a href="https://youtube.com/@choutuppalapp" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl bg-white/50 px-3.5 py-2.5 text-sm font-bold text-slate-700 hover:bg-white transition shadow-sm border border-slate-100">
              <Youtube size={16} className="text-[#FF0000]" /> Official YouTube Channel
            </a>
            <a href="https://instagram.com/choutuppalapp" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl bg-white/50 px-3.5 py-2.5 text-sm font-bold text-slate-700 hover:bg-white transition shadow-sm border border-slate-100">
              <Instagram size={16} className="text-[#E1306C]" /> Instagram (@choutuppalapp)
            </a>
            <a href="https://facebook.com/choutuppalapp" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl bg-white/50 px-3.5 py-2.5 text-sm font-bold text-slate-700 hover:bg-white transition shadow-sm border border-slate-100">
              <Facebook size={16} className="text-[#1877F2]" /> Facebook Page
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
