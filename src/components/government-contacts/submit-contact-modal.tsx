'use client'

import { useState } from 'react'
import {
  UserPlus,
  X,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Phone,
  Send,
  Loader2,
  FileEdit,
} from 'lucide-react'

interface SubmitModalProps {
  categories: Array<{ id: string; name: string }>
  villages: string[]
}

export function SubmitContactModal({ categories, villages }: SubmitModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    category: 'village_public_offices',
    phoneNumber: '',
    village: 'Choutuppal',
    officeAddress: '',
    requestType: 'new_contact',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await fetch('/api/government-contacts/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSuccessMsg(data.message)
        setFormData({
          name: '',
          designation: '',
          category: 'village_public_offices',
          phoneNumber: '',
          village: 'Choutuppal',
          officeAddress: '',
          requestType: 'new_contact',
          notes: '',
        })
      } else {
        setErrorMsg(data.error || 'సమర్పించడంలో లోపం ఏర్పడింది. దయచేసి మళ్ళీ ప్రయత్నించండి.')
      }
    } catch {
      setErrorMsg('నెట్‌వర్క్ సమస్య ఏర్పడింది. దయచేసి మళ్ళీ ప్రయత్నించండి.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true)
          setSuccessMsg(null)
          setErrorMsg(null)
        }}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 transition shadow-md active:scale-95"
      >
        <UserPlus className="h-4 w-4 shrink-0" />
        <span>అధికారులు / లీడర్లు వివరాలు చేర్చండి</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ప్రభుత్వ అధికారులు &amp; ప్రజాప్రతినిధుల వివరాల నమోదు
                </h3>
                <p className="text-xs text-slate-500">
                  కొత్త కాంటాక్ట్ వివరాలు చేర్చడానికి లేదా నంబర్ మార్పును తెలపడానికి
                </p>
              </div>
            </div>

            {successMsg ? (
              <div className="my-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 mb-2" />
                <h4 className="text-sm font-bold text-emerald-900">సమర్పణ పూర్తయింది!</h4>
                <p className="text-xs text-emerald-700 mt-1 leading-relaxed">{successMsg}</p>
                <button
                  onClick={() => setIsOpen(false)}
                  className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition"
                >
                  పూర్తయింది (Close)
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs text-slate-700">
                {errorMsg && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-red-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Request Type */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    రిక్వెస్ట్ రకం (Request Type):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, requestType: 'new_contact' })}
                      className={`p-2.5 rounded-xl border text-center font-bold transition flex items-center justify-center gap-1.5 ${
                        formData.requestType === 'new_contact'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <UserPlus className="h-3.5 w-3.5" /> కొత్త కాంటాక్ట్
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, requestType: 'update_existing' })}
                      className={`p-2.5 rounded-xl border text-center font-bold transition flex items-center justify-center gap-1.5 ${
                        formData.requestType === 'update_existing'
                          ? 'bg-amber-50 border-amber-500 text-amber-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <FileEdit className="h-3.5 w-3.5" /> నంబర్ సవరణ / అప్‌డేట్
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    అధికారి / నాయకుడి పేరు (Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ఉదా: కె. యాదగిరి లేదా సర్పంచ్ పేరు"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                {/* Designation & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      హోదా (Designation) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      placeholder="ఉదా: సబ్-ఇన్‌స్పెక్టర్ / సర్పంచ్ / AE"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      విభాగం (Category) *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500 bg-white"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    అధికారిక మొబైల్ నంబర్ (Phone Number) *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="ఉదా: 9492359110 లేదా 08694-272233"
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Village / Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      గ్రామం / వార్డు (Village / Ward)
                    </label>
                    <select
                      value={formData.village}
                      onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500 bg-white"
                    >
                      {villages.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      కార్యాలయ చిరునామా (Office Address)
                    </label>
                    <input
                      type="text"
                      value={formData.officeAddress}
                      onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })}
                      placeholder="ఉదా: తహశీల్దార్ ఆఫీస్ కాంప్లెక్స్"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Verification Notes */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    అదనపు గమనికలు / వివరాలు (Verification Notes)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="సమర్పకుడి వివరాలు లేదా మార్పుకు గల కారణం..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                {/* Anti-misuse disclaimer */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-[11px] text-slate-500 leading-relaxed">
                  ⚠️ <strong>గమనిక:</strong> సమర్పించిన వివరాలను మా అడ్మిన్ టీమ్ అధికారికంగా ధృవీకరించిన తర్వాత మాత్రమే పబ్లిక్ డైరెక్టరీలో ప్రచురించడం జరుగుతుంది. తప్పుడు లేదా అనధికారిక వివరాలు ఇవ్వడం నిషేధం.
                </div>

                {/* Submit button */}
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                  >
                    రద్దు (Cancel)
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition shadow-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>పంపుతోంది...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>సమర్పించండి (Submit)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
