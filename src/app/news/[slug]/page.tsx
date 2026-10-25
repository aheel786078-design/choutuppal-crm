import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Calendar, Share2, Eye } from 'lucide-react'
import { loadStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

interface NewsPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function NewsDetailPage({ params }: NewsPageProps) {
  const { slug } = await params
  const store = loadStore()

  const article = (store.news || []).find((n) => n.slug === slug || n.id === slug)

  if (!article) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <div className="bg-slate-900 border-b border-slate-800 py-3 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl flex items-center justify-between text-xs">
          <Link
            href="/news"
            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold transition"
          >
            <ArrowLeft className="h-4 w-4" /> All News
          </Link>
          <span className="text-slate-400">{article.category}</span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mt-6">
        <article className="bg-white rounded-3xl overflow-hidden shadow-xs border border-slate-200 p-6 sm:p-10">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
            <span className="bg-blue-600 text-white font-bold px-2.5 py-0.5 rounded text-[11px]">
              {article.category}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(article.createdAt).toLocaleDateString()}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-snug">
            {article.title}
          </h1>

          {article.teluguTitle ? (
            <h2 className="font-telugu text-base text-slate-600 font-bold mt-2">
              {article.teluguTitle}
            </h2>
          ) : null}

          <div className="relative h-64 sm:h-96 w-full rounded-2xl overflow-hidden my-6 bg-slate-100">
            <Image src={article.coverImage} alt={article.title} fill className="object-cover" />
          </div>

          <div className="prose prose-slate max-w-none text-sm sm:text-base leading-relaxed text-slate-700 whitespace-pre-line">
            {article.content || article.summary}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Read this news: "${article.title}" on https://choutuppal.in/news/${article.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-xs"
            >
              <Share2 className="h-4 w-4" />
              Share on WhatsApp
            </a>

            <Link
              href="/news"
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              ← Back to Headlines
            </Link>
          </div>
        </article>
      </div>
    </div>
  )
}
