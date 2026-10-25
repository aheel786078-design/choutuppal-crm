'use client'

import { MessageCircle, Youtube, Instagram, Facebook } from 'lucide-react'

export function StickySocials() {
  const message = encodeURIComponent('Hi Choutuppal App team!')
  return (
    <div className="fixed bottom-1/3 left-4 z-50 hidden flex-col gap-3 md:flex">
      <a
        href={`https://wa.me/919494348175?text=${message}`}
        target="_blank"
        rel="noreferrer"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-110"
      >
        <MessageCircle size={20} />
      </a>
      <a
        href="https://youtube.com/@choutuppalapp"
        target="_blank"
        rel="noreferrer"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF0000] text-white shadow-lg transition hover:scale-110"
      >
        <Youtube size={20} />
      </a>
      <a
        href="https://instagram.com/choutuppalapp"
        target="_blank"
        rel="noreferrer"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white shadow-lg transition hover:scale-110"
      >
        <Instagram size={20} />
      </a>
      <a
        href="https://facebook.com/choutuppalapp"
        target="_blank"
        rel="noreferrer"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-lg transition hover:scale-110"
      >
        <Facebook size={20} />
      </a>
    </div>
  )
}
