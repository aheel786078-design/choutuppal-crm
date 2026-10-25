import { Globe, MessageCircle, Youtube, Instagram, Facebook } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SectionHeading } from './section-heading'

export function CommunityHub() {
  const waNumber = '919494348175'

  return (
    <section className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 mt-12">
      <SectionHeading
        title="Join Our Network"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {/* Franchise Card */}
        <div className="relative flex flex-col overflow-hidden rounded-3xl p-6 glass hover-lift transition-all duration-300">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl text-white shadow-md bg-gradient-to-br from-blue-600 to-indigo-600">
            <Globe className="h-6 w-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 font-telugu">
            మీ ఊరికి ఈ యాప్ కావాలా?
          </h3>
          <p className="mt-2 flex-1 text-sm font-medium text-slate-500 font-telugu">
            మీరు ఉండే ఊరిలో చౌటుప్పల్ యాప్ లాంటి యాప్ మొదలుపెట్టండి.
          </p>
          <Button asChild className="mt-5 w-full gap-1.5 font-bold text-xs shadow-md gradient-brand text-white hover:opacity-90 border-0">
            <a
              href={`https://wa.me/${waNumber}?text=${encodeURIComponent('Hello! I want to get info about starting a City Franchise.')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4 text-[#25D366]" /> Get Info
            </a>
          </Button>
        </div>

        {/* Social Cards (combined or 3 separate? Let's just make it a single uniform card with multiple links to match grid) */}
        <div className="relative flex flex-col overflow-hidden rounded-3xl p-6 glass hover-lift transition-all duration-300">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl text-white shadow-md bg-gradient-to-br from-blue-600 to-indigo-600">
            <MessageCircle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">Follow Us Online</h3>
          <p className="mt-2 mb-4 text-sm font-medium text-slate-500">
            Stay updated with our latest news and announcements across platforms.
          </p>
          
          <div className="flex flex-col gap-2 flex-1 justify-end">
            <a href="https://chat.whatsapp.com/ItRGBPJJQSZF6x40IozSJe" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl bg-white/50 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-white transition shadow-sm border border-slate-100">
              <MessageCircle size={16} className="text-[#25D366]" /> WhatsApp Group
            </a>
            <a href="https://youtube.com/@choutuppalapp" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl bg-white/50 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-white transition shadow-sm border border-slate-100">
              <Youtube size={16} className="text-[#FF0000]" /> YouTube
            </a>
            <a href="https://instagram.com/choutuppalapp" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl bg-white/50 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-white transition shadow-sm border border-slate-100">
              <Instagram size={16} className="text-[#E1306C]" /> Instagram
            </a>
            <a href="https://facebook.com/choutuppalapp" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl bg-white/50 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-white transition shadow-sm border border-slate-100">
              <Facebook size={16} className="text-[#1877F2]" /> Facebook
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
