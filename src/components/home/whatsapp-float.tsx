'use client'

import { usePathname } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { TenantConfig, DEFAULT_TENANT } from '@/lib/tenant-types'

interface WhatsAppFloatProps {
  tenant?: TenantConfig
}

export function WhatsAppFloat({ tenant = DEFAULT_TENANT }: WhatsAppFloatProps) {
  const pathname = usePathname()

  if (pathname.startsWith('/admin') || pathname.startsWith('/crm') || pathname.startsWith('/franchise') || isFranchiseSubdomain) return null

  const phone = '9494348175'
  const messageText = encodeURIComponent('నమస్కారం, చౌటుప్పల్ యాప్ గురించి సమాచారం కావాలి.')
  const whatsappLink = `https://wa.me/91${phone}?text=${messageText}`

  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp us"
      className="fixed bottom-20 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-green-500 text-white shadow-lg transition-all hover:scale-110 md:bottom-4"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  )
}
