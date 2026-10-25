import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function CookiesPage() {
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
          <h1 className="text-2xl sm:text-3xl font-black">Cookie Policy</h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-black text-slate-900">Cookie Usage</h2>
          <p>
            Choutuppal.in uses essential session cookies for authentication, preferences, and performance optimizations. We do not use intrusive tracking cookies.
          </p>
        </div>
      </div>
    </div>
  )
}
