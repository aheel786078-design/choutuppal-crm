'use client'

import { useState } from 'react'
import { Gift, Sparkles, ChevronRight, X, RotateCw } from 'lucide-react'
import { SectionHeading } from './section-heading'
import { Button } from '@/components/ui/button'

const SEGMENTS = [
  { label: '₹50', color: '#1d4ed8' },
  { label: '10% Off', color: '#f59e0b' },
  { label: '₹100', color: '#3b82f6' },
  { label: 'Try Again', color: '#fbbf24' },
  { label: 'Free Ad', color: '#1d4ed8' },
  { label: '₹20', color: '#f59e0b' },
  { label: '5% Off', color: '#3b82f6' },
  { label: 'Spin Again', color: '#fbbf24' },
]

export function SpinWin() {
  const [isOpen, setIsOpen] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    const winner = Math.floor(Math.random() * SEGMENTS.length)
    const segAngle = 360 / SEGMENTS.length
    const target = 360 * 5 + (360 - winner * segAngle - segAngle / 2)
    setRotation((prev) => prev + target)
    window.setTimeout(() => setSpinning(false), 4200)
  }

  return (
    <>
      <section id="spin" className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 cursor-pointer" onClick={() => setIsOpen(true)}>
        <div className="block relative overflow-hidden rounded-[2rem] glass-strong hover:scale-[1.01] transition-all duration-300 shadow-xl group border border-white/50">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="grid items-center gap-6 p-6 sm:p-8 lg:grid-cols-2 relative z-10">
            <div>
              <SectionHeading
                title="Spin & Win"
              />
              <ul className="mt-4 space-y-3 text-sm font-medium text-slate-700">
                <li className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-amber-500" /> Win cashback, discounts & free ads.
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500" /> 1 free spin daily — Early Bird Offer.
                </li>
              </ul>
              <div className="mt-6 inline-flex items-center gap-2 rounded-2xl gradient-brand px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all">
                Play Now <ChevronRight className="h-4 w-4" />
              </div>
            </div>

            {/* Banner Wheel Graphic */}
            <div className="flex justify-center lg:justify-end pr-4">
              <div className="relative h-48 w-48 sm:h-56 sm:w-56 pointer-events-none transform group-hover:rotate-12 transition-transform duration-700">
                <div className="absolute inset-0 rounded-full gradient-ring p-1.5 shadow-2xl">
                  <div className="relative h-full w-full rounded-full overflow-hidden bg-white/20">
                    <svg viewBox="0 0 100 100" className="h-full w-full opacity-90">
                      {SEGMENTS.map((s, i, arr) => {
                        const segAngle = 360 / arr.length
                        const startAngle = i * segAngle - 90
                        const endAngle = startAngle + segAngle
                        const r = 50
                        const cx = 50
                        const cy = 50
                        const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180)
                        const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180)
                        const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180)
                        const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180)
                        const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`
                        return (
                          <path key={i} d={path} fill={s.color} />
                        )
                      })}
                    </svg>
                  </div>
                </div>
                <div className="absolute left-1/2 top-1/2 z-10 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-blue-700 shadow-xl">
                  <Gift className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pop-up Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl overflow-hidden flex flex-col items-center">
            
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 z-20 grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              <X size={16} />
            </button>

            <h2 className="text-2xl font-black text-slate-900 mb-1 mt-2">Spin & Win</h2>
            <p className="text-sm font-medium text-slate-500 mb-8 text-center">Test your luck for the day!</p>

            <div className="relative flex justify-center w-full mb-8">
              <div className="relative h-64 w-64">
                {/* pointer */}
                <div className="absolute left-1/2 top-[-10px] z-20 h-0 w-0 -translate-x-1/2 border-x-[16px] border-t-[24px] border-x-transparent border-t-amber-500 drop-shadow-md" />
                {/* ring */}
                <div className="absolute inset-0 rounded-full gradient-ring p-1.5 shadow-2xl">
                  <div
                    className="relative h-full w-full rounded-full overflow-hidden transition-transform duration-[4000ms] ease-out"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  >
                    <svg viewBox="0 0 100 100" className="h-full w-full">
                      {SEGMENTS.map((s, i) => {
                        const segAngle = 360 / SEGMENTS.length
                        const startAngle = i * segAngle - 90
                        const endAngle = startAngle + segAngle
                        const r = 50
                        const cx = 50
                        const cy = 50
                        const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180)
                        const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180)
                        const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180)
                        const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180)
                        const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`
                        const mid = startAngle + segAngle / 2
                        const tx = cx + (r * 0.65) * Math.cos((mid * Math.PI) / 180)
                        const ty = cy + (r * 0.65) * Math.sin((mid * Math.PI) / 180)
                        return (
                          <g key={i}>
                            <path d={path} fill={s.color} />
                            <text
                              x={tx}
                              y={ty}
                              fill="#ffffff"
                              fontSize="6"
                              fontWeight="800"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              transform={`rotate(${mid + 90} ${tx} ${ty})`}
                            >
                              {s.label}
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                  </div>
                </div>
                {/* hub */}
                <div className="absolute left-1/2 top-1/2 z-10 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-blue-700 shadow-xl border-4 border-blue-500">
                  <RotateCw className="h-6 w-6" />
                </div>
              </div>
            </div>

            <Button
              onClick={spin}
              disabled={spinning}
              className="w-full gap-2 gradient-brand text-white shadow-lg shadow-blue-500/30 text-lg py-6 rounded-2xl"
            >
              <RotateCw className={spinning ? 'h-5 w-5 animate-spin' : 'h-5 w-5'} />
              {spinning ? 'Spinning...' : 'Spin Now (Free)'}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
