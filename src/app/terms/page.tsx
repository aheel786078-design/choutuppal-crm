import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
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
          <h1 className="text-2xl sm:text-3xl font-black">Terms of Service (నిబంధనలు)</h1>
          <p className="mt-1 text-xs text-slate-300">Effective: October 2026</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-black text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By accessing Choutuppal.in, our Admin Panel (/admin), or CRM Automation Engine (/crm), you agree to comply with all applicable local laws and regulations governing business directories and advertising.
          </p>

          <h2 className="text-base font-black text-slate-900 pt-2">2. Business Listings &amp; Accuracy</h2>
          <p>
            Merchants and service providers are solely responsible for ensuring that pricing, location, contact numbers, and service availability are accurate and up to date. Misleading or fraudulent listings will be removed immediately.
          </p>

          <h2 className="text-base font-black text-slate-900 pt-2">3. Direct Transactions</h2>
          <p>
            Choutuppal.in operates as an open discovery platform and WhatsApp CRM bridge. We do not participate in financial transactions or take commission between customers and service providers (e.g. taxi drivers, plumbers, electricians).
          </p>
        </div>
      </div>
    </div>
  )
}
