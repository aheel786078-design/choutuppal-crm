import Image from 'next/image'
import Link from 'next/link'
import { Newspaper, Calendar, Eye, ArrowLeft, ArrowRight, Share2 } from 'lucide-react'
import { loadStore } from '@/lib/store'
import { sanitizeImageUrl } from '@/lib/home-data'

export const dynamic = 'force-dynamic'

export default async function NewsPage() {
  const store = loadStore()
  const newsList = (store.news || []).filter((n) => n.isPublished !== false)

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded">
              Local Bulletin
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black mt-2">
            చౌటుప్పల్ తాజా వార్తలు (News &amp; Updates)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-2xl">
            Latest road expansions, municipal tenders, electricity schedules, and cultural events happening in and around Choutuppal Mandal.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        {newsList.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <h3 className="text-base font-bold text-slate-700">No news articles published yet.</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsList.map((item) => (
              <article
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden shadow-xs border border-slate-200 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <Link
                    href={`/news/${item.slug || item.id}`}
                    className="block relative h-48 w-full bg-slate-100 group overflow-hidden"
                  >
                    <Image
                      src={sanitizeImageUrl(item.coverImage)}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-xs">
                      {item.category}
                    </div>
                  </Link>

                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {item.views.toLocaleString()} reads
                      </span>
                    </div>

                    <Link href={`/news/${item.slug || item.id}`}>
                      <h2 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2 hover:text-blue-600 transition">
                        {item.title}
                      </h2>
                    </Link>
                    {item.teluguTitle ? (
                      <h3 className="font-telugu text-xs text-slate-600 font-semibold mt-1 line-clamp-1">
                        {item.teluguTitle}
                      </h3>
                    ) : null}
                    <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                      {item.summary}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0 flex items-center justify-between border-t border-slate-100 mt-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Check out this news: "${item.title}" on https://choutuppal.in/news/${item.slug || item.id}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1 font-semibold"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share on WhatsApp
                  </a>

                  <Link
                    href={`/news/${item.slug || item.id}`}
                    className="text-xs font-black text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                  >
                    Read Story →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
