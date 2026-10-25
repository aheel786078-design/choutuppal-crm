import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black">Privacy Policy (గోప్యతా విధానం)</h1>
          <p className="mt-1 text-xs text-slate-300">Last updated: October 2026</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-black text-slate-900">1. Information We Collect</h2>
          <p>
            When you register a business, post real estate properties, or contact merchants via WhatsApp on Choutuppal.in, we collect details such as your phone number, business name, address, and listing media.
          </p>

          <h2 className="text-base font-black text-slate-900 pt-2">2. How We Use Information</h2>
          <p>
            Information provided is used exclusively to display public merchant directories, enable direct consumer-to-business WhatsApp conversations, and deliver automated CRM updates requested by you.
          </p>

          <h2 className="text-base font-black text-slate-900 pt-2">3. Media &amp; Cloudflare R2 Storage</h2>
          <p>
            Images and photos uploaded for business profiles and stories are stored securely on Cloudflare R2 distributed object storage. We do not sell or monetize personal customer details.
          </p>

          <h2 className="text-base font-black text-slate-900 pt-2">4. Contacting Us</h2>
          <p>
            If you wish to remove your business listing or update contact details, message our WhatsApp support desk at +91 94943 48175 or email privacy@choutuppal.in.
          </p>
        </div>
      </div>
    </div>
  )
}
