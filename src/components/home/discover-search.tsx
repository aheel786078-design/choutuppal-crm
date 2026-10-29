'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SocialLinks } from '@/components/shared/social-links'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Village, Category } from '@/lib/types'

interface DiscoverSearchProps {
  villages: Pick<Village, 'id' | 'name' | 'slug'>[]
  categories: Pick<Category, 'id' | 'name' | 'slug'>[]
}

export function DiscoverSearch({ villages, categories }: DiscoverSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [village, setVillage] = useState('all')
  const [category, setCategory] = useState('all')

  function handleSearch() {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (village !== 'all') params.set('village', village)
    if (category !== 'all') params.set('category', category)
    const queryString = params.toString()
    router.push(queryString ? `/listings?${queryString}` : '/listings')
  }

  return (
    <section className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/30 bg-white/20 p-4 backdrop-blur-lg md:flex-row">
        {/* Search input */}
        <div className="relative w-full flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search shops, services, properties…"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white/90 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Village filter */}
        <Select value={village} onValueChange={setVillage}>
          <SelectTrigger className="h-11 w-full bg-white/90 md:w-[160px]">
            <MapPin className="mr-1 h-3.5 w-3.5 text-blue-500" />
            <SelectValue placeholder="Village" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Villages</SelectItem>
            {villages.map((v) => (
              <SelectItem key={v.id} value={v.slug}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category filter */}
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-11 w-full bg-white/90 md:w-[160px]">
            <Tag className="mr-1 h-3.5 w-3.5 text-amber-500" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search button */}
        <Button onClick={handleSearch} className="h-11 w-full gap-2 gradient-brand text-white md:w-auto shrink-0 shadow-md">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>

      {/* Social links — desktop inline, mobile below */}
      <div className="mt-3 hidden items-center gap-2 md:flex">
        <span className="text-xs font-semibold text-slate-500">Follow us:</span>
        <SocialLinks />
      </div>
      <div className="mt-3 flex gap-3 overflow-x-auto scrollbar-none md:hidden">
        <SocialLinks />
      </div>
    </section>
  )
}
